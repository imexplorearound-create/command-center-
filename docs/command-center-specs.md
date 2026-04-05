# Command Center — Especificacoes Tecnicas

**Versao:** 1.0  
**Data:** 5 Abril 2026  
**Repo:** github.com/imexplorearound-create/command-center-  
**URL:** http://89.167.39.10:3100  

---

## 1. O que e

Dashboard centralizado de gestao de projectos, tarefas, conteudo, OKRs e integracao com agentes AI. Substituiu a gestao dispersa por ficheiros/Excel por uma plataforma unica com base de dados, autenticacao, e API para agentes autonomos.

---

## 2. Stack Tecnica

| Componente | Tecnologia |
|------------|------------|
| Frontend | Next.js 16.2, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes (Server Components + Server Actions) |
| Base de dados | PostgreSQL 16 + Prisma 7 (driver adapter) |
| Autenticacao | JWT (jose) + bcryptjs, cookies httpOnly |
| Servidor | VPS Hetzner (89.167.39.10), porta 3100 |
| Pacotes | pnpm |

---

## 3. Paginas (7 + login)

| Pagina | URL | Funcao |
|--------|-----|--------|
| Dashboard | `/` | Vista geral: projectos, objectivos, alertas, satellites, validacao AI |
| Estrategia | `/objectives` | OKRs (3 tabs: lista, roadmap, mapa visual) |
| Workflows | `/workflows` | Templates e instancias de processos recorrentes |
| Conteudo | `/content` | Pipeline de conteudo (proposta > aprovado > producao > publicado) |
| Projecto | `/project/[slug]` | Detalhe: kanban (5 colunas), timeline, dev (GitHub), cliente |
| Client Hub | `/project/[slug]/client` | Vista para clientes: contactos, interaccoes, proximos passos |
| Login | `/login` | Autenticacao email/password |

---

## 4. Autenticacao e Roles

Sessoes JWT em cookie httpOnly (7 dias). Proxy (Next.js 16) protege todas as rotas.

| Role | Acesso |
|------|--------|
| admin | Tudo |
| membro | Dashboard + projectos atribuidos (via UserProjectAccess) |
| cliente | Apenas Client Hub do seu projecto |

Utilizadores actuais: Miguel (admin), Bruno (admin).  
Password por defeito: `commandcenter2026`

---

## 5. Modelo de Dados (20 tabelas)

### Core
- **Project** — nome, slug, tipo (interno/cliente), health, progresso, cor
- **ProjectPhase** — fases com datas, progresso, ordenacao
- **Objective** — OKRs com target/current, unidade, deadline, descricao
- **KeyResult** — resultados-chave ligados a objectivos, com peso e deadline
- **Task** — tarefas com status kanban (5 estados), prioridade, assignee, campos AI e GitHub
- **Area** — areas operacionais (RH, Operacoes, Financeiro, Comercial)

### Clientes
- **Client** — empresa cliente ligada a projecto
- **ClientContact** — contactos do cliente (com isPrimary)
- **Interaction** — historico de interaccoes (call, email, decisao, nota)

### Pessoas e Auth
- **Person** — equipa + clientes, com avatarColor e githubUsername
- **User** — auth (email, passwordHash, role, ligado a Person)
- **UserProjectAccess** — permissoes membro-projecto

### Conteudo
- **ContentItem** — pipeline com formato, status, paths para scripts/videos

### AI / Trust Score
- **TrustScore** — confianca por tipo de extraccao (0-100)
- **OkrSnapshot** — historico diario de progresso OKR

### Workflows
- **WorkflowTemplate** — templates de processos com steps
- **WorkflowTemplateStep** — passos com dependencias e deadlines relativos
- **WorkflowInstance** — instancias em execucao
- **WorkflowInstanceTask** — tarefas dentro de instancias

### GitHub
- **GithubRepo** — repos ligados a projectos
- **GithubEvent** — todos os eventos (push, PR, deploy, issue)
- **DevMetricsDaily** — metricas diarias por repo

