# CENTRO DE COMANDO — Stack Técnica e Plano de Implementação

**Versão:** 2.0  
**Data:** 8 Abril 2026

---

## Stack Técnica

### Decisões de Arquitetura

| Componente | Tecnologia | Justificação |
|------------|-----------|--------------|
| Frontend | Next.js (latest stable) + React + Tailwind CSS | Full-stack num só framework, SSR para performance, Server Components para dados sensíveis |
| Backend | Next.js API Routes + Server Actions | Simplifica deploy e desenvolvimento, não precisa de backend separado |
| Base de dados | PostgreSQL 16 + Prisma ORM | Robusto, suporta JSON nativo (campos configuráveis), bom para multi-tenant |
| Autenticação | NextAuth.js (Auth.js) com providers OAuth + credentials | Google OAuth para utilizadores, JWT para agentes |
| Real-time | Server-Sent Events (SSE) para notificações live | Mais simples que WebSockets, suficiente para dashboards |
| Task Queue | BullMQ + Redis | Jobs de sync, crons, processamento assíncrono |
| AI/LLM | Anthropic Claude API (Sonnet para extração, Haiku para classificação) | Extração de calls, pesquisa semântica, matching de tarefas |
| Transcrição | Groq Whisper API | Transcrição de calls e notas de voz |
| File Storage | Google Drive API (documentos) + local filesystem (uploads temporários) | Aproveita infraestrutura que já usam |
| Servidor | VPS Hetzner + Docker Compose | Custo controlado, controlo total, fácil de escalar verticalmente |
| Pacotes | pnpm | Rápido, eficiente em espaço |
| Testes | Vitest (unit) + Playwright (e2e) | Rápido, integra bem com Next.js |

### Estrutura de Pastas

```
centro-de-comando/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Páginas autenticadas (com layout: sidebar + topbar)
│   │   ├── page.tsx              # Landing page (dashboard híbrido)
│   │   ├── project/[slug]/       # Detalhe projeto (kanban, timeline, mapa)
│   │   ├── clients/              # Lista clientes + pipeline
│   │   ├── client/[id]/          # Ficha cliente + feed
│   │   ├── workflows/            # Biblioteca + instâncias
│   │   ├── dev/                  # Dev Hub (opcional)
│   │   ├── objectives/           # Scorecard + roadmap
│   │   ├── integrations/         # Painel de integrações
│   │   └── settings/             # Configurações empresa + utilizador
│   ├── (auth)/                   # Páginas públicas (login, registo)
│   ├── (client)/                 # Páginas para clientes externos (agente recolha, feedback)
│   └── api/
│       ├── agent/                # Agent API (endpoints para agentes externos)
│       ├── webhooks/             # GitHub, Slack, genéricos
│       ├── sync/                 # Endpoints de sync manual
│       ├── feedback/             # SDK de feedback
│       └── maestro/              # Chat com Maestro, instruções, validação
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth/                     # Configuração auth, sessões, permissões
│   ├── maestro/                  # Lógica do Maestro (processamento, trust score, briefing)
│   ├── sync/                     # Jobs de sincronização por integração
│   ├── ai/                       # Chamadas a Claude API, prompts, extração
│   ├── integrations/             # Conectores pré-construídos e genérico
│   ├── notifications/            # Motor de notificações (push, email, telegram)
│   └── utils/                    # Helpers partilhados
├── components/
│   ├── dashboard/                # Landing page, blocos resumo
│   ├── kanban/                   # Board, colunas, cartões, drag & drop
│   ├── timeline/                 # Gantt, fases, marcos
│   ├── relationship-map/         # Mapa relacional (nós, ligações)
│   ├── feed/                     # Feed de interações (timeline, filtros)
│   ├── pipeline/                 # Pipeline kanban (clientes)
│   ├── workflows/                # Templates, instâncias, editor
│   ├── objectives/               # Scorecard, barras, projeções
│   ├── maestro/                  # Chat, validação, briefing, ações
│   └── shared/                   # Avatar, badge, progress bar, health
├── prisma/
│   ├── schema.prisma             # Schema completo
│   ├── seed.ts                   # Dados iniciais
│   └── migrations/               # Migrações
├── sdk/                          # SDK de feedback (package separado)
│   └── feedback-widget.js        # Script embebível
├── workers/                      # BullMQ workers (sync, AI, alertas)
├── docker-compose.yml
├── CLAUDE.md                     # Instruções para o Claude Code
└── docs/                         # Especificações (este documento)
```

