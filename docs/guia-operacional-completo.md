# Command Center — Guia Operacional Completo

**Data:** 14 Abril 2026
**Para:** Miguel, Bruno, equipa operacional

---

## 1. O que é o Command Center

Aplicação web (SaaS) que centraliza a gestão operacional da empresa: projectos, tarefas, equipa, clientes, pipeline comercial, horas, emails, investimentos e feedback — tudo num único sítio. Substitui a dispersão entre Excel, ClickUp, Gmail e Drive.

**URL de acesso:** `http://[subdominio].commandcenter.pt` ou via IP directo (dev: `http://91.99.211.238:3100`)

---

## 2. Primeiro Acesso

### Login
1. Abre o URL do Command Center
2. Introduz email + password
3. O sistema resolve automaticamente a tua organização (tenant)

### Credenciais por defeito (seed)
| User | Email | Password | Role |
|------|-------|----------|------|
| Miguel | miguel@imexplorearound.pt | commandcenter2026 | admin |
| Bruno | bruno@imexplorearound.pt | commandcenter2026 | admin |

### Criar novos utilizadores
**Opção A — Via interface (admin):**
- `/people` → botão "Convidar" → preenche nome, email, role → email de convite enviado

**Opção B — Via script (servidor):**
```bash
cd ~/Projects/command-center
npx tsx scripts/create-tester.ts email@empresa.pt "Nome" --password=password123
```

### Roles
| Role | O que pode fazer |
|------|-----------------|
| **admin** | Tudo. Configurar tenant, módulos, roles, gerir todos os projectos |
| **manager** | Gerir projectos e equipa do seu departamento. Aprovar horas |
| **membro** | Ver/criar tarefas nos projectos atribuídos. Registar horas |
| **cliente** | Apenas ver o Client Hub do seu projecto (read-only) |

---

## 3. Módulos Disponíveis

Cada módulo pode ser activado/desactivado por tenant em `/settings` ou durante o onboarding.

### Dashboard (`/`)
Visão geral com:
- Cards de projectos (saúde, progresso)
- Objectivos activos
- Fontes de dados (Gmail, Calendar, GitHub, Discord)
- Alertas por severidade
- Validação humana (confirmar/rejeitar dados da AI)
- Cards de módulos activos (Pipeline, Horas, Emails, Investimento)

### Projectos (`/project/[slug]`)
- Kanban board com 5 colunas (Backlog → Feito), drag-drop
- Timeline de fases com progresso
- Tab "Dev" com PRs e commits do GitHub (se módulo activo)
- **Client Hub** — vista dedicada para clientes

### OKRs (`/objectives`)
- 3 vistas: Lista, Roadmap temporal, Mapa canvas
- Objectivos com Key Results e progresso percentual

### Pipeline CRM (`/crm`)
- Kanban de oportunidades: Contacto Inicial → Qualificação → Proposta → Negociação → Ganho/Perdido
- Ficha de oportunidade com timeline de actividades
- Conversão oportunidade → projecto (automática)
- **Campanhas de Email** (`/crm/campaigns`) — criar, enviar, ver métricas

### Registo de Horas (`/timetracking`)
- Vista semanal (seg-dom)
- Registo manual + timer
- Submit semanal → aprovação por manager
- Exportar Excel/PDF

### Email Sync (`/email-sync`)
- Emails sincronizados do Gmail
- Categorização: associar a projecto/cliente/pessoa
- Auto-match por remetente quando possível

### Investimento (`/cross-projects`)
- Mapa de investimento por projecto (orçamento, fonte de financiamento)
- Rubricas orçamentais com execução
- Gerar tarefas a partir de rubricas
- Dashboard cross-departamento

### Pessoas (`/people`)
- Equipa interna + contactos externos
- Exportar Excel

### Áreas (`/areas`)
- Departamentos da empresa

### Workflows (`/workflows`)
- Templates de processos reutilizáveis
- Instanciar → cria tarefas automaticamente