### Operacional
- **SyncLog** — auditoria de todas as sincronizacoes

---

## 6. Sistema OKR

Hierarquia: **Objectivos > Key Results > Tasks**

- Progresso cascadeado: KR progress = currentValue / targetValue. Objectivo = media ponderada dos KRs (por peso)
- Recalculo automatico em cada mutacao de KR
- Snapshots diarios para graficos de evolucao
- 3 views no tab Estrategia:
  - **OKRs** — lista com CRUD (criar/editar/apagar objectivos e KRs)
  - **Roadmap** — timeline Gantt simplificado com fases e deadlines
  - **Mapa** — organigrama SVG interactivo (clica para expandir, navega para projecto)

Dados actuais: 3 objectivos, 8 key results.

---

## 7. Integracao GitHub

| Funcao | Como |
|--------|------|
| Webhook | `POST /api/webhooks/github` — recebe push, PR, deploy, issues. HMAC SHA-256. |
| Ligacao automatica | CC-## nos commits/PRs, branch matching, ou matching por nome |
| Dev status | Actualiza automaticamente: sem_codigo > em_desenvolvimento > em_review > merged > deployed |
| Kanban | Tasks movem-se automaticamente conforme o estado do codigo |
| Alertas | Deploy falhado cria alerta critico |
| Dev tab | PRs, commits, deploys, metricas no detalhe de projecto |
| Polling | `GET /api/sync/github` — fallback para quando webhooks falham |

Repos configurados: `brunojtfontes/aura-pms`, `brunojtfontes/ipme-digital`

---

## 8. Integracao Discord

`POST /api/webhooks/discord` — recebe mensagens estruturadas de bot Discord ou agentes OpenClaw.

Tipos: agent_update, task, decision, alert, interaction.  
Auth: Bearer token partilhado.

Cria automaticamente: tasks, interaccoes, alertas, decisoes na BD.

---

## 9. Integracao Calendar + Gmail

| Endpoint | Funcao |
|----------|--------|
| `POST /api/sync/calendar` | Recebe eventos de calendario, cria interaccoes tipo "call" |
| `POST /api/sync/gmail` | Recebe emails, cria interaccoes, auto-detecta projecto via contactos |

Ambos actualizam `lastInteractionAt` nos clientes.

---

## 10. Validacao AI + Trust Score

Painel no dashboard com items extraidos por AI (tasks, decisoes) pendentes de confirmacao humana.

- 3 accoes: Confirmar, Editar, Rejeitar (server actions)
- Trust Score recalcula automaticamente: confirmacoes aumentam, rejeicoes diminuem
- 6 categorias: tarefa, decisao, resumo, prioridade, responsavel, conteudo

---

## 11. Agent API (OpenClaw)

API REST para agentes autonomos consultarem e alimentarem o Command Center.  
Auth: Bearer token (`AGENT_API_SECRET`). Header `X-Agent-Id` identifica o agente.

| Endpoint | Metodo | Funcao |
|----------|--------|--------|
| `/api/agent/projects` | GET | Lista projectos com contagem de tasks |
| `/api/agent/tasks` | GET | Busca tasks (?status=, ?project=, ?assignee=) |
| `/api/agent/tasks` | POST | Cria task |
| `/api/agent/tasks/:id` | GET/PATCH | Ver ou actualizar task |
| `/api/agent/content` | GET/POST | Pipeline de conteudo |
| `/api/agent/content/:id` | PATCH | Actualizar estado conteudo |
| `/api/agent/alerts` | POST | Criar alerta |
| `/api/agent/interactions` | POST | Registar interaccao |
| `/api/agent/objectives` | GET | Lista OKRs com KRs |
| `/api/agent/objectives/:id` | PATCH | Actualizar progresso objectivo |
| `/api/agent/key-results/:id` | PATCH | Actualizar progresso KR (cascadeia para objectivo) |

### Agentes configurados