### Variáveis de Ambiente

| Variável | Função |
|----------|--------|
| DATABASE_URL | PostgreSQL connection string |
| NEXTAUTH_SECRET | Signing key para sessões |
| NEXTAUTH_URL | URL da aplicação |
| GOOGLE_CLIENT_ID / SECRET | OAuth Google (login + integrações) |
| ANTHROPIC_API_KEY | Claude API para Maestro e extração AI |
| GROQ_API_KEY | Whisper API para transcrição |
| GITHUB_TOKEN | GitHub PAT (read-only, para polling fallback) |
| GITHUB_WEBHOOK_SECRET | HMAC para webhooks GitHub |
| REDIS_URL | Redis para BullMQ |
| AGENT_API_SECRET | Secret base para Agent API (cada agente tem token derivado) |

### Multi-Tenant (Futuro)

Para quando o produto for vendido a terceiros, a arquitetura suporta multi-tenant com isolamento por schema PostgreSQL (uma schema por empresa). Na fase atual (uso interno), funciona com schema única.

---

## Plano de Implementação para Claude Code

### Princípios

1. **Uma fase de cada vez** — o Claude Code recebe instruções para UMA fase. Só avança para a seguinte quando a atual está funcional e testada.
2. **Cada fase tem entregáveis verificáveis** — no final de cada fase, há algo que funciona e pode ser testado no browser.
3. **Fundações primeiro** — base de dados, auth, e layout antes de funcionalidades.
4. **Sem over-engineering** — fazer o mínimo que funciona, refinar depois.
5. **Testar antes de avançar** — cada fase inclui testes mínimos que confirmam que funciona.

### Instruções para o CLAUDE.md

Colocar no ficheiro CLAUDE.md na raiz do projeto:

```
# Centro de Comando — Instruções para Claude Code

## Regras Gerais
- Seguir o plano de implementação fase a fase
- Não avançar para a fase seguinte sem a atual funcionar
- Cada commit deve ser funcional (não partir o que já existe)
- Usar Prisma para todas as queries (não SQL direto)
- Componentes React com Server Components por defeito, Client Components só quando necessário
- Tailwind CSS para estilos, sem CSS modules
- Sem bibliotecas externas desnecessárias — usar shadcn/ui para componentes base

## Stack
- Next.js (App Router) + React + Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- pnpm como package manager
- TypeScript strict mode

## Convenções
- Ficheiros: kebab-case (ex: task-card.tsx)
- Componentes: PascalCase (ex: TaskCard)
- API routes: snake_case nos endpoints
- Variáveis: camelCase
- Tabelas BD: PascalCase (Prisma convention)

## Fase Atual: [ATUALIZAR AQUI]
Ver secção correspondente no plano de implementação.
```

---

### Fase 0 — Setup (1-2 dias)

**Objetivo:** Projeto criado, a correr localmente, deploy no VPS.

**Entregáveis:**
- [ ] Projeto Next.js inicializado com TypeScript, Tailwind, pnpm
- [ ] shadcn/ui instalado e configurado
- [ ] PostgreSQL a correr (local + VPS)
- [ ] Prisma configurado com schema inicial (só User e Session)
- [ ] NextAuth configurado (login com email/password para começar)
- [ ] Layout base: sidebar + topbar + área de conteúdo
- [ ] Página de login funcional
- [ ] Docker Compose (app + postgres + redis)
- [ ] Deploy no VPS Hetzner a funcionar
- [ ] CLAUDE.md na raiz com instruções

**Teste:** Abrir no browser, fazer login, ver layout vazio. Deploy funciona no VPS.

**Instruções para Claude Code:**
```
Fase 0: Setup do projeto Centro de Comando.
Criar projeto Next.js com App Router, TypeScript strict, Tailwind CSS, shadcn/ui, pnpm.
Configurar Prisma com PostgreSQL. Schema inicial com modelo User (id, email, name, passwordHash, role).
Configurar NextAuth com CredentialsProvider (email/password).
Criar layout autenticado com sidebar (links para: Dashboard, Projetos, Clientes, Workflows, Objetivos, Integrações) e topbar (nome do utilizador, logout).
Criar página de login.
Criar seed com 2 utilizadores (Miguel admin, Bruno admin).
Docker Compose com serviços: app, postgres, redis.
Testar: login funciona, layout aparece, sidebar navega entre páginas vazias.
```

