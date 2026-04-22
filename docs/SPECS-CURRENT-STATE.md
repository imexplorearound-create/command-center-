# Command Center — Especificação Completa (Estado Actual)

> Snapshot vivo do produto. Actualiza sempre que houver mudanças estruturais.
> **Data:** 2026-04-21
> **Localização:** `/home/miguel/Projects/command-center/`
> **Porto dev:** 3100
> **DB:** PostgreSQL 16 em `localhost:5432/command_center` (user `cc`)

---

## 1. Visão Geral

O **Command Center** é um cockpit operacional multi-tenant para PMEs (até ~50 pessoas), com AI nativa. Consolida num único UI:

- Projectos + fases + kanban de tarefas
- OKRs com 3 vistas (lista, roadmap, mapa relacional)
- CRM (opportunities + campanhas email)
- Client hub (timeline de interacções por cliente)
- Workflows (templates reutilizáveis + instâncias)
- Content pipeline (vídeo/scripts)
- Feedback de testers (extensão Chrome com voz + screenshots + AI triage)
- Dev metrics (integração GitHub)
- Timetracking
- Assistente **Maestro** (chat AI + gating por trust score)
- Handoff protocol (delegação de tarefas a produtores externos)

Arquitectura SaaS: cada tenant tem módulos activos/inactivos via `ModuleCatalog` + `TenantModuleConfig`, LLM configurável (MiniMax por defeito).

---

## 2. Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js App Router + Server Components | 16.2.2 |
| UI | React + Tailwind CSS | 19 / 4 |
| Drag & drop | @dnd-kit/core + sortable | 6 / 10 |
| Toasts | Sonner | 2 |
| Modais | HTML `<dialog>` nativo | — |
| DB | PostgreSQL + Prisma (PG adapter) | 16 / 7.6 |
| Migrations | Versionadas em `prisma/migrations/` | — |
| Auth | JWT (jose) + bcryptjs + httpOnly cookies (7d) | — |
| AI chat | `@anthropic-ai/sdk` → MiniMax M2.7 | 0.86 |
| AI vision | Google Gemini API (análise de screenshots) | — |
| Testes | Vitest + Testing Library | 4 |
| i18n | PT-PT (default) + EN | — |
| Icons | Lucide React | — |

---

## 3. Arquitectura

### 3.1 Multi-Tenancy

Cada tabela de negócio tem `tenantId`. Duas variantes de Prisma client:

- **`basePrisma`** — sem filtro. Usar apenas em login, tenant resolution e scripts de migração.
- **`tenantPrisma(tenantId)`** — injecta `tenantId` em todas as queries (where/create/upsert). Helper `getTenantDb()` resolve o tenant da sessão.
- **Agent API:** header `X-Tenant-Id`, fallback para tenant `imexplorearound`.

Resolução de tenant: `middleware.ts` lê subdomínio → header `x-tenant-slug`. Login pede slug + email.

### 3.2 Módulos plugáveis

- `ModuleCatalog` (global) — registo de todas as features (tier 1 core / 2 default / 3 optional / 4 experimental)
- `TenantModuleConfig` — enable/disable por tenant + config JSON
- Sidebar e endpoints filtram consoante módulos activos

### 3.3 Roles

| Role | Acesso |
|------|--------|
| `admin` | Total (Miguel, Bruno) |
| `manager` | Departamentos + projectos atribuídos |
| `membro` | Projectos via `UserProjectAccess` |
| `cliente` | Apenas Client Hub do seu projecto |

Guards em `lib/auth/dal.ts`: `requireAdmin()`, `requireWriter()` (admin+membro+manager), `requireReader()`, `requireAdminPage()` (server page redirect).

### 3.4 Auth Flows

- **Humanos:** POST `/api/auth/login` → JWT httpOnly cookie 7d
- **Testers (extensão):** POST `/api/feedback/auth/login` → JWT 30d (tokens mais longos por UX)
- **Agents OpenClaw:** Bearer `AGENT_API_SECRET` em `Authorization`
- **Producer handoff:** Bearer específico via `lib/handoff-auth.ts`

---