| Agente | O que faz com o CC |
|--------|-------------------|
| Producer | Cria content items, consulta projectos |
| Writer | Busca items aprovados, marca scripts escritos |
| Publisher | Busca items em producao, marca publicado |
| Geo Monitor | Cria alertas de visibilidade |
| Project Manager | Sincroniza tasks/projectos, cria alertas, regista calls |

Credenciais em SECRETS.json de cada agente. Documentacao no TOOLS.md de cada um.

---

## 12. Satellites (Dashboard)

5 cards no dashboard que mostram dados em tempo real:

| Satellite | Fonte |
|-----------|-------|
| Calls | Interaccoes tipo "call" (ultima semana) |
| Conteudo | ContentItems com status "pronto" |
| Discord | SyncLog de discord (ultima semana) |
| Calendario | Interaccoes tipo "call" (ultima semana) |
| GitHub | Commits + PRs abertos (ultima semana) |

---

## 13. Estrutura de Ficheiros

```
command-center/
  app/
    (app)/              ← paginas autenticadas (com sidebar/topbar)
      page.tsx          ← Dashboard
      objectives/       ← OKRs + Roadmap + Mapa
      workflows/        ← Workflows
      content/          ← Pipeline conteudo
      project/[slug]/   ← Detalhe projecto + Client Hub
      api/dashboard/    ← API dashboard
    (auth)/login/       ← Login (sem chrome)
    api/
      agent/            ← Agent API (11 endpoints)
      sync/             ← Calendar, Gmail, GitHub polling
      webhooks/         ← GitHub, Discord webhooks
  lib/
    auth/               ← JWT sessions, server actions, DAL
    integrations/       ← GitHub + Discord event processing
    actions/            ← Validation actions
    agent-auth.ts       ← Bearer token auth para agentes
    agent-helpers.ts    ← Helpers partilhados (resolve slug/person)
    okr-actions.ts      ← CRUD + cascata OKR
    queries.ts          ← Todas as queries (dashboard, OKR, GitHub, etc.)
    types.ts            ← TypeScript interfaces
    db.ts               ← Prisma client singleton
  prisma/
    schema.prisma       ← 20 modelos, 578 linhas
    seed.ts             ← Dados iniciais
  proxy.ts              ← Auth proxy (Next.js 16)
  docs/                 ← Specs e documentacao
```

---

## 14. Variaveis de Ambiente

| Variavel | Funcao |
|----------|--------|
| DATABASE_URL | PostgreSQL connection string |
| SESSION_SECRET | JWT signing key |
| AGENT_API_SECRET | Token para Agent API |
| GITHUB_TOKEN | GitHub PAT (read-only) |
| GITHUB_WEBHOOK_SECRET | HMAC para webhooks GitHub |
| DISCORD_WEBHOOK_SECRET | Token para webhooks Discord |
| SYNC_SECRET | Token para endpoints de sync |

---

## 15. O que falta / Proximos passos possiveis

### Integracao
- [ ] Preencher GITHUB_TOKEN e configurar webhooks nos repos do Bruno
- [ ] Criar bot Discord que forwarda mensagens para o CC
- [ ] Configurar sync periodico Calendar/Gmail via OpenClaw

### Funcionalidades
- [ ] Editar objectivos e KRs inline (modal de edicao)
- [ ] Drag & drop no kanban
- [ ] Graficos de evolucao OKR (usar OkrSnapshot data)
- [ ] Notificacoes (Telegram/email) para alertas criticos
- [ ] Vista de pessoas (quem esta a fazer o que)
- [ ] Filtros avancados no dashboard
- [ ] Modo escuro/claro toggle

### Escala
- [ ] CRUD de utilizadores no browser (convites, desactivar)
- [ ] Per-agent API keys (em vez de token partilhado)
- [ ] Rate limiting nos endpoints publicos
- [ ] HTTPS (certificado SSL)
- [ ] Backup automatico da BD
- [ ] Docker compose para deploy

### Content Engine
- [ ] Producer cria content items automaticamente no CC
- [ ] Publisher actualiza status para "publicado" com link
- [ ] Metricas de engagement (views, likes) via API das plataformas