---

### Fase 1 — Schema e Dados Base (2-3 dias)

**Objetivo:** Modelo de dados completo no Prisma, seed com dados realistas.

**Entregáveis:**
- [ ] Schema Prisma com todas as tabelas core: Project, ProjectPhase, Task, Person, Client, ClientContact, Interaction, Objective, KeyResult, Area
- [ ] Schema com tabelas de workflows: WorkflowTemplate, WorkflowTemplateStep, WorkflowInstance, WorkflowInstanceTask
- [ ] Schema com tabelas de integrações: Integration, SyncLog, TrustScore
- [ ] Schema com tabelas de dev: GithubRepo, GithubEvent, DevMetricsDaily, FeedbackEntry
- [ ] Seed com dados realistas: 3-4 projetos, 5-6 clientes, 10-15 tarefas, 3 objetivos com KRs, 2 workflow templates
- [ ] Migrações geradas e aplicadas

**Teste:** `npx prisma studio` — ver todas as tabelas com dados do seed.

**Instruções para Claude Code:**
```
Fase 1: Criar schema Prisma completo para o Centro de Comando.
Consultar a especificação em docs/centro-de-comando-spec-v2.md, secções "Modelo de Dados" de cada módulo.
Criar todas as tabelas com relações corretas.
Criar seed.ts com dados realistas para testar.
Gerar e aplicar migrações.
NÃO criar páginas ou componentes nesta fase — apenas base de dados.
```

---

### Fase 2 — Landing Page / Dashboard (3-4 dias)

**Objetivo:** A landing page híbrida funciona com dados reais.

**Entregáveis:**
- [ ] Barra de "Visão estratégica" no topo (objetivos com progresso)
- [ ] Grid de blocos: Projetos, Clientes, Workflows, Dev Hub, Integrações
- [ ] Cada bloco mostra dados resumidos reais (contagens, estados, alertas)
- [ ] Clicar num bloco navega para a página do módulo
- [ ] Barra do Maestro AI em baixo (estática por agora — mensagem placeholder)
- [ ] Responsivo (funciona em desktop e tablet)

**Teste:** Abrir dashboard, ver dados reais do seed, clicar nos blocos e navegar.

**Instruções para Claude Code:**
```
Fase 2: Criar a landing page (dashboard) do Centro de Comando.
Layout híbrido conforme spec: barra estratégica no topo, grid 2x2 de blocos (Projetos, Clientes, Workflows, Dev Hub), barra de integrações full-width, barra do Maestro em baixo.
Cada bloco busca dados reais da BD via Server Components.
Bloco de Projetos: contar projetos por estado, mostrar alertas.
Bloco de Clientes: contar ativos, sem contacto recente.
Bloco de Workflows: contar instâncias em curso.
Bloco Dev Hub: placeholder (dados GitHub não existem ainda).
Barra do Maestro: estática, com mensagem placeholder e botões desativados.
Clicar nos blocos navega para /project, /clients, /workflows, /dev, /objectives, /integrations (páginas podem estar vazias).
```

---

### Fase 3 — Projetos & Kanban (4-5 dias)

**Objetivo:** Módulo de projetos funcional com kanban, CRUD de tarefas.

**Entregáveis:**
- [ ] Lista de projetos (cards com progresso, health, estado)
- [ ] Página de detalhe do projeto com 3 tabs: Kanban, Timeline, Mapa
- [ ] Kanban funcional: 5 colunas, drag & drop, filtros
- [ ] CRUD de tarefas: criar, editar, apagar (modal)
- [ ] Badges de prioridade, responsável, origem
- [ ] Indicador de "parada há X dias"
- [ ] Timeline (Gantt simplificado) com fases do projeto
- [ ] Mapa relacional (placeholder visual — dados estáticos do projeto)

**Teste:** Criar tarefa, mover entre colunas, editar, apagar. Ver timeline com fases.