## 4. Modelos de Dados

**50+ modelos Prisma.** Agrupados por domínio:

### Auth & Tenancy
`Tenant` · `User` · `UserProjectAccess` · `UserModuleAccess` · `TenantLLMConfig`

### Módulos
`ModuleCatalog` · `TenantModuleConfig`

### Projectos & Tarefas
- `Project` (slug, status, health, progress, color, `archivedAt`)
- `ProjectPhase` (order, status, progress, datas)
- `Task` (status backlog/em_curso/em_revisão/feito, priority, deadline, assignee, `kanbanOrder`, phase, area; AI: `aiExtracted`, `aiConfidence`, `validationStatus`, `originalData`; GitHub: `branch`, `prNumber`, `prStatus`; **Handoff: `handoffStatus`, `handoffAgentId`, `handoffSentAt`, `handoffClaimedAt`, `handoffResolvedAt`, `handoffResolution` JSON**)

### Pessoas & Áreas
`Person` (type equipa/cliente, `costPerHour`, `weeklyHours`, `githubUsername`, `archivedAt`) · `Area` (slug, icon, color, `archivedAt`)

### Objectivos
`Objective` · `KeyResult` · `OkrSnapshot` (snapshots diários)

### Clientes
`Client` (1-1 com Project) · `ClientContact` · `Interaction` (feed AI-extractable)

### Alertas
`Alert` (severity, relatedTask/Project/Client, isDismissed)

### Content pipeline
`ContentItem` (format, status proposta/em_produção/publicado)

### Maestro & Trust
- `TrustScore` — score 0-100 por `(agentId, extractionType)`; counts confirmações/edições/rejeições
- `MaestroAction` — log de mudanças de score (action confirmar/editar/rejeitar, delta, before, after, performedById)
- `MaestroConversation` — chat session (ownerId, title, `archivedAt`)
- `MaestroMessage` — (role user/assistant/tool, content, `toolCalls`, `toolResults`)

### Workflows
`WorkflowTemplate` · `WorkflowTemplateStep` (dependsOn, checklist) · `WorkflowInstance` · `WorkflowInstanceTask`

### GitHub
`GithubRepo` · `GithubEvent` (eventType, taskLinkMethod, `taskLinkConfidence`) · `DevMetricsDaily`

### Feedback (extensão)
- `FeedbackSession` — projectId, testerName, status processing/done, `startUrl`, `pagesVisited`, `eventsJson`, `aiSummary`, `aiClassification`, `itemsCount`, `archivedAt`
- `FeedbackItem` — type, classification, `module`, priority, `timestampMs`, `cursorPosition`, `pageUrl`, `voiceAudioUrl`, `voiceTranscript`, `aiSummary`, `contextSnapshot`, `taskId` (unique), status pending/triaged/done; **campos de triagem AI: `reproSteps[]`, `expectedResult`, `actualResult`, `acceptanceCriteria` JSON, `screenshotUrl`, `aiDraftedAt`, `triagedAt`, `triagedById`, `archivedAt`**

### CRM
`Opportunity` (stageId, `kanbanOrder`, value, probability, `convertedProjectId`, `validationStatus`) · `OpportunityActivity`

### Timetracking
`TimeEntry` (date, duration, `isBillable`, status draft/approved, `approvedById`, origin manual/api, `archivedAt`)

### Email
`EmailRecord` (gmailId, threadId, direction, `isProcessed`, links a project/client/person/opportunity) · `EmailCampaign` (status draft/scheduled/sent, `audienceFilter`) · `EmailTemplate` · `CampaignRecipient`

### Investimento
`InvestmentMap` (1-1 com Project, totalBudget, `fundingSource`) · `InvestmentRubric` (line items)

### Sync
`SyncLog` (source, action, status, `itemsProcessed`, `durationMs`)

---

## 5. Migrations (timeline)

| Data | Migration | Objectivo |
|------|-----------|-----------|
| baseline | `0_init` | Schema inicial (~50 modelos) |
| 2026-04-15 | `feedback_session_archive` | `archivedAt` em FeedbackSession |
| 2026-04-17 | `add_triage_fields_and_screenshot` | Triage fields + `screenshotUrl` em FeedbackItem |
| 2026-04-19 | `task_handoff` | Handoff protocol em Task (6 campos) |
| 2026-04-19 | `feedback_item_archive` | `archivedAt` em FeedbackItem |

