# Feedback Loop — Ciclo fechado tester → dev → verificação

Sistema end-to-end de feedback implementado nas Fases 0-6 (Abr 2026).

## Visão geral

```
Tester (extension) ──grava voz──► voice-note route
                                  │
                                  ├─ resolve TestCase (dropdown > regex T-XXX)
                                  └─ Maestro classifica + Gemini draft
                                       │
                                       ▼
                                  FeedbackItem (approvalStatus: needs_review)
                                       │
                          Miguel/cliente revê em /feedback/[id]
                                       │
                                       ▼
                                  Aprovar (com TestCase atribuído)
                                       │
                                       ├─ cria/liga Task via partial unique index
                                       └─ fire-and-forget: Maestro draft + notify Bruno
                                       │
                                       ▼
                                  Task (approvalStatus: approved)
                                       │
                          Bruno (API) ──GET /api/dev/tasks──► queue
                                       │
                                       ├─ PATCH .../status in_dev ──► in_dev
                                       └─ desenvolve
                                       │
                                       ▼
                          Bruno PATCH .../status ready_for_verification
                                       │
                                       ├─ notify Miguel/cliente
                                       └─ verifier vai a /verifications
                                       │
                                       ▼
                                  Verificar
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
                   "Está resolvido"         "Ainda não está"
                          │                         │
                          ▼                         ▼
                   verified (fim)           in_dev + reason
                                            (+1 verifyRejectionsCount)
```

## Estados do FeedbackItem (`approvalStatus`)

| Estado | Significado | Próximos |
|---|---|---|
| `needs_review` | AI draft pronto, aguarda humano | approved, archived |
| `approved` | Aprovado, Task criada/ligada | in_dev, archived |
| `in_dev` | Bruno a desenvolver | ready_for_verification, needs_review¹ |
| `ready_for_verification` | Bruno marcou pronto | verified, in_dev² |
| `verified` | Ciclo fechado | archived |
| `archived` | Dismiss manual | (terminal) |

¹ Rejeição do dev: volta a `needs_review`, `rejectionOrigin="dev"`, NÃO incrementa contador.
² Rejeição do verificador: volta a `in_dev`, `rejectionOrigin="verifier"`, incrementa `verifyRejectionsCount`.

## Onboarding do developer (Bruno)

### 1. Admin gera API Key

1. Admin entra em `Settings → API Keys · Dev` (`/settings/api-keys`)
2. Clica **Nova API Key**, preenche label (ex.: "Bruno laptop"), escolhe scopes:
   - `testsheets:read` / `testsheets:write` — para criar folhas de testes
   - `tasks:read` / `tasks:write` — para consumir queue e transitar status
   - `feedback:read` — para ler transcripts de feedback linked
3. Token aparece **uma vez** num modal — copia já, não volta a ser visível

Formato: `cc_dev_<48 hex chars>`

### 2. Variáveis de ambiente no servidor

| Env var | Obrigatório | Descrição |
|---|---|---|
| `DEV_API_KEY_PEPPER` | **Sim** | Pepper usado para hash SHA-256 dos tokens. Deploy-time invariant |
| `BRUNO_NOTIFY_TO` | Opcional | Email(s) para notificar quando feedback é aprovado (CSV) |
| `VERIFIER_NOTIFY_TO` | Opcional | Email(s) para notificar quando Bruno marca ready_for_verification |
| `FEEDBACK_NOTIFY_TO` | Opcional | Fallback se as duas acima não estiverem set |
| `DISCORD_NOTIFY_WEBHOOK_URL` | Opcional | Broadcast a Discord |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_NOTIFY_CHAT_IDS` | Opcional | Broadcast a Telegram |
| `HANDOFF_ASSET_SECRET` | Opcional | Assinar URLs de audio/screenshots no task detail |

### 3. Fluxo via curl

> Define `$CC_URL` com o host do servidor (ex. `https://cc.example.com` em
> produção, `http://localhost:3100` em dev) e `$TOKEN` com o token devolvido
> ao criar a API key. Exemplos abaixo usam ambos.

**Smoke test de auth:**
```bash
curl -H "Authorization: Bearer $TOKEN" "$CC_URL/api/dev/ping"
# { ok: true, keyId, tenantId, scopes: [...] }
```

**Criar folha de testes:**
```bash
curl -X POST $CC_URL/api/dev/testsheets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectSlug": "imexplorearound",
    "title": "Sprint 4 — Login refactor",
    "description": "Testes para a nova auth flow",
    "cases": [
      { "code": "T-001", "title": "Login com email válido", "expectedResult": "Redirect para /" },
      { "code": "T-002", "title": "Logout limpa sessão" },
      { "code": "T-003", "title": "Password reset via email" }
    ]
  }'
```

