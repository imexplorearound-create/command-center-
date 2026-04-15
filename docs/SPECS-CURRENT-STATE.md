# Command Center — Especificacao Completa (Estado Actual)

> Documento de referencia para projectar novas funcionalidades e planear a versao web.
> Gerado: 2026-04-12

---

## 1. Visao Geral

O **Command Center** e um cockpit operacional full-stack que consolida informacao de multiplas fontes (GitHub, Gmail, Discord, Drive, OpenClaw, CSV) numa unica interface visual. Oferece visibilidade em tempo real sobre:

- Projectos e fases
- Tarefas e workflows (Kanban)
- OKRs e objectivos estrategicos
- Equipa, clientes e contactos
- Pipeline de conteudo
- Estado de desenvolvimento (integracao GitHub)
- Feedback de utilizadores (extensao Chrome + voz)
- Assistente AI (Maestro) com sistema de trust scores

**Localizacao:** `/home/miguel/Projects/command-center/`
**Porto dev:** `3100`
**Base de dados:** PostgreSQL 16 em `localhost:5432/command_center`

---

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | Next.js (App Router, Server Components) | 16.2.2 |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS | 4 |
| Icons | Lucide React | 1.7.0 |
| Drag & Drop | @dnd-kit (core + sortable) | 6.3.1 / 10.0.0 |
| Toasts | Sonner | 2.0.7 |
| Modais | HTML nativo `<dialog>` | — |
| Backend | Next.js API Routes + Server Actions | 16.2.2 |
| Base de Dados | PostgreSQL | 16 |
| ORM | Prisma (com @prisma/adapter-pg) | 7.6.0 |
| Auth (JWT) | jose | — |
| Passwords | bcryptjs | 3.0.3 |
| AI | @anthropic-ai/sdk | 0.86.1 |
| LLM endpoint | MiniMax (compativel Anthropic) | M2.7-highspeed |
| Transcricao | Groq API (Whisper) | — |
| Email | nodemailer | 8.0.5 |
| Testes | Vitest + Testing Library | 4.1.3 / 16.3.2 |
| TypeScript | Strict mode | 5 |
| Linting | ESLint | 9 |

---

## 3. Estrutura de Directorios