Workflow: `pnpm prisma migrate dev --name <nome>` (dev), `pnpm prisma migrate deploy` (prod/CI).

---

## 6. Rotas

### 6.1 App (`app/(app)/` — sessão obrigatória)

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard (stats, tasks recentes, alertas, validation panel) |
| `/project/[slug]` | Detalhe projecto: tabs Kanban, Timeline, Dev, Client Hub, Feedback |
| `/project/[slug]/client` | Client hub (timeline de interacções) |
| `/project/[slug]/tester-setup` | Onboarding de testers da extensão |
| `/maestro` | Trust scores + últimas 20 MaestroActions (admin-only) |
| `/objectives` | OKRs — 3 vistas: lista, roadmap, mapa |
| `/workflows` | Templates + instâncias activas |
| `/content` | Pipeline de conteúdo |
| `/areas`, `/people` | CRUD (admin escreve, membro read, cliente redirect) |
| `/crm` | Pipeline kanban de oportunidades |
| `/crm/[id]` | Detalhe da opportunity + activities |
| `/crm/campaigns`, `/crm/campaigns/new`, `/crm/campaigns/[id]` | Email campaigns |
| `/feedback` | Sessões de teste |
| `/feedback/[id]` | Detalhe + items + triagem |
| `/feedback/[id]/export.md` | Export markdown |
| `/cross-projects` | Vistas multi-projecto |
| `/timetracking` | Log de horas |
| `/email-sync` | Estado ingestão Gmail |
| `/onboarding` | Setup wizard do tenant |
| `/settings`, `/settings/notifications`, `/settings/llm` | Preferências |

### 6.2 Auth (`app/(auth)/`)
`/login` · `/forgot-password` · `/reset-password/[token]` · `/invite/[token]`

### 6.3 API pública (`app/api/`)

**Agent API** (Bearer `AGENT_API_SECRET`):
- `/agent/projects`, `/agent/tasks`, `/agent/tasks/[id]`, `/agent/objectives`, `/agent/key-results/[id]`, `/agent/interactions`, `/agent/alerts`, `/agent/content`, `/agent/feedback/sessions`, `/agent/feedback/items`
- **Handoff:** `/agent/handoffs` (GET/POST), `/agent/handoffs/[taskId]/bundle`, `/claim`, `/reject`, `/resolve`

**Maestro:** `/maestro/chat` (SSE), `/maestro/conversations`, `/maestro/conversations/[id]`

**Feedback:** `/feedback/auth/login`, `/feedback/sessions`, `/feedback/items`, `/feedback/items/[id]/to-task`, `/feedback/voice-note`

**Sync polling:** `/sync/github`, `/sync/gmail`, `/sync/calendar`

**Webhooks:** `/webhooks/github`, `/webhooks/discord`, `/webhooks/telegram`, `/webhooks/whatsapp`

**Integration:** `/integration/ingest/{clients,contacts,financials}`, `/integration/export/{projects,timeentries}`

**Outros:** `/handoff-asset`, `/campaigns/[id]/open` (pixel), `/export`

---

## 7. Maestro AI

### 7.1 Trust Score System

3 níveis de validação para dados AI-extracted:

1. **`por_confirmar`** — humano precisa validar (badge amarelo)
2. **`auto_confirmado`** — confiança >80%, entra no kanban com badge 🤖
3. **`confirmed`** — humano validou (trust score +2)

**5 thresholds por `extractionType`** (tarefa, decisão, resumo, prioridade, responsável, conteúdo, feedback_teste):

| Score | Nível | Comportamento |
|-------|-------|---------------|
| 0-30 | Aprendizagem | Tudo pending |
| 31-50 | Supervisionado | Confidence >90% passa |
| 51-70 | Assistente | Confidence >80% passa |
| 71-90 | Confiável | Confidence >60% passa |
| 91-100 | Autónomo | Quase tudo auto-executa |