### Content Pipeline (`/content`)
- Gestão de conteúdo: vídeos, artigos, posts
- Kanban por estados (Proposta → Publicado)

### Feedback (`/feedback`)
- Sessões de feedback do Chrome Extension
- Transcrição de voz, classificação automática
- Converter feedback em tarefas

### Maestro AI (`/maestro`)
- Chat com assistente AI
- Trust Score e validação humana
- Painel de controlo (admin)

### Definições (`/settings`)
- **LLM** (`/settings/llm`) — configurar fornecedor AI (MiniMax, Anthropic, OpenAI, Ollama)
- **Notificações** (`/settings/notifications`) — canais, Telegram, WhatsApp

---

## 4. Integrações — Como Ligar

### 4.1 Gmail (Email Sync)

**O que faz:** Sincroniza emails do Gmail → categorização automática por projecto/cliente.

**Como configurar:**
1. O endpoint de sync é chamado periodicamente: `GET /api/sync/gmail`
2. Precisa de `SYNC_SECRET` no header `Authorization: Bearer <SYNC_SECRET>`
3. Pode ser chamado por cron job ou agente OpenClaw

**Env vars necessárias:**
```
SYNC_SECRET=<token-secreto>
```

### 4.2 Google Calendar

**O que faz:** Sincroniza eventos do calendário como interacções.

**Endpoint:** `GET /api/sync/calendar` (mesmo auth que Gmail)

### 4.3 GitHub

**O que faz:** Sincroniza PRs, commits, issues → actualiza tarefas automaticamente.

**Duas formas de ligar:**

**Webhook (recomendado):**
1. No repo GitHub → Settings → Webhooks
2. URL: `https://cc.domain/api/webhooks/github`
3. Secret: usar `GITHUB_WEBHOOK_SECRET` do `.env.local`
4. Events: Push, Pull requests, Issues, Issue comments

**Polling (fallback):**
- `GET /api/sync/github?repo=owner/repo` (Bearer token = SYNC_SECRET)

**Env vars:**
```
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=<secret>
```

### 4.4 Discord

**O que faz:** Recebe mensagens estruturadas e envia notificações.

**Webhook recebido:** `POST /api/webhooks/discord`
- Tipos: agent_update, task, decision, alert, interaction

**Notificações enviadas:** Via webhook URL configurável

**Env vars:**
```
DISCORD_NOTIFY_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_SECRET=<secret>
```

### 4.5 Telegram Bot

**O que faz:** Bot para consulta rápida + notificações pessoais.

**Comandos do bot:**
- `/start` — Ligar conta (com código)
- `/projectos` — Lista projectos activos
- `/horas` — Resumo de horas da semana
- `/pipeline` — Estado do pipeline CRM
- `/ajuda` — Lista de comandos

**Inline keyboards:** Aprovar/rejeitar horas, completar tarefas.

**Como configurar:**
1. Criar bot no @BotFather → obter token
2. Registar webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://cc.domain/api/webhooks/telegram&secret_token=<WEBHOOK_SECRET>`
3. Cada user liga a conta em `/settings/notifications` → gera código → envia ao bot

**Env vars:**
```
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_WEBHOOK_SECRET=<secret>   # Opcional, validação extra
TELEGRAM_NOTIFY_CHAT_IDS=123,456   # Chat IDs globais (broadcasts)
```

### 4.6 WhatsApp

**O que faz:** Notificações + comandos por texto.

**Comandos (por texto):** projectos, horas, pipeline, ajuda

**Como configurar:**
1. Criar app no Meta Business → configurar WhatsApp Business API
2. Registar webhook no Meta: URL `https://cc.domain/api/webhooks/whatsapp`
3. Cada user regista o telefone em `/settings/notifications`

**Env vars:**
```
WHATSAPP_TOKEN=<meta-access-token>
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
WHATSAPP_VERIFY_TOKEN=<verify-token>
```

### 4.7 API de Ingestão (Sistemas Externos)

Para ERP, contabilidade, ou qualquer sistema externo comunicar com o Command Center.