```
command-center/
├── app/
│   ├── (app)/                          <- Rotas protegidas (auth gate)
│   │   ├── page.tsx                    <- Dashboard principal
│   │   ├── maestro/page.tsx            <- Admin Trust Scores AI
│   │   ├── objectives/                 <- OKRs (3 vistas: lista, roadmap, mapa)
│   │   ├── workflows/page.tsx          <- Templates + instancias de workflows
│   │   ├── content/page.tsx            <- Pipeline de conteudo (Kanban)
│   │   ├── areas/page.tsx              <- Areas operacionais CRUD
│   │   ├── people/page.tsx             <- Equipa + contactos CRUD
│   │   ├── feedback/page.tsx           <- Lista de sessoes de feedback
│   │   ├── feedback/[id]/              <- Detalhe de sessao (notas voz, AI summary)
│   │   ├── project/[slug]/page.tsx     <- Detalhe projecto (3 tabs)
│   │   ├── project/[slug]/client/      <- Client Hub (feed interaccoes)
│   │   └── api/                        <- API routes protegidas
│   │       ├── dashboard/route.ts
│   │       ├── projects/route.ts
│   │       ├── alerts/route.ts
│   │       └── objectives/route.ts
│   ├── (auth)/login/page.tsx           <- Pagina de login
│   ├── api/                            <- API routes publicas (com auth headers)
│   │   ├── maestro/chat/route.ts       <- Chat com Maestro
│   │   ├── maestro/conversations/      <- CRUD conversas
│   │   ├── feedback/                   <- Endpoints feedback
│   │   │   ├── auth/login/             <- Auth tester (JWT 30d)
│   │   │   ├── items/                  <- CRUD feedback items
│   │   │   ├── sessions/               <- CRUD sessoes
│   │   │   └── voice-note/             <- Upload audio + transcricao Groq
│   │   ├── agent/                      <- Endpoints OpenClaw (Bearer token)
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── objectives/
│   │   │   ├── key-results/
│   │   │   ├── content/
│   │   │   ├── interactions/
│   │   │   ├── feedback/
│   │   │   └── alerts/
│   │   ├── webhooks/
│   │   │   ├── github/route.ts         <- Push/PR/Issues
│   │   │   └── discord/route.ts
│   │   └── sync/
│   │       ├── github/route.ts         <- Sync completo repo
│   │       ├── gmail/route.ts
│   │       └── calendar/route.ts
│   └── layout.tsx
│
├── components/
│   ├── dashboard/                      <- Cards, stats, alertas, validacao
│   ├── kanban/                         <- Board, colunas, task cards, filtros
│   ├── maestro/                        <- Chat panel, trust scores
│   ├── projects/                       <- Modais e formularios projecto
│   ├── areas/                          <- Lista e formularios areas
│   ├── people/                         <- Lista e formularios pessoas
│   ├── phases/                         <- Lista editavel + modal fases
│   ├── layout/                         <- Sidebar + Topbar
│   └── shared/                         <- Modal, ConfirmDialog, FormField
│
├── lib/
│   ├── db.ts                           <- Prisma singleton
│   ├── types.ts                        <- Interfaces TypeScript
│   ├── queries.ts                      <- Queries DB (getProjects, getTasks, etc.)
│   ├── utils.ts                        <- Helpers
│   ├── auth/                           <- Sessao JWT, login/logout, RBAC
│   ├── actions/                        <- Server Actions (CRUD completo)
│   ├── validation/                     <- Schemas Zod (todos os modelos)
│   ├── maestro/                        <- Sistema AI (prompt, tools, trust)
│   ├── integrations/                   <- GitHub, Discord, Groq
│   ├── notifications/                  <- Email, Discord, Telegram, Webhook
│   ├── feedback-auth.ts               <- JWT testers + legacy agent
│   ├── feedback-classify.ts           <- Classificacao AI feedback
│   ├── agent-auth.ts                  <- Bearer token validation
│   └── agent-helpers.ts               <- Resolve slugs/nomes
│
├── prisma/
│   ├── schema.prisma                   <- 20+ modelos, enums, relacoes
│   └── seed.ts                         <- Dados iniciais
│
├── extension/                          <- Extensao Chrome MV3 (feedback)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js                      <- Captura DOM + voz
│   ├── popup.js
│   ├── storage.js
│   └── queue.js
│
├── docs/                               <- Documentacao
├── public/                             <- Assets estaticos + audio feedback
├── .env.local                          <- Config live (secrets, API keys)
└── package.json
```

---

## 4. Base de Dados — Modelos (20+)

### Autenticacao e Utilizadores

**User**
- Campos: id, email, passwordHash, name, role, personId, createdAt
- Roles: `admin` (acesso total), `membro` (escrita), `cliente` (leitura do seu projecto)

**UserProjectAccess**
- Relacao many-to-many entre User e Project

### Projectos e Operacoes