Acções sensíveis (financeiro, delete, comunicação externa, alter role) **capped a 50** — sempre pending.

**Deltas por acção:** `confirmar` +2 · `editar` 0 · `rejeitar` -5 · auto-confirmado seguido de correcção -3.

### 7.2 Chat

- **Modelo:** MiniMax M2.7 via endpoint Anthropic-compatible. API key em `MINIMAX_API_KEY`.
- **Streaming:** SSE events (`delta`, `tool_call`, `tool_result`, `done`, `error`).
- **Loop tool use:** máx. 5 tool calls por turno; timeout 60s.
- **UI:** painel lateral slide-in 420px, botão flutuante bottom-right, dropdown de conversas, render markdown simples.
- **Permissão:** admin + membro (cliente não vê o botão; curl directo → 403).
- **Histórico:** DB (MaestroConversation + MaestroMessage). 20 últimas msgs enviadas ao modelo por turno.

### 7.3 Tools (20 handlers em `lib/maestro/tools/`)

Tarefas (7): `criar_tarefa`, `listar_tarefas`, `actualizar_tarefa`, `mudar_estado_tarefa`, `atribuir_responsavel`, `arquivar_tarefa`, `restaurar_tarefa`
Projectos (3): `listar_projectos`, `obter_projecto`, `actualizar_projecto`
Pessoas (2): `listar_pessoas`, `obter_pessoa`
OKRs (2): `listar_objectivos`, `actualizar_kr`
Outros (6): interacções, alertas, time entries, feedback, content, gemini-vision

Cada tool: `{name, description, inputSchema (Zod), execute(input, ctx)}`. Tools que escrevem (`criar_tarefa`, etc.) passam por `gateAgentWrite({agentId: "maestro-chat", extractionType})` — score decide pending vs executed.

### 7.4 Auto-training

`lib/maestro/auto-training.ts` — regras automáticas: se utilizador ignora auto-confirmed sem corrigir por 3 dias → +0.5. Se corrige logo → -3.

---

## 8. Feedback System (extensão Chrome)

### 8.1 Extensão

- **Versão:** 1.6.0
- **Pasta:** `extension/`
- **Manifest V3** — permissions: `storage`, `scripting`, `activeTab`; optional_host_permissions para domínios dinâmicos
- **Fluxo:**
  1. Tester faz login no popup → JWT 30d
  2. Adiciona workspace (URL + projectSlug) → `chrome.permissions.request`
  3. Background regista content scripts via `chrome.scripting.registerContentScripts`
  4. Só corre nos workspaces autorizados

### 8.2 Gravação

- **Botão 🎤** — começa/pára gravação (webm + MediaRecorder)
- **Botão 📷** — screenshot manual (limite 10 por sessão)
- **Atalho `Alt+S`** — screenshot **sem fechar modais** (crítico para capturar popups/dropdowns)
- **Eventos capturados** (não captura): password, hidden, autocomplete `cc-*`, ficheiros
- **Screenshot engine:** `chrome.tabs.captureVisibleTab` (pixels reais, inclui iframes/backdrop blur); fallback html2canvas se API falhar
- **Persistência offline:** IndexedDB queue; drena ao próximo clique 🎤

### 8.3 Backend (triagem AI)

Pipeline em `lib/feedback-utils.ts` + `lib/feedback-classify.ts` + `lib/gemini-vision.ts`:

1. Recebe voz → Groq (transcrição) → `voiceTranscript`
2. Recebe screenshot → Gemini Vision → descrição visual
3. Classifier AI → `{classification: bug|feature|ux|pergunta, priority, module, aiSummary}`
4. Triage drafter → gera `reproSteps[]`, `expectedResult`, `actualResult`, `acceptanceCriteria`
5. Humano valida em `/feedback/[id]` → botão **Converter em Task** → cria Task com handoff opcional

### 8.4 Privacidade

- Tokens 30d, sessões encriptadas
- Dados guardados 90d encriptados
- Só visíveis à equipa
- GDPR consent banner no popup da extensão

---

## 9. Handoff Protocol (novo)