**Auth:** Header `Authorization: Bearer <SYNC_SECRET>` + `X-Tenant-Id: <uuid>`

| Endpoint | Método | O que faz |
|----------|--------|-----------|
| `/api/integration/ingest/clients` | POST | Importar/actualizar clientes |
| `/api/integration/ingest/contacts` | POST | Importar contactos em batch |
| `/api/integration/ingest/financials` | POST | Actualizar execução orçamental (rubricas) |
| `/api/integration/export/projects` | GET | Exportar projectos com métricas |
| `/api/integration/export/timeentries` | GET | Exportar horas (para processamento salarial) |

**Exemplo — importar contactos:**
```bash
curl -X POST https://cc.domain/api/integration/ingest/contacts \
  -H "Authorization: Bearer $SYNC_SECRET" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"contacts":[{"name":"João Silva","email":"joao@empresa.pt"}]}'
```

### 4.8 OpenClaw Agents

Os agentes OpenClaw comunicam via `/api/agent/*` endpoints.

**Auth:** `Authorization: Bearer <AGENT_API_SECRET>` + `X-Agent-Id: <agent-name>` + `X-Tenant-Id: <uuid>`

**Endpoints disponíveis:**
- `GET/POST /api/agent/tasks` — CRUD tarefas
- `GET/POST /api/agent/objectives` — CRUD OKRs
- `GET/POST /api/agent/content` — CRUD conteúdo
- `GET/POST /api/agent/interactions` — CRUD interacções
- `GET /api/agent/projects` — Listar projectos
- `GET /api/agent/alerts` — Listar alertas
- `GET/PATCH /api/agent/feedback/items/[id]` — Gerir feedback

**Trust Score:** Cada agente tem um score (0-100) que determina se as acções são auto-executadas ou ficam pendentes de validação humana.

---

## 5. Chrome Extension (Feedback de Testes)

### Instalação
1. Chrome → `chrome://extensions` → "Developer mode" ON
2. "Load unpacked" → seleccionar pasta `extension/` do projecto
3. Extensão aparece na toolbar

### Primeiro uso
1. Clicar no ícone → popup abre
2. **Server URL:** `http://91.99.211.238:3100`
3. **Email + Password** (conta tester criada via script ou convite)
4. "Entrar"

### Adicionar workspace
1. No popup → campo URL + slug do projecto
2. Ex: URL `http://91.99.211.238:3100`, Projecto: `commande-center`
3. Chrome pede permissão → aceitar

### Gravar feedback
1. Navegar para uma página do workspace
2. Botão azul 🎤 aparece (canto inferior esquerdo)
3. Clicar → começa a gravar (voz + acções DOM)
4. Clicar novamente → para → transcreve → classifica → guarda
5. Toast de confirmação aparece

### Ver feedback gravado
- No Command Center: `/feedback` → lista sessões
- Cada sessão mostra: transcrição, classificação, prioridade
- Botão "Criar Tarefa" → converte feedback em tarefa no kanban

### Criar conta de tester
```bash
npx tsx scripts/create-tester.ts email@empresa.pt "Nome" --password=pass123 --project=slug-projecto
```

---

## 6. Exportação

Botão "Exportar" disponível em todas as vistas de lista.

| Vista | Formatos | O que exporta |
|-------|----------|---------------|
| `/crm` | PDF, Excel | Pipeline completo (oportunidades, valores, fases) |
| `/timetracking` | PDF, Excel | Horas por pessoa, projecto, semana |
| `/people` | Excel | Lista de pessoas com email, papel, tipo |
| `/cross-projects` | Excel | Mapas de investimento + rubricas |
| `/project/[slug]` | PDF | Relatório do projecto (fases, tarefas, progresso) |

---

## 7. Maestro (AI Assistant)

### Como usar
- Botão 🎼 no canto inferior direito (qualquer página)
- Abre painel de chat
- Perguntar em linguagem natural