**Instruções para Claude Code:**
```
Fase 3: Módulo de Projetos & Tarefas.
Página /project lista todos os projetos como cards.
Página /project/[slug] com 3 tabs: Kanban, Timeline, Mapa.
Kanban: 5 colunas (Backlog, A Fazer, Em Curso, Em Revisão, Feito). Drag & drop com @dnd-kit/core.
Cada cartão mostra: título, badge prioridade (cores), avatar responsável, origem.
Modal de detalhe ao clicar num cartão: todos os campos da tarefa, editáveis.
Botão + para criar tarefa nova (modal com formulário).
Filtros: por pessoa, prioridade, origem.
Timeline: Gantt horizontal com fases do projeto, barra de progresso por fase, linha de "hoje".
Mapa: placeholder SVG com o projeto no centro e nós estáticos (cliente, objetivos).
Server Actions para CRUD de tarefas.
```

---

### Fase 4 — Clientes & CRM (3-4 dias)

**Objetivo:** Módulo de clientes com pipeline, ficha, e feed.

**Entregáveis:**
- [ ] Lista de clientes (cards com fase, health, última interação)
- [ ] Pipeline kanban (fases horizontais, drag & drop de clientes)
- [ ] Ficha de cliente: info bar, próximos passos, feed de interações
- [ ] Feed cronológico com filtros por tipo e pessoa
- [ ] CRUD de clientes, contactos, e interações manuais
- [ ] Adicionar nota manual ao feed

**Teste:** Criar cliente, mover no pipeline, adicionar nota ao feed, filtrar interações.

---

### Fase 5 — Workflows (3-4 dias)

**Objetivo:** Biblioteca de templates, criar instâncias, acompanhar progresso.

**Entregáveis:**
- [ ] Biblioteca de templates (lista com info)
- [ ] Editor de template (passos, dependências, responsáveis, prazos)
- [ ] Iniciar workflow (cria instância + tarefas no kanban)
- [ ] Vista de detalhe da instância (passos com estado)
- [ ] Concluir passos avança dependências automaticamente
- [ ] Badge de workflow nas tarefas do kanban

**Teste:** Criar template com 5 passos, iniciar instância, concluir passos, ver tarefas no kanban.

---

### Fase 6 — Objetivos & Roadmap (2-3 dias)

**Objetivo:** Scorecard funcional com progresso e projeções.

**Entregáveis:**
- [ ] Vista scorecard: objetivos com barras de progresso
- [ ] CRUD de objetivos e Key Results
- [ ] Progresso cascadeado (KR → Objetivo)
- [ ] Projeção linear ("a este ritmo, atinges X até Y")
- [ ] Health automático (on track, atrasado, em risco)
- [ ] Roadmap timeline (integra fases dos projetos + deadlines de objetivos)
- [ ] Snapshots diários (cron job)

**Teste:** Criar objetivo com 3 KRs, atualizar KR, ver progresso cascadear, ver projeção.

---

### Fase 7 — Maestro AI Base (4-5 dias)

**Objetivo:** Chat com Maestro funcional, trust score operacional, validação de ações.

**Entregáveis:**
- [ ] Chat contextual com Maestro (sidebar ou modal, disponível em qualquer página)
- [ ] Maestro responde via Claude API com contexto do sistema (projeto atual, tarefas, etc.)
- [ ] Criar tarefa por linguagem natural via chat
- [ ] Trust score: tabela, cálculo, thresholds
- [ ] Validação de ações: aprovar/editar/rejeitar itens criados por AI
- [ ] Trust score sobe/desce conforme validações
- [ ] Barra do Maestro no dashboard funcional (mensagem real, ações pendentes)

**Teste:** Abrir chat, pedir para criar tarefa, tarefa aparece com badge "por validar", aprovar, trust score sobe.

---

### Fase 8 — Integrações Core (4-5 dias)

**Objetivo:** Gmail, Calendar, e GitHub a funcionar.

**Entregáveis:**
- [ ] Painel de integrações (lista, estado, configurar)
- [ ] Gmail sync: OAuth, buscar emails, criar interações no feed do cliente
- [ ] Calendar sync: OAuth, buscar eventos, criar entradas no feed
- [ ] GitHub webhooks: receber push, PRs, deploys, atualizar dev status
- [ ] GitHub polling (fallback)
- [ ] SyncLog para auditoria
- [ ] Ligação automática tarefa-código (referência CC-XX)