**Motivação:** Bruno (produtor externo) precisa receber tasks específicas com contexto completo e reportar resolução sem ter acesso à app.

Docs: `docs/bruno-handoff-protocol.md`, `docs/bruno-starter-kit.md`.

### 9.1 Estados (`Task.handoffStatus`)

`none` → `sent` → `claimed` → `resolved` | `rejected`

### 9.2 Fluxo

1. **Miguel/Maestro:** marca task com handoff → POST `/api/agent/handoffs` → `handoffStatus=sent`, `handoffSentAt=now`
2. **Bruno agent:** GET `/api/agent/handoffs` (Bearer) → lista pending
3. **Claim:** PATCH `/api/agent/handoffs/[taskId]/claim` → `handoffStatus=claimed`, `handoffAgentId`, `handoffClaimedAt`
4. **Bundle:** GET `/api/agent/handoffs/[taskId]/bundle` → JSON com task + assets (screenshots, transcrições, context)
5. **Asset download:** GET `/api/handoff-asset?url=...` (signed) → download dos media referenciados
6. **Resolve:** PATCH `/api/agent/handoffs/[taskId]/resolve` com JSON `{resolution: {...}}` → `handoffStatus=resolved`
7. **Reject:** PATCH `/api/agent/handoffs/[taskId]/reject` — volta para `sent`, fica disponível

### 9.3 Auth

Bearer token dedicado (`HANDOFF_API_SECRET` ou similar) — validado em `lib/handoff-auth.ts`. Separado do `AGENT_API_SECRET` do OpenClaw.

---

## 10. Integrações

| Integração | Cliente | Finalidade |
|------------|---------|-----------|
| GitHub | `lib/integrations/github.ts` | PRs, commits, issues, task linking |
| Gmail | `lib/integrations/` + `/api/sync/gmail` | Ingestão emails → EmailRecord |
| Google Calendar | `/api/sync/calendar` | Events → Interaction |
| Google Drive | via OpenClaw | Call recordings (Producer agent) |
| Discord | `lib/integrations/discord.ts` + webhook | Bot commands + feed |
| Telegram | `lib/integrations/telegram-bot.ts` | Bot + webhook notifications |
| WhatsApp | `lib/integrations/whatsapp-bot.ts` | Bot + webhook |
| Groq | `lib/integrations/groq.ts` | Transcrição Whisper |
| Gemini | `lib/gemini-vision.ts` | Análise visual de screenshots |
| MiniMax | `lib/maestro/client.ts` | LLM (chat Maestro) |

---

## 11. Sprints

| Sprint | Estado | Entregável |
|--------|--------|------------|
| 1 | fechado | Project + Phase CRUD, soft delete `archivedAt` |
| 1.5 | fechado | Testes manuais verdes |
| 2 | fechado | Task kanban @dnd-kit, filtros, badges validação |
| 3 | fechado | People + Areas CRUD, sidebar role-gated |
| 4 | fechado | Trust score por categoria + Agent API gating |
| 5 | fechado | Maestro Chat (MiniMax + 20 tools + SSE) |
| **Actual** | em curso | Handoff protocol, feedback triage AI, screenshot native API, Gemini Vision |

**Próximas candidatas:**
- Sprint 6a: Decay automático do trust score por inactividade
- Sprint 6b: Multi-agente UI (filtros no /maestro)
- Sprint 6c: Editar/eliminar tarefas via chat (mais tools)
- Sprint 6d: Briefing automático diário (cron + Maestro gera resumo)
- Sprint 6e: Pesquisa semântica de conversas antigas

---

## 12. Estrutura de Ficheiros