### Exemplos de uso
- "Lista os projectos activos"
- "Cria uma tarefa no projecto AURA: revisar homepage"
- "Quantas horas registei esta semana?"
- "Mostra as oportunidades no pipeline"
- "Que emails tenho por categorizar?"
- "Qual o estado de investimento do projecto iPME Digital?"

### Trust Score
- Acções de escrita (criar tarefa, registar horas) passam pelo sistema de confiança
- Score baixo → acção fica "por confirmar" (validação humana necessária)
- Score alto → acção executada automaticamente
- O score sobe/desce com as validações dos utilizadores

### Configurar o modelo AI
- `/settings/llm` (admin only)
- Fornecedores: MiniMax (default), Anthropic (Claude), OpenAI (GPT), Ollama (local), Custom
- Cada tenant pode ter o seu próprio modelo

---

## 8. Multi-Tenancy

### Como funciona
- Cada organização é um **tenant** isolado
- Todos os dados são filtrados automaticamente por `tenantId`
- Um tenant não vê dados de outro

### Resolução de tenant
- **Web:** Subdomínio → `acme.commandcenter.pt` → tenant "acme"
- **Dev/IP:** Header `x-tenant-slug` ou fallback para "imexplorearound"
- **API:** Header `X-Tenant-Id` com UUID do tenant

### Módulos por tenant
- Admin pode activar/desactivar módulos em `/settings`
- Sidebar adapta-se automaticamente
- Maestro só expõe tools dos módulos activos

### Onboarding de novo tenant
- `/onboarding` — wizard de 5 passos:
  1. Nome da empresa + logo
  2. Convidar equipa
  3. Criar áreas/departamentos
  4. Importar pessoas (manual ou CSV)
  5. Seleccionar módulos

---

## 9. Variáveis de Ambiente

Ficheiro: `.env.local` (nunca commit)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | `postgresql://cc:cc_command_2026@localhost:5432/command_center` |
| `SESSION_SECRET` | Sim | Chave para assinar JWT (base64, 32+ bytes) |
| `SYNC_SECRET` | Sim | Token Bearer para endpoints de sync e integração |
| `AGENT_API_SECRET` | Sim | Token Bearer para agentes OpenClaw |
| `MINIMAX_API_KEY` | Sim | API key do MiniMax (Maestro AI) |
| `MINIMAX_BASE_URL` | Sim | Endpoint do MiniMax |
| `MINIMAX_MODEL` | Não | Modelo (default: MiniMax-M2.7-highspeed) |
| `GROQ_API_KEY` | Sim | API key do Groq (transcrição áudio) |
| `GITHUB_TOKEN` | Não | Token GitHub (se módulo GitHub activo) |
| `GITHUB_WEBHOOK_SECRET` | Não | Secret para webhooks GitHub |
| `SMTP_HOST` | Não | Servidor SMTP (para emails: convites, reset, campanhas) |
| `SMTP_PORT` | Não | Porta SMTP (default: 587) |
| `SMTP_USER` | Não | User SMTP |
| `SMTP_PASS` | Não | Password SMTP |
| `SMTP_FROM` | Não | Endereço remetente |
| `TELEGRAM_BOT_TOKEN` | Não | Token do bot Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Não | Secret para validar webhooks Telegram |
| `TELEGRAM_NOTIFY_CHAT_IDS` | Não | Chat IDs para broadcasts (comma-separated) |
| `WHATSAPP_TOKEN` | Não | Token Meta/WhatsApp Business API |
| `WHATSAPP_PHONE_NUMBER_ID` | Não | ID do número WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | Não | Token de verificação do webhook Meta |
| `DISCORD_NOTIFY_WEBHOOK_URL` | Não | URL do webhook Discord |
| `DISCORD_WEBHOOK_SECRET` | Não | Secret para webhooks Discord |
| `APP_SECRET` | Não | Chave de encriptação para API keys armazenadas (AES-256) |
| `NEXT_PUBLIC_APP_URL` | Não | URL público da app (para links em emails) |

---

## 10. Comandos do Servidor