**Adicionar cases a sheet existente:**
```bash
curl -X POST $CC_URL/api/dev/testsheets/<sheetId>/cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "cases": [{ "code": "T-004", "title": "Bloqueia após 5 tentativas" }] }'
```

**Listar queue:**
```bash
# Default: approved + in_dev
curl -H "Authorization: Bearer $TOKEN" "$CC_URL/api/dev/tasks"

# Filtrar:
curl -H "Authorization: Bearer $TOKEN" "$CC_URL/api/dev/tasks?status=approved&projectSlug=imexplorearound"
```

**Ver contexto completo de uma task:**
```bash
curl -H "Authorization: Bearer $TOKEN" $CC_URL/api/dev/tasks/<taskId>
# Devolve: testCase + feedbacks[] com transcripts, URLs assinadas para
# áudio/screenshots, repro/expected/actual/acceptance, mentionedTestCaseCodes
```

**Transitar status (reclamar task):**
```bash
curl -X PATCH $CC_URL/api/dev/tasks/<taskId>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "in_dev" }'
```

**Marcar como pronto a verificar:**
```bash
curl -X PATCH $CC_URL/api/dev/tasks/<taskId>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "ready_for_verification" }'
# Dispara notifier VERIFIER_NOTIFY_TO por email + Discord/Telegram
```

**Rejeitar uma task (spec incompleta, não reproduz, etc.):**
```bash
curl -X PATCH $CC_URL/api/dev/tasks/<taskId>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "needs_review", "rejectionReason": "Não reproduzo no Safari 17; podes anexar versão?" }'
```

## Códigos de resposta

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Created (POST testsheets, POST cases) |
| 400 | Body inválido / status inválido / reason em falta |
| 401 | Token ausente, inválido, revogado, expirado |
| 403 | Scope insuficiente |
| 404 | Task/sheet não existe, ou arquivada |
| 409 | Transição inválida, mixed states, race concorrente, duplicate code |

## Tester side — extension

1. Tester abre site configurado no popup, clica 🎤
2. Aparece picker inline com os test cases activos do projecto
3. Escolhe um (ou "Sem caso") — navegação: setas ↑/↓, Enter selecciona, Esc cancela
4. Grava voz; upload inclui `testCaseCode`; backend resolve `testCaseId`
5. Se saltar picker mas mencionar "T-042" na transcrição, regex apanha (1 match → resolve; N matches → `mentionedTestCaseCodes` para triagem ver)

## Permissões

- **admin/manager/membro**: tudo, tenant-wide
- **cliente**: só vê feedback/verificações dos projectos onde está atribuído via `UserProjectAccess`

## Troubleshooting

### "Atribui um TestCase antes de aprovar"
FeedbackItem tem `testCaseId=null`. Acontece quando: tester saltou picker + transcrição sem match OU com múltiplos matches ambíguos. Atribui via edit UI (ou F7+ feature) ou rejeita.

### "Task conflict but no open task found — retry approve"
Race rara: partial unique index bloqueou insert, mas a task que "ganhou" já foi arquivada. Tenta aprovar de novo.

### "Feedback items are in mixed states"
Invariante violada: feedbacks ligados à mesma Task deviam partilhar `approvalStatus`. Se vires isto, inspecciona manualmente via DB.

### Emails não chegam
- Verificar `SMTP_*` envs + `FEEDBACK_NOTIFY_TO` (ou `BRUNO_NOTIFY_TO` / `VERIFIER_NOTIFY_TO`)
- Discord/Telegram disparam em paralelo se `DISCORD_NOTIFY_WEBHOOK_URL` / `TELEGRAM_*` configurados

### "feedback_items_task_id_key" index errado após migration
Se a DB vem de um deploy antigo com `@unique` em `taskId`, aplicar migration `20260424110000_feedback_task_allow_many`.

## Arquitetura

Ficheiros-chave:
- `prisma/schema.prisma` — TestSheet, TestCase, DevApiKey, FeedbackItem extensions, partial unique index em tasks
- `lib/dev-api-key.ts` — auth (SHA-256 + pepper)
- `lib/auth/roles.ts` — `canApproveFeedback` / `canVerifyFeedback`
- `lib/validation/feedback-approval.ts` — state machine + Zod
- `lib/actions/find-or-create-open-task.ts` — raw SQL INSERT ON CONFLICT
- `lib/actions/task-dev-transitions.ts` — transições partilhadas (Dev API + UI verificação)
- `lib/feedback/task-drafter.ts` — Maestro draft de title/description
- `lib/notifications/feedback-approved-notifier.ts`, `feedback-ready-for-verification-notifier.ts`
- `app/api/dev/**` — rotas Bruno
- `app/api/feedback/test-cases/route.ts` — dropdown data
- `app/(app)/feedback/[id]/approval-buttons.tsx` — UI aprovação
- `app/(app)/verifications/**` — UI verificação