```
app/
├── (app)/              ← rotas protegidas (ver §6.1)
│   ├── page.tsx        ← dashboard
│   ├── project/[slug]/ ← kanban, timeline, dev, client hub, feedback
│   ├── maestro/        ← trust score + recent actions
│   ├── feedback/       ← sessões + triagem
│   ├── crm/            ← pipeline + campaigns
│   ├── objectives/     ← 3 vistas
│   ├── workflows/, content/, areas/, people/, cross-projects/
│   └── timetracking/, email-sync/, settings/, onboarding/
├── (auth)/             ← login, forgot, reset, invite
└── api/                ← ver §6.3

components/
├── dashboard/, kanban/, maestro/, projects/, phases/, areas/, people/
├── feedback/, crm/, campaigns/, content/, objectives/, workflows/
├── layout/ (sidebar + topbar)
└── shared/ (Modal, ConfirmDialog, FormField)

lib/
├── db.ts                ← basePrisma + tenantPrisma + getTenantDb
├── auth/                ← dal.ts (guards), actions, session
├── actions/             ← Server Actions (CRUD + mutations) + __tests__/
├── validation/          ← Zod schemas por módulo + __tests__/
├── maestro/             ← client, trust-rules, score-engine, agent-gating,
│                          conversation, system-prompt, gateway, auto-training,
│                          tools/ (20 handlers)
├── integrations/        ← github, gmail, discord, telegram, whatsapp, groq, bot-queries
├── notifications/       ← templates/ + types.ts
├── i18n/                ← locales/{pt-PT,en}.json
├── export/              ← Excel/PDF helpers
├── handoff-auth.ts      ← Bearer validation para producer
├── handoff-route-helpers.ts, handoff-status.ts
├── feedback-auth.ts     ← tester JWT 30d
├── feedback-classify.ts, feedback-utils.ts
├── gemini-vision.ts     ← screenshot analysis
├── agent-auth.ts, agent-helpers.ts
├── queries.ts, queries/, types.ts, utils.ts
├── cors.ts, env.ts, tenant.ts, rate-limit.ts
└── mock-data.ts (seed)

prisma/
├── schema.prisma        ← 50+ modelos
├── migrations/          ← versionadas
└── seed.ts

extension/               ← Chrome extension v1.6.0
├── manifest.json        ← MV3
├── background.js        ← service worker + captureVisibleTab handler
├── content.js           ← content script (recording + Alt+S)
├── popup.html/.js
├── queue.js             ← IndexedDB offline queue
├── storage.js
├── html2canvas.min.js   ← fallback engine
├── styles.css
└── icons/

public/
├── feedback-screenshots/  ← storage local (move para S3 quando crescer)
└── ...

docs/
├── SPECS-CURRENT-STATE.md      ← este doc
├── command-center-spec-v1.2.md ← histórico
├── command-center-saas-spec-v2.0.md ← spec SaaS detalhado
├── command-center-specs.md
├── bruno-handoff-protocol.md   ← protocolo producer externo
├── bruno-starter-kit.md        ← onboarding Bruno
├── addendum-github-v1.0.md
├── feedback-tester-setup.md
├── manual-command-center.md / -v2.md
├── guia-operacional-completo.md
├── getting-started-pt.md
└── setup-database-bruno.md

tasks/
├── todo.md              ← sprint tracker
└── lessons.md           ← lições aprendidas
```

---

## 13. Comandos

```bash
# Dev
pnpm dev                    # http://localhost:3100 (0.0.0.0 para LAN)
pnpm build                  # production build
pnpm start                  # production server
pnpm lint                   # ESLint

# Testes
pnpm test                   # Vitest run
pnpm test:watch             # watch mode

# Prisma
pnpm prisma migrate dev --name <nome>   # cria + aplica migration (dev)
pnpm prisma migrate deploy              # aplica pending (prod/CI)
pnpm prisma migrate status              # estado
pnpm prisma db seed                     # seed.ts (dados iniciais)
pnpm prisma generate                    # regenerar client

# Tipagem
pnpm exec tsc --noEmit                  # type check sem emitir

# Testers
pnpm tsx scripts/create-tester.ts <email> <name>   # cria tester + JWT

# Utilitários
pnpm tsx prisma/backfill-kanban-order.ts  # backfill one-shot (idempotente)
```

---

## 14. Variáveis de Ambiente (`.env.local`)

**Obrigatórias:**
- `DATABASE_URL` — postgres connection string
- `AUTH_SECRET` — JWT signing secret
- `AGENT_API_SECRET` — Bearer para OpenClaw agents
- `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL` — LLM do Maestro
- `GROQ_API_KEY` — transcrição de voz