```bash
cd ~/Projects/command-center

# Dev
npx next dev --port 3100 --hostname 0.0.0.0    # Servidor dev

# DB
npx prisma db push          # Aplicar schema ao PostgreSQL
npx prisma generate         # Regenerar tipos TypeScript
npx prisma db seed          # Dados iniciais

# Verificação
npx tsc --noEmit            # Type check
npx vitest run              # Correr testes (153 testes)

# Scripts
npx tsx scripts/create-tester.ts <email> <name> --password=<pwd> [--project=<slug>]
npx tsx scripts/migrate-to-multitenant.ts       # Migrar dados para multi-tenant
```

---

## 11. Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Next.js (App Router) | 16.2 |
| UI Framework | React | 19 |
| CSS | Tailwind CSS | 4 |
| Icons | Lucide React | — |
| Backend | Next.js API Routes + Server Actions | — |
| Database | PostgreSQL | 16 |
| ORM | Prisma (PG adapter) | 7.7 |
| Auth | JWT (jose) + bcryptjs | — |
| AI | Anthropic SDK (multi-provider via Gateway) | — |
| Transcription | Groq Whisper API | — |
| Drag-drop | @dnd-kit | — |
| Toast | Sonner | — |
| PDF | pdfkit | — |
| Excel | xlsx (SheetJS) | — |
| Email | nodemailer | — |
| Testes | Vitest + Testing Library | — |

---

## 12. Arquitectura de Ficheiros

```
command-center/
├── app/
│   ├── (app)/                  ← Páginas protegidas (auth obrigatório)
│   │   ├── page.tsx            ← Dashboard
│   │   ├── crm/               ← Pipeline CRM + Campanhas
│   │   ├── timetracking/      ← Registo de horas
│   │   ├── email-sync/        ← Emails sincronizados
│   │   ├── cross-projects/    ← Investimento
│   │   ├── feedback/          ← Feedback sessions
│   │   ├── objectives/        ← OKRs
│   │   ├── workflows/         ← Workflows
│   │   ├── content/           ← Content pipeline
│   │   ├── people/            ← Pessoas
│   │   ├── areas/             ← Áreas
│   │   ├── maestro/           ← AI assistant (painel admin)
│   │   ├── settings/          ← Definições (LLM, notificações)
│   │   ├── onboarding/        ← Wizard novos tenants
│   │   └── project/[slug]/    ← Detalhe projecto
│   ├── (auth)/                 ← Login, invite, reset password
│   └── api/                    ← API routes
│       ├── maestro/            ← Chat AI (SSE streaming)
│       ├── agent/              ← API para agentes OpenClaw
│       ├── feedback/           ← Chrome extension endpoints
│       ├── webhooks/           ← GitHub, Discord, Telegram, WhatsApp
│       ├── sync/               ← Gmail, Calendar, GitHub polling
│       ├── integration/        ← API ingestão + export
│       ├── export/             ← PDF/Excel download
│       └── campaigns/          ← Email campaign tracking
├── components/                 ← React components
├── lib/                        ← Business logic
│   ├── db.ts                   ← Prisma client (base + tenant)
│   ├── tenant.ts               ← Resolução de tenant
│   ├── auth/                   ← JWT, sessions, role guards
│   ├── actions/                ← Server actions (CRUD)
│   ├── queries/                ← Database queries
│   ├── validation/             ← Zod schemas
│   ├── maestro/                ← AI: client, gateway, tools, trust
│   ├── integrations/           ← GitHub, Discord, Telegram, WhatsApp
│   ├── notifications/          ← Canais de notificação
│   ├── export/                 ← PDF + Excel generators
│   └── i18n/                   ← Traduções (pt-PT, en)
├── extension/                  ← Chrome Extension (feedback)
├── prisma/
│   ├── schema.prisma           ← ~45 modelos
│   └── seed.ts                 ← Dados iniciais
├── scripts/                    ← Scripts utilitários
└── docs/                       ← Documentação
```

---

*Command Center v2.0 — Guia Operacional Completo*
*Última actualização: 14 Abril 2026*