**Teste:** Ligar Gmail, ver emails no feed do cliente. Ligar Calendar, ver reuniões. Push no GitHub, ver dev status atualizar.

---

### Fase 9 — Maestro Avançado (4-5 dias)

**Objetivo:** Extração AI de calls, priorização inteligente, briefing, accountability.

**Entregáveis:**
- [ ] Extração AI de transcrições (resumo, tarefas, decisões)
- [ ] Priorização inteligente (recálculo com pesos configuráveis)
- [ ] Briefing automático (periódico, conteúdo real)
- [ ] Alertas de accountability (tarefas paradas, clientes sem contacto)
- [ ] Sugestões proativas no dashboard
- [ ] Configuração por linguagem natural (assignees, regras)

**Teste:** Transcrição processada, tarefas extraídas, briefing gerado, alertas funcionam.

---

### Fase 10 — Agent API + Feedback SDK (3-4 dias)

**Objetivo:** Agentes externos podem comunicar, SDK de feedback funciona.

**Entregáveis:**
- [ ] Agent API completa (todos os endpoints documentados na spec)
- [ ] Registo de agentes com token
- [ ] Rate limiting por agente com alertas
- [ ] SDK de feedback (script JS embebível)
- [ ] Botão flutuante com voz, texto, screenshot
- [ ] Chat integrado com Maestro no SDK
- [ ] Feedback cria tarefa com contexto completo

**Teste:** Registar agente, criar tarefa via API, ver no kanban. Embeber SDK numa página de teste, dar feedback, ver tarefa criada.

---

### Fase 11 — Conector Genérico + Notificações (3-4 dias)

**Objetivo:** Qualquer API pode ser ligada, notificações funcionam.

**Entregáveis:**
- [ ] Conector genérico: formulário de configuração (URL, auth, mapeamento)
- [ ] Motor de mapeamento (campo origem → campo destino)
- [ ] Notificações de saída configuráveis (Telegram, email)
- [ ] Preferências de notificação por utilizador
- [ ] Horário de não-perturbar

**Teste:** Criar conector genérico de teste, receber dados, ver no sistema. Configurar notificação Telegram, receber alerta.

---

### Fase 12 — Polish e Configurabilidade (3-4 dias)

**Objetivo:** Tudo configurável, responsivo, polido.

**Entregáveis:**
- [ ] Configuração de colunas kanban por empresa
- [ ] Configuração de tipos de projeto
- [ ] Configuração de campos customizados
- [ ] Configuração de pipeline de clientes
- [ ] Templates de setor (software, serviços, contabilidade)
- [ ] Setup guiado pelo Maestro ("Diz-me o que a tua empresa faz")
- [ ] Responsivo mobile
- [ ] Performance (lazy loading, cache)
- [ ] Tratamento de erros e estados vazios

**Teste:** Criar empresa nova, usar setup guiado, ver configuração aplicada. Testar em mobile.

---

### Resumo do Plano

| Fase | Duração | Entregável principal |
|------|---------|---------------------|
| 0 | 1-2 dias | Projeto a correr, login, layout |
| 1 | 2-3 dias | Base de dados completa com seed |
| 2 | 3-4 dias | Dashboard / landing page funcional |
| 3 | 4-5 dias | Projetos & Kanban com CRUD |
| 4 | 3-4 dias | Clientes, pipeline, feed |
| 5 | 3-4 dias | Workflows com templates e instâncias |
| 6 | 2-3 dias | Objetivos com progresso e projeções |
| 7 | 4-5 dias | Maestro AI base (chat, trust score) |
| 8 | 4-5 dias | Gmail, Calendar, GitHub integrados |
| 9 | 4-5 dias | Maestro avançado (extração, briefing) |
| 10 | 3-4 dias | Agent API + SDK feedback |
| 11 | 3-4 dias | Conector genérico + notificações |
| 12 | 3-4 dias | Configurabilidade + polish |
| **Total** | **~40-50 dias** | **Produto completo** |

**Nota para o Claude Code:** Cada fase é independente. Não ler a fase seguinte até a atual estar concluída e testada. O utilizador vai testar cada fase e dar feedback antes de avançar.