**Project**
- Campos: id, name, slug (auto-gerado), type (interno/cliente), status (ativo/pausado/concluido), health (green/yellow/red), progress (0-100), description, color (#hex), archivedAt
- Relacoes: phases, tasks, areas, client, githubRepos, contentItems, feedbackSessions

**ProjectPhase**
- Campos: id, projectId, name, description, phaseOrder, status (pendente/em_curso/concluida), progress, startDate, endDate

**Area**
- Campos: id, name, description, ownerId (Person), archivedAt
- Agrupamento cross-projecto

### Tarefas e Workflow

**Task** (entidade central, 20+ campos)
- Identificacao: id, title, description, projectId, phaseId, areaId
- Workflow: status (backlog/a_fazer/em_curso/em_revisao/feito), priority (critica/alta/media/baixa), kanbanOrder
- Atribuicao: assigneeId, validatedById
- Datas: deadline, completedAt, createdAt, updatedAt
- Origem: origin (manual/ai/agent/github/email/call)
- Validacao AI: validationStatus (por_confirmar/auto_confirmado/confirmed/edited/rejected), aiConfidence, originalData
- GitHub: devStatus (sem_codigo/em_desenvolvimento/em_review/merged/deployed), branch, prNumber, prStatus, prUrl, lastCommitAt

**WorkflowTemplate** — Definicoes reutilizaveis (manual ou trigger)
**WorkflowTemplateStep** — Passos com dependencias, prazos, assignees
**WorkflowInstance** — Execucao activa de workflow
**WorkflowInstanceTask** — Tarefas criadas a partir de steps

### OKRs e Objectivos

**Objective**
- Campos: id, title, description, projectId, targetValue, currentValue, unit, deadline, status
- Relacoes: keyResults, snapshots

**KeyResult**
- Campos: id, objectiveId, title, weight, order, targetValue, currentValue, unit

**OkrSnapshot**
- Tracking historico (valor numa data)

### Pessoas e Contactos

**Person**
- Campos: id, name, email, role, type, avatarColor, githubUsername, archivedAt
- Relacoes: tasks assigned, tasks validated, areas owned, content approved

**ClientContact**
- Liga clientes a pessoas (isPrimary flag)

### Clientes e Interaccoes

**Client**
- Campos: id, projectId, companyName, status, lastInteractionAt, daysSinceContact, notes

**Interaction**
- Campos: id, clientId, type, title, body, source, participants, createdAt
- AI: validationStatus, aiConfidence, originalData

### Pipeline de Conteudo

**ContentItem**
- Campos: id, projectId, title, format, status (proposta/in_progress/approved/published)
- Pipeline: sourceCallDate -> scriptPath -> videoPath -> approvedAt -> publishedAt -> approvedById
- AI: validationStatus, aiConfidence, originalData

### Integracao GitHub

**GithubRepo**
- Campos: id, projectId, fullName, defaultBranch, webhookSecret, lastSyncAt

**GithubEvent**
- Campos: id, repoId, eventType (commit/pr/issue), author, authorPersonId, rawPayload
- Task linking: taskId, taskLinkMethod (explicit/implicit), taskLinkConfidence

**DevMetricsDaily**
- Agregados diarios: commits, PRs opened/merged/closed, issues, lines added/removed, deploys, active contributors

### Sistema Maestro AI

**MaestroConversation** — Sessoes chat por user
**MaestroMessage** — Mensagens (role, content, toolCalls, toolResults)
**MaestroAction** — Audit log (agentId, extractionType, action, entity, scoreDelta)
**TrustScore** — Por agente, por tipo de extracao (confirmations, edits, rejections)

### Feedback (Extensao Chrome)

**FeedbackSession**
- Campos: id, projectId, testerName, testerId, startUrl, pagesVisited, duration, aiSummary, aiClassification, status

**FeedbackItem**
- Campos: id, sessionId, type, classification, module, priority, pageUrl, pageTitle, voiceAudioUrl, voiceTranscript, aiSummary, contextSnapshot, status (pending/reviewed), taskId, reviewedById

### Alertas e Logs

**Alert**
- Campos: id, type (tarefa_atrasada/cliente_sem_contacto/etc.), severity, message, relatedTaskId/ProjectId/ClientId

**SyncLog**
- Campos: id, source, action, status, itemsProcessed, errorMessage, durationMs

---

## 5. Paginas e Rotas (Frontend)

### Rotas Protegidas (dentro de `(app)/`)

| Rota | Descricao |
|------|-----------|
| `/` | **Dashboard** — Stats, cards de projectos, barra de objectivos, satellites de dados, painel de validacao, alertas |
| `/project/[slug]` | **Detalhe Projecto** — 3 tabs: Kanban (tarefas), Timeline, Dev (GitHub). Filtros por status, prioridade, assignee |
| `/project/[slug]/client` | **Client Hub** — Feed de interaccoes read-only para role `cliente` |
| `/maestro` | **Admin Trust Scores** — Scores por tipo de extracao, accoes recentes do Maestro |
| `/objectives` | **Estrategia/OKRs** — 3 vistas: lista OKR, roadmap temporal, mapa canvas |
| `/workflows` | **Workflows** — CRUD templates + instancias activas |
| `/content` | **Pipeline Conteudo** — Kanban por status (proposta -> approved -> published) |
| `/areas` | **Areas Operacionais** — CRUD areas, atribuir owners |
| `/people` | **Equipa** — CRUD pessoas/contactos, gerir roles |
| `/feedback` | **Sessoes Feedback** — Lista sessoes de teste, gravacoes voz, classificacoes AI |
| `/feedback/[id]` | **Detalhe Sessao** — Timeline de items, audio, transcricoes, AI summary |

### Rota Publica

| Rota | Descricao |
|------|-----------|
| `/(auth)/login` | Formulario login (email + password) |

---

## 6. API Endpoints

### Maestro (Chat AI)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/maestro/chat` | Writer+ | Enviar mensagem, executar tools |
| GET | `/api/maestro/conversations` | Writer+ | Listar conversas do user |
| GET/POST/DELETE | `/api/maestro/conversations/[id]` | Writer+ | CRUD conversa |

### Feedback

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/feedback/auth/login` | Publico | Login tester (JWT 30d) |
| GET/POST | `/api/feedback/sessions` | Tester/Agent | CRUD sessoes |
| GET | `/api/feedback/sessions/[id]` | Tester/Agent | Detalhe sessao |
| GET/POST | `/api/feedback/items` | Tester/Agent | CRUD items |
| GET/PATCH/DELETE | `/api/feedback/items/[id]` | Agent | Item CRUD |
| POST | `/api/feedback/items/[id]/to-task` | Tester/Agent | Converter feedback em tarefa |
| POST | `/api/feedback/voice-note` | Tester/Agent | Upload audio + transcricao Groq |

### Agent (OpenClaw) — Bearer Token

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/agent/projects` | Listar projectos (filtro: status, slug) |
| GET/POST | `/api/agent/tasks` | Listar/criar tarefas |
| GET | `/api/agent/tasks/[id]` | Detalhe tarefa |
| GET/POST | `/api/agent/objectives` | Listar/criar OKRs |
| GET/PATCH | `/api/agent/objectives/[id]` | OKR detalhe + update |
| GET/PATCH | `/api/agent/key-results/[id]` | KR detalhe + update |
| GET/POST | `/api/agent/content` | CRUD content items |
| GET/PATCH | `/api/agent/content/[id]` | Content item detalhe |
| POST | `/api/agent/interactions` | Criar interaccoes (client hub feed) |
| GET/POST | `/api/agent/feedback/sessions` | CRUD sessoes feedback |
| GET | `/api/agent/feedback/items` | Listar feedback items |
| GET/POST | `/api/agent/alerts` | Listar/criar alertas |

### Webhooks (entrada)

| Rota | Fonte | Eventos |
|------|-------|---------|
| `/api/webhooks/github` | GitHub | push, pull_request, issues |
| `/api/webhooks/discord` | Discord | Mensagens |

### Sync (polling)

| Rota | Descricao |
|------|-----------|
| `/api/sync/github` | Sync completo repo (commits, PRs, issues) |
| `/api/sync/gmail` | Polling emails |
| `/api/sync/calendar` | Polling calendario |

---

## 7. Sistema Maestro AI

### Componentes

**System Prompt** — Portugues PT-PT, tom directo, sem fluff
- 4 tools disponiveis: listar projectos, listar tarefas, listar pessoas, criar tarefa
- Usa sempre tools (sem alucinacao), confirma accoes sensiveis
- Nunca menciona outros agentes (Producer, Writer, Publisher)

**Tools do Maestro:**
1. `listar_projectos` — Lista projectos activos com contagem de tarefas por status
2. `listar_tarefas` — Lista tarefas com filtros (slug, status, assignee, origin, limit)
3. `listar_pessoas` — Lista pessoas nao-arquivadas (internas + clientes)
4. `criar_tarefa` — Cria tarefa com gating opcional (auto-confirm se confianca >80%)

### Sistema Trust Score

**7 tipos de extracao:**
- `tarefa`, `decisao`, `resumo`, `prioridade`, `responsavel`, `conteudo`, `ligacao_codigo`

**5 estados de validacao:**
1. `por_confirmar` — AI extraiu, humano deve validar (badge "Por validar")
2. `auto_confirmado` — Confianca >80%, auto-admitido (badge "Bot")
3. `confirmed` — Humano validou (trust score sobe)
4. `edited` — Humano modificou (score sobe menos)
5. `rejected` — Humano rejeitou (score desce)

**5 niveis de trust:**
| Nivel | Score | Descricao |
|-------|-------|-----------|
| Aprendizagem | 0-30 | Agente novo a aprender |
| Calibracao | 31-50 | Ainda a calibrar |
| Confianca | 51-70 | Confiavel |
| Autonomia | 71-90 | Alta autonomia |
| Pleno | 91-100 | Autonomia total |

**Cap de accoes sensiveis:** Decisoes financeiras, arquivo de projecto/pessoa, comunicacao externa, alteracoes auth — capped a score 50 independente do historico.

**Formula score:** `newScore = Math.round((totalConfirmations * 3 - totalRejections) / totalInteractions * 100)`

### Fluxo Chat
1. User envia mensagem -> POST `/api/maestro/chat`
2. Verificacao auth (Writer+ obrigatorio)
3. Carregar/criar conversa do user
4. Construir historico de mensagens da DB
5. Chamar Anthropic API com system prompt + tools
6. Executar tool calls, recolher resultados
7. Se Claude chamou tools, append resultados e re-invocar (loop agentico)
8. Persistir turno final (mensagem user + resposta assistant + tool calls/results)
9. Devolver ao cliente

### Persistencia
- `MaestroConversation` por user (titulo + flag archived)
- `MaestroMessage` por turno (role, content, toolCalls JSON, toolResults JSON)
- Max 100 mensagens recentes por conversa (para context window)

---

## 8. Integracao GitHub

### Webhook Receiver
- Verificacao HMAC signature
- Eventos: push (commits), pull_request (open/close/sync), issues (open/close/labeled)

### Processamento
- **Author Mapping:** GitHub username -> Person.githubUsername
- **Task Linking:**
  - Explicito: referencias `CC-##` (lookup kanban position)
  - Implicito: branch name keyword matching contra titulos de tarefas (fuzzy, confidence score)
  - Armazena: taskId, taskLinkMethod, taskLinkConfidence
- **Event Storage:** Payload raw completo em GithubEvent.rawPayload (JSON)

### Dev Metrics (DevMetricsDaily)
- Agregados diarios: commits, PRs opened/merged/closed, issues, lines +/-, deploys, contributors activos
- Indexado por repo + data

### Task Dev Status (5 estados)
`sem_codigo` -> `em_desenvolvimento` -> `em_review` -> `merged` -> `deployed`

---

## 9. Sistema de Feedback (Extensao Chrome + Web)

### Extensao Chrome MV3
- **popup.js** — UI (adicionar workspace, start/stop gravacao)
- **background.js** — Service worker (gestao sessoes)
- **content.js** — Injeccao na pagina, captura: notas voz (MediaRecorder -> WAV/WebM), DOM snapshots, URL + titulo, eventos navegacao
- **storage.js** — Chrome storage wrapper
- **queue.js** — Batch de eventos, sync para backend

### Fluxo
1. Tester adiciona URL workspace no popup
2. Extensao pede `chrome.permissions.request` para esse origin
3. Regista content script via `chrome.scripting.registerContentScripts`
4. User grava notas voz, extensao captura DOM events
5. Ao parar: POST `/api/feedback/sessions`
6. Upload audio individual para `/api/feedback/voice-note` -> Groq transcreve
7. Backend classifica feedback (type: bug/feature/ui/performance)
8. Gera AI summary
9. Marca sessao pronta para review

### Review Admin
- `/feedback` lista sessoes
- `/feedback/[id]` mostra timeline com audio playback, transcricoes, classificacoes AI, links para tarefas criadas
- Accoes: marcar reviewed, converter em tarefa, atribuir a modulo

---

## 10. Autenticacao e Autorizacao

### Sessoes
- JWT via **jose** (encode/decode)
- Cookie httpOnly (7 dias expiry)
- Payload: `{ userId, personId, email, name, role }`

### Login
1. POST form (email, password)
2. Find User by email
3. Verificar password com bcryptjs
4. Criar JWT
5. Set cookie httpOnly
6. Redirect para `/`

### Roles (RBAC)
| Role | Permissoes |
|------|-----------|
| `admin` | Acesso total (todos projectos, criar projectos, gerir pessoas, dashboard admin) |
| `membro` | Escrita/edicao (criar tarefas, update status, validar, CRUD conteudo) — visibilidade limitada a projectos atribuidos |
| `cliente` | Leitura apenas — so ve o Client Hub do seu projecto |

### Guards
- `requireAdmin()` — so admin
- `requireWriter()` — admin OU membro
- `requireNonClient()` — admin OU membro (redirect se cliente)
- `requireAdminPage()` — admin only (redirect pagina)

### Auth Agent API
- Header `Authorization: Bearer {token}` contra `AGENT_API_SECRET`
- 401 se invalido

### Auth Tester (Feedback)
- JWT em cookies (da extensao) OU fallback para `AGENT_API_SECRET`

---

## 11. Validacao (Zod Schemas)

Todos os modelos usam schemas Zod com enums tipados:

### Task
- Status: `backlog | a_fazer | em_curso | em_revisao | feito`
- Priority: `critica | alta | media | baixa`
- Validation: `por_confirmar | auto_confirmado | confirmed | edited | rejected`
- Create: title (obrigatorio), description, projectId, phaseId, areaId, assigneeId, status, priority, deadline (YYYY-MM-DD), origin
- Move: toStatus (enum) + toIndex (integer para reordenar kanban)

### Project
- Type: `interno | cliente`
- Status: `ativo | pausado | concluido`
- Health: `green | yellow | red`
- Create: name (obrigatorio), slug (auto via `slugify()`), type (obrigatorio), description, color (#hex)

### Phase
- Status: `pendente | em_curso | concluida`
- Progress: 0-100
- Validacao: endDate >= startDate

### Helpers
- `emptyToNull()` — converte strings vazias de formularios para null
- `firstZodError()` — extrai primeira mensagem de erro do ZodError
- Mensagens de erro em portugues

---

## 12. Server Actions — Padrao

```typescript
export async function actionName(
  prev: ActionResult<T> | undefined,
  formData: FormData
): Promise<ActionResult<T>> {
  // 1. Auth check
  const auth = await requireAdmin(); // ou requireWriter()
  if (!auth.ok) return { error: auth.error };

  // 2. Validar com Zod
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // 3. Operacao DB
  const result = await prisma.model.create({ data });

  // 4. Invalidar cache
  revalidatePath("/path");

  // 5. Retornar sucesso
  return { success: true, data: result };
}
```

### Actions Implementadas

| Modulo | Actions |
|--------|---------|
| Projects | createProject, updateProject, archiveProject |
| Phases | createPhase, updatePhase, deletePhase |
| Tasks | createTask, updateTask, moveTask, updateTaskDevStatus, completeTask, archiveTask |
| Validacao | confirmTask, editTask, rejectTask, confirmInteraction, confirmContentItem |
| Areas | createArea, updateArea, archiveArea |
| People | createPerson, updatePerson, archivePerson |
| Content | createContentItem, updateContentItem, archiveContentItem |
| Interactions | createInteraction, validateInteraction |
| Feedback | convertFeedbackToTask, markFeedbackReviewed |
| OKRs | Server actions em okr-actions.ts |

---

## 13. UI/UX

### Layout
- **Sidebar** (colapsavel): Dashboard, Projectos, Estrategia, Workflows, Conteudo, Areas, Equipa, Feedback
- **Topbar**: Perfil user, logo, placeholder pesquisa
- **Modais**: Wrapper custom sobre `<dialog>` nativo

### Componentes Principais

| Componente | Descricao |
|-----------|-----------|
| ProjectCard | Nome, badge saude, barra progresso, contagem tarefas, menu accoes |
| KanbanBoard | 5 colunas por status, drag-drop dnd-kit |
| TaskCard | Titulo, badge prioridade, avatar assignee, deadline, origem, accoes |
| ObjectivesBar | Lista horizontal objectivos activos com progresso |
| SatelliteCard | Widget fonte de dados (calls, content, Discord, calendar, GitHub) com contagem |
| AlertsPanel | Lista alertas recentes com cor por severity |
| ValidationPanel | Fila de validacoes AI pendentes (confirm/edit/reject) |
| TrustScoreCard | Score, contagem confirmations/edits/rejections |
| MaestroPanel | Interface chat (sidebar), message bubbles, resultados tool calls |

### Design
- **Tailwind CSS 4** utility-first
- **CSS variables custom** (--green, --yellow, --red, --accent, --muted)
- **Sem component library** — tudo custom (Modal, FormField, ConfirmDialog)
- **Responsivo**: Grid auto-fit, flex

---

## 14. Integracoes Externas

| Servico | Uso | Config |
|---------|-----|--------|
| MiniMax | LLM Maestro (endpoint compativel Anthropic) | `MINIMAX_API_KEY`, `https://api.minimax.io/anthropic`, modelo M2.7-highspeed |
| Groq | Transcricao audio (Whisper) | `GROQ_API_KEY` |
| GitHub | Webhooks + API polling (push/PR/issues) | `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET` |
| Discord | Notificacoes via webhook | `DISCORD_WEBHOOK_SECRET` |
| PostgreSQL 16 | Base de dados principal | `DATABASE_URL`, Prisma PG adapter |
| Nodemailer | Notificacoes email | Config em `lib/notifications/channels/email.ts` |
| OpenClaw | Agent API (Bearer token) | `AGENT_API_SECRET` |

---

## 15. Notificacoes

4 canais configurados:
1. **Email** (Nodemailer/SMTP)
2. **Discord** (webhook)
3. **Telegram** (API)
4. **Webhook** (generico)

Template existente: `feedback-bug.ts` — email para bugs de feedback

---

## 16. Testes

- **Framework:** Vitest 4.1.3
- **Testing Library:** @testing-library/react 16.3.2
- **Localizacao:** pastas `__tests__/` dentro de `lib/actions/`, `lib/validation/`, `lib/maestro/`
- **Comandos:** `pnpm test` (once), `pnpm test:watch` (watch)

---

## 17. Comandos de Desenvolvimento

```bash
pnpm dev                     # Dev server (porto 3100)
pnpm build                   # Build producao
pnpm start                   # Run build producao
pnpm lint                    # ESLint
pnpm test                    # Vitest (once)
pnpm test:watch              # Vitest (watch)
pnpm prisma db push          # Aplicar schema (sem migrations)
pnpm prisma db seed           # Seed dados iniciais
pnpm prisma generate          # Regenerar tipos Prisma
pnpm exec tsc --noEmit        # Type check
```

---

## 18. Estado Actual

### Completo e Funcional
- Dashboard com cards, stats, satellites, alertas, validacao
- Kanban por projecto (drag-drop 5 status)
- CRUD completo: tarefas, projectos, fases, areas, pessoas, conteudo, interaccoes
- OKRs com 3 vistas (lista, roadmap, mapa canvas)
- Workflows templates + instancias
- Maestro AI com 4 tools + trust scores
- GitHub webhooks + sync + task linking + dev metrics
- Feedback system (extensao Chrome + voz + transcricao + AI classification)
- Feedback-to-task conversion
- Sistema de alertas
- Painel de validacao humana (confirm/edit/reject)
- Trust score engine (Bayesian per extraction type)
- Soft deletes via archivedAt
- RBAC (admin, membro, cliente)
- Auth JWT 7 dias httpOnly
- Agent API para OpenClaw
- Notificacoes (Discord, email, webhook)

### Parcialmente Implementado
- Gmail/Calendar sync — endpoints existem, podem precisar de polishing
- Timeline view no ProjectView — estrutura presente
- GitHub task linking — alguns edge cases
- Classificacao AI de feedback — integracao modelo precisa validacao

### Nao Implementado (Oportunidades)
- WebSocket real-time (actualmente so polling)
- Operacoes batch (bulk status changes)
- Vistas avancadas de reporting/analytics
- Multi-lingua (hardcoded PT-PT)
- Templates notificacao customizaveis por user
- Optimizacoes performance para 10k+ tarefas
- Mobile responsive refinado
- Dark mode
- Audit trail completo (quem fez o que, quando)
- Integracoes adicionais (Slack, Linear, Notion)
- Dashboard customizavel (widgets drag-drop)
- Exportacao dados (CSV, PDF)

---

## 19. Documentacao Existente

| Ficheiro | Conteudo |
|----------|---------|
| `docs/command-center-spec-v1.2.md` | Spec funcional completa (1952 linhas) |
| `docs/manual-command-center.md` | Manual do utilizador |
| `docs/setup-database-bruno.md` | Setup PostgreSQL + seeding |
| `docs/feedback-tester-setup.md` | Setup ambiente testers |
| `docs/addendum-github-v1.0.md` | Spec detalhada integracao GitHub |
| `CLAUDE.md` | Guia desenvolvimento (convencoes, stack, setup) |
| `AGENTS.md` | Notas integracao agentes |
