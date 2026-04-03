# COMMAND CENTER — Addendum: Integração GitHub
# Extensão ao documento principal (command-center-spec-v1.2.md)
# Versão: 1.0
# Data: 2 Abril 2026

---

## 1. CONTEXTO

Este documento estende o Command Center (spec v1.2) com a integração GitHub. O objetivo é fechar o ciclo entre gestão e código: quando alguém está a programar, o Command Center sabe, e quando algo precisa de ação (review, bug, deploy falhado), entra automaticamente como tarefa atribuída à pessoa certa.

### Princípio

O Command Center já gere tarefas, objetivos e relação com clientes. O que falta é visibilidade sobre o desenvolvimento. O Miguel precisa de saber — sem abrir o GitHub — se o Bruno está a avançar no código, se há PRs à espera de review, se o último deploy correu bem, e qual é a velocidade de desenvolvimento da equipa.

### Referências ao documento principal

- Secção 2.4 (Integrações) — adicionar GitHub como nova fonte
- Secção 3.1 (Modelo de dados) — novos campos na tabela tasks + nova tabela github_events
- Secção 4.1 (Mapa Geral) — novo satélite "GitHub"
- Secção 4.2 (Vista de Projeto) — novo separador "Desenvolvimento"
- Secção 5.2 (Sync jobs) — novo job sync-github
- Secção 6 (API) — novos endpoints
- Secção 10 (Deploy) — nova variável GITHUB_TOKEN

---

## 2. COMO FUNCIONA

### 2.1 Fluxo GitHub → Command Center

```
GitHub Webhook (push, PR, deploy, issue)
       │
       ▼
Command Center API (/api/webhooks/github)
       │
       ▼
┌──────────────────────────────────────┐
│  Processar evento:                   │
│                                      │
│  1. Identificar repo + projeto CC    │
│  2. Procurar referência a tarefa     │
│     (CC-42, #slug, branch name)      │
│  3. Se encontra → ligar ao cartão    │
│     Se não → registar como evento    │
│  4. Atualizar dev_status da tarefa   │
│  5. Se deploy falha → criar alerta   │
│  6. Atualizar métricas              │
└──────────────────────────────────────┘
```

### 2.2 Ligação tarefa ↔ código

O sistema liga tarefas a código de três formas (tenta pela ordem, usa a primeira que encontra):

1. **Referência explícita no PR/commit:** Se o Bruno escreve `CC-42` ou `[CC-42]` no título do PR, mensagem de commit, ou descrição, o sistema encontra a tarefa #42 e liga automaticamente.
2. **Nome do branch:** Se o branch se chama `feature/CC-42-booking-api` ou `fix/integrar-booking`, o sistema procura tarefas com título ou slug semelhante.
3. **Matching por AI (Trust Score):** Se não há referência explícita, o sistema usa Claude para comparar a descrição do PR com as tarefas em curso. Se a confiança for >80%, sugere a ligação com estado "por confirmar" (Camada 2 do Trust Score). Se for <80%, regista o evento mas não liga a nenhuma tarefa.

### 2.3 Atualização automática de estado

| Evento GitHub | Estado da tarefa (dev_status) | Ação no Kanban |
|---|---|---|
| Branch criado | em_desenvolvimento | Tarefa move para "Em Curso" (se estava em "A Fazer") |
| Commit push | em_desenvolvimento | Atualiza timestamp, sem mover |
| PR aberto (draft) | em_desenvolvimento | Sem mover |
| PR aberto (ready for review) | em_review | Tarefa move para "Em Revisão" |
| PR aprovado | em_review | Sem mover (espera merge) |
| PR merged | merged | Tarefa move para "Feito" (ou "Em Revisão" se Trust Score baixo) |
| PR fechado sem merge | em_desenvolvimento | Tarefa volta para "Em Curso" |
| Deploy sucesso | deployed | Sem mover (já está em "Feito") |
| Deploy falha | em_desenvolvimento | Cria alerta + nova tarefa "Fix deploy" atribuída ao autor do commit |
| Issue criada | — | Cria tarefa nova no Kanban (Camada 2 — por confirmar) |

**Regras de segurança (Trust Score):**

- Com Trust Score < 50: movimentos automáticos de Kanban ficam "por confirmar" — o utilizador vê a sugestão e confirma
- Com Trust Score >= 50: movimentos automáticos aplicados, com possibilidade de reverter
- Nunca mover automaticamente para "Feito" sem pelo menos 1 confirmação anterior do mesmo tipo (PR merged → Feito)

### 2.4 Fluxo Command Center → GitHub (Fase 2, opcional)

Para o MVP, o fluxo é unidirecional (GitHub → CC). Na fase 2, pode-se adicionar:

- Criar issue no GitHub quando se cria uma tarefa técnica no Kanban
- Criar branch automaticamente quando uma tarefa move para "Em Curso"
- Fechar issue quando tarefa move para "Feito"