**Opcionais conforme módulos:**
- `GEMINI_API_KEY` — screenshot analysis
- `HANDOFF_API_SECRET` — producer Bruno
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` — integração GitHub
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` — Gmail sync
- `DISCORD_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `WHATSAPP_API_KEY`

**Dev-only:**
- `NEXT_PUBLIC_APP_URL` — canonical URL para links em emails

---

## 15. Padrões de Código

### 15.1 Server Actions
- Assinatura: `async function actionName(prev: ActionResult | undefined, formData: FormData): Promise<ActionResult<T>>`
- Auth: `requireAdmin()` ou `requireWriter()` no início
- Validar com Zod antes de ir ao Prisma
- Tratar `P2002` (unique duplicado) com mensagem amigável
- `revalidatePath()` no fim
- Retorno: `{success: true, data}` ou `{error: "msg"}`
- Forms: `useActionState()` hook

### 15.2 Server vs Client Components
- Server por defeito (async/await direct)
- `"use client"` só para interactividade (modais, drag-drop, forms com state)

### 15.3 Queries
- Soft delete: filtrar `archivedAt: null` via helper `NOT_ARCHIVED`, `NOT_ARCHIVED_TASK`, `NOT_ARCHIVED_FEEDBACK_ITEM`
- Sempre via `getTenantDb()` — nunca `basePrisma` em dados de negócio
- Joins explícitos via `include`, não N+1

### 15.4 Validação
- Zod schemas em `lib/validation/<module>-schema.ts`
- Enums: `TaskStatus`, `Priority`, `ValidationStatus` (por_confirmar/auto_confirmado/confirmed/edited/rejected), `HandoffStatus`
- Helper `firstZodError()` para mensagens user-friendly

### 15.5 Testes
- Vitest + mocks de Prisma (sem DB de teste por enquanto)
- Convenção: `__tests__/` dentro da pasta do código testado
- ~100+ testes actuais; continuar a crescer em actions e validation

### 15.6 i18n
- Server: `createTranslator(locale)` → `t("chave")`
- Client: `useT()` hook (requer `<I18nProvider>` no layout)
- Locale resolvido por tenant (`getTenantLocale()`)

---

## 16. Notas operacionais

- **Porto dev:** 3100 (não 3000 por convenção)
- **DB container:** `command-center-postgres` (docker, postgres:16-alpine)
- **Cross-origin dev:** `allowedDevOrigins: ["91.99.211.238"]` em `next.config.ts` (dev server acedido remotamente)
- **Dev server no servidor:** `nohup pnpm dev --port 3100 --hostname 0.0.0.0 > server.log 2>&1 &`
- **Credenciais dev:**
  - admin: `miguel@example.com` / `commandcenter2026`
  - membro: `membro@example.com` / `commandcenter2026`
  - cliente: `sergio.goncalves@fiscomelres.pt` / `commandcenter2026`

---

## 17. Riscos conhecidos / dívida técnica

- **Screenshots em `public/feedback-screenshots/`** — não é escalável (volume crescente). Migrar para S3/R2 antes de abrir a outros tenants.
- **Prisma client em dev** — alterações ao schema exigem `prisma generate` + restart do dev server (cache).
- **MiniMax tool use quirks** — endpoint é Anthropic-compatible mas há quirks ocasionais; smoke test `scripts/test-minimax.ts` deve correr após upgrades do SDK.
- **Loop tool calls** — limite 5/turno previne runaway; se atingir, injecta mensagem no texto final.
- **Auth tokens** — JWTs sem rotation/blacklist; logout invalida só o cookie. Aceitável para escala actual.
- **FeedbackSession events** — `eventsJson` é JSON crescente sem paginação; sessões longas podem ficar >1 MB.
- **i18n strings client-side** — enviadas no bundle inteiro; refactor para dynamic import por rota quando crescer.

---

_Última revisão manual: 2026-04-21._
_Mantém este doc actualizado a cada mudança estrutural (nova tabela, rota pública, integração, sprint fechado)._
