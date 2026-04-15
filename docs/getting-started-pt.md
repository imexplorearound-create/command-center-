# Guia de Início Rápido — Command Center

**Audiência:** primeira vez a usar a aplicação (~25 minutos do zero até teres o primeiro projecto a correr).

> ℹ️ Se és **admin** que vai configurar pela primeira vez, começa pelo passo 1. Se és **membro** já com conta, salta para o passo 2.

---

## Passo 1 — Primeiro login e onboarding (5 min)

1. Abre a URL do Command Center (ex: `http://localhost:3100` em dev ou o domínio da tua organização).
2. Faz login com as credenciais de admin (recebidas por email ou criadas via seed).
3. No primeiro login, apanhas o **wizard de onboarding** em 6 passos:

   | Passo | O que configuras |
   |------:|------------------|
   | 1 | Nome da empresa + logotipo (opcional) |
   | 2 | Equipa — convidar membros por email |
   | 3 | Áreas operacionais (ex: Desenvolvimento, Design, Operações) |
   | 4 | Pessoas — importar CSV ou criar uma a uma |
   | 5 | Módulos — Essenciais (sempre on), Recomendados (on), Opcionais (off), Experimentais (off) |
   | 6 | Integrações — ver que env vars precisas de configurar (informativo) |

4. **Ao terminar**, é criado automaticamente um projecto de exemplo `Exemplo: Website Launch` com 3 fases e 5 tarefas. Serve como ponto de partida — podes arquivá-lo quando não precisares.

💡 **Dica:** Podes deixar módulos Opcionais/Experimentais off e activá-los mais tarde em `/settings`.

---

## Passo 2 — Criar primeiro projecto real + 3 tarefas (10 min)

1. No dashboard, carrega em **+ Novo Projecto** (canto superior direito).
2. Preenche:
   - **Nome:** ex. `Site Institucional 2026`
   - **Tipo:** `cliente` ou `interno`
   - **Cor:** escolhe uma cor distinta (ajuda a identificar no kanban)
   - **Descrição:** opcional
3. **Guardar** → o projecto aparece no dashboard. Clica no card para entrar.

### Criar tarefas

Na página do projecto, vais ver o **Kanban** com 3 colunas: `Backlog` / `Doing` / `Done`.

1. Clica em **+ Tarefa** (topo da coluna Backlog).
2. Preenche: título, prioridade (baixa/média/alta), assignee (opcional), deadline (opcional).
3. Repete 3 vezes com tarefas diferentes (ex: "Research concorrência", "Wireframes homepage", "Setup CMS").

---

## Passo 3 — Usar o Kanban (5 min)

- **Arrastar e largar** (drag-drop) entre colunas para mudar estado.
- **Clicar numa tarefa** abre modal com detalhes, descrição, comentários, histórico.
- **Prioridade** mostra-se com ícone colorido (🔴 alta, 🟡 média, ⚪ baixa).
- **Filtros** no topo: por pessoa, prioridade, origem (AI/manual/GitHub).

### Atalhos via Maestro (se módulo activo)

Se tens o módulo **Maestro** (experimental) activo, podes usar linguagem natural:

- `cria tarefa em site-institucional-2026: refactor login`
- `marca "wireframes" como concluída`
- `atribui "setup CMS" ao Bruno`
- `muda a prioridade de "research" para alta`

---

## Passo 4 — Registar horas (5 min)

> Requer módulo **Timetracking** activo (off por defeito — activa em `/settings`).

1. No kanban, carrega em **⏱** ao lado de uma tarefa.
2. Preenche: horas (ex. `1.5`), data, descrição opcional.
3. Ou usa o Maestro: `regista 2h no projecto site-institucional-2026 ontem para revisão`.

O resumo semanal aparece no dashboard (card "Horas da semana") se o módulo estiver activo.

---

## Passo 5 — Integração básica (10 min) — **opcional**

### Opção A: GitHub (sync de commits, issues, PRs)

1. Gera um **Personal Access Token** em github.com/settings/tokens/new — scopes: `repo`, `read:org`.
2. Em `.env.local` do servidor:
   ```env
   GITHUB_TOKEN=ghp_...
   GITHUB_WEBHOOK_SECRET=<openssl rand -hex 32>
   ```
3. Reinicia o servidor (`pnpm dev` ou restart em produção).
4. Na página do projecto → tab **💻 Dev** → configurar repositório.
5. Adiciona webhook no GitHub do repo: `URL: <server>/api/webhooks/github` + `Content type: application/json` + `Secret: <valor do GITHUB_WEBHOOK_SECRET>` + `Events: Pushes, Issues, Pull requests`.

### Opção B: Gmail (sync de emails)

1. Criar projecto em [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent.
2. Criar OAuth Client ID (Desktop/Web).
3. Em `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=<server>/api/auth/gmail/callback
   ```
4. No Command Center: `/settings/notifications` → "Ligar Gmail" → consent flow → volta ligado.

---

## Troubleshooting

### "Login não funciona"
- Verifica que a password tem ≥6 chars.
- Se és admin, corre `pnpm prisma db seed` para recriar o tenant default.
- Vê logs: `journalctl --user -u command-center` ou consola do `pnpm dev`.

### "Módulo X não aparece no sidebar"
- `/settings` → **Módulos** → activar/desactivar. Tier 1 são sempre ligados.

### "Tarefas AI-extraídas não aparecem"
- Ver trust score em `/maestro`. Se score baixo, tarefas ficam em `por_confirmar` até validares.
- `/dashboard` → **Validação** → confirmar/editar/rejeitar.

### "Feedback por voz não regista"
- Verifica `GROQ_API_KEY` no `.env.local`.
- Abre o popup da extensão → aceita o aviso de privacidade (GDPR).
- Adiciona o workspace (URL + slug do projecto).
- Reinstala a extensão se acabaste de fazer upgrade (v1.3.0+).

### "APP_SECRET error no arranque"
- Gera uma chave nova: `openssl rand -hex 32`.
- Em `.env.local`: `APP_SECRET=<chave>` (mínimo 32 chars).
- Reinicia o servidor.

---

## Próximos passos

- **OKRs:** `/objectives` — define 3-5 objectivos trimestrais com Key Results mensuráveis.
- **CRM:** `/crm` — pipeline comercial por fases. Requer módulo CRM (tier 2, on por defeito).
- **Integrações:** `/settings` para configurar Discord, Telegram, WhatsApp, LLM provider.
- **Feedback de clientes:** `/project/<slug>/tester-setup` gera instruções para partilhar a extensão com testers.

📚 Para docs aprofundados: `docs/guia-operacional-completo.md`.