---

## 3. MODELO DE DADOS

### 3.1 Novos campos na tabela tasks

```sql
ALTER TABLE tasks ADD COLUMN github_branch VARCHAR(300);
ALTER TABLE tasks ADD COLUMN github_pr_number INTEGER;
ALTER TABLE tasks ADD COLUMN github_pr_status VARCHAR(50);
ALTER TABLE tasks ADD COLUMN github_pr_url TEXT;
ALTER TABLE tasks ADD COLUMN github_last_commit_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN dev_status VARCHAR(50) DEFAULT 'sem_codigo';
```

### 3.2 Nova tabela — Repositórios

```sql
CREATE TABLE github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  repo_full_name VARCHAR(300) NOT NULL UNIQUE,
  default_branch VARCHAR(100) DEFAULT 'main',
  webhook_secret VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Nova tabela — Eventos GitHub

```sql
CREATE TABLE github_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES github_repos(id),
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(50),
  title VARCHAR(500),
  description TEXT,
  author VARCHAR(200),
  author_mapped_id UUID REFERENCES people(id),
  branch VARCHAR(300),
  pr_number INTEGER,
  commit_sha VARCHAR(40),
  url TEXT,
  task_id UUID REFERENCES tasks(id),
  task_link_method VARCHAR(50),
  task_link_confidence DECIMAL,
  raw_payload JSONB,
  event_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 Nova tabela — Métricas diárias

```sql
CREATE TABLE dev_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES github_repos(id),
  date DATE NOT NULL,
  commits_count INTEGER DEFAULT 0,
  prs_opened INTEGER DEFAULT 0,
  prs_merged INTEGER DEFAULT 0,
  prs_closed INTEGER DEFAULT 0,
  issues_opened INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  deploys_success INTEGER DEFAULT 0,
  deploys_failed INTEGER DEFAULT 0,
  active_contributors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, date)
);
```

### 3.5 Mapeamento utilizadores

```sql
ALTER TABLE people ADD COLUMN github_username VARCHAR(100);
```

---

## 4. VISTAS

### 4.1 Mapa Geral — Satélite GitHub

```
┌─ GitHub ─┐
│ 12 commits│
│ 2 PRs open│
│ 0 deploy ✗│
└───────────┘
```

### 4.2 Kanban — Indicador dev_status nos cartões

| dev_status | Ícone | Texto | Cor |
|---|---|---|---|
| sem_codigo | — | (nenhum) | — |
| em_desenvolvimento | 🔨 | branch: feature/... | Azul |
| em_review | ⚙️ | PR #42 — Em review | Âmbar |
| merged | ✅ | PR #42 — Merged | Verde |
| deployed | 🚀 | Deployed | Verde escuro |

### 4.3 Vista de Projeto — Separador "Dev"

Conteúdo: métricas (commits, PRs, deploys, velocidade), gráfico de actividade (28 dias), lista de PRs abertos, últimos commits, deploys recentes.

---

## 5. SYNC ENGINE

### 5.1 Webhook (tempo real)

- Endpoint: `POST /api/webhooks/github`
- Eventos: push, pull_request, deployment_status, issues, workflow_run
- Validação: HMAC SHA-256

### 5.2 Polling (fallback)

- Job: sync-github, a cada 15 min
- GitHub API: commits, pulls, deployments

---

## 6. API — Novos endpoints

```
POST /api/webhooks/github
GET  /api/github/repos
POST /api/github/repos
GET  /api/github/events
GET  /api/github/metrics
GET  /api/github/metrics/daily
POST /api/tasks/{task_id}/link-github
```

---

## 7. ALERTAS — Novos tipos

| Condição | Tipo | Severidade |
|---|---|---|
| PR aberto há 48h+ sem review | pr_sem_review | warning |
| PR aberto há 5+ dias | pr_sem_review | critical |
| Deploy falhado | deploy_falhado | critical |
| CI/CD falhado | ci_falhado | warning |
| Repo sem commits há 3+ dias úteis | repo_inativo | info |

---

## 8. DEPLOY

Nova variável: `GITHUB_TOKEN` (read-only) + `GITHUB_WEBHOOK_SECRET`

---

## 9. SEED — Repos iniciais

```json
[
  { "repo_full_name": "brunojtfontes/aura-pms", "project": "aura-pms" },
  { "repo_full_name": "brunojtfontes/ipme-digital", "project": "ipme-digital" }
]
```

---

## 10. DECISÕES PARA DISCUTIR COM O BRUNO

1. Nomes dos repos — confirmar repo_full_name
2. Branch workflow — branches + PRs ou push direto para main?
3. Convenção de referência — formato CC-42 nos commits/PRs
4. CI/CD — usa GitHub Actions?
5. Deploy — como fazem deploy?
6. Organização — repos pessoais ou organização GitHub?
7. Monorepo vs. multirepo
