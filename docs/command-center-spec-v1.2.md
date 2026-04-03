# COMMAND CENTER — Especificação Completa
# Gestor Visual de Projetos, Tarefas & Relação com Clientes
# Versão: 1.2 (Trust Score + Workflows)
# Data: 2 Abril 2026
# Para: Desenvolvimento com Claude Code

---

## 1. VISÃO GERAL

### 1.1 O que é

O Command Center é o cockpit de gestão da empresa. Uma aplicação web que dá visibilidade total sobre todos os projetos, tarefas, objetivos, relação com clientes e pipelines de trabalho — tudo num único sítio, em tempo real, com dados alimentados automaticamente.

### 1.2 Problema que resolve

Atualmente a informação está dispersa: tarefas num CSV, calls no Drive, decisões no Discord, progresso no código, emails no Gmail, conteúdo no content engine. O Miguel e o Bruno precisam de abrir 5-6 ferramentas diferentes para ter uma visão do estado das coisas. O Command Center consolida tudo numa interface visual única.

### 1.3 Utilizadores

- **Fase 1 (MVP):** Miguel (gestão/negócio) e Bruno (CTO/desenvolvimento)
- **Fase 2:** Membros de equipa futuros (perfis funcionais e técnicos)
- **Fase 3:** Stakeholders externos (clientes como Sérgio/Nuno) com vistas filtradas por projeto

### 1.4 Princípios de design

1. **Visão primeiro** — ao abrir, vejo tudo num relance. Sem cliques para perceber o estado geral
2. **Profundidade a pedido** — clico num bloco e mergulho no detalhe
3. **Autonomia progressiva (Trust Score)** — dados factuais entram automaticamente; dados extraídos por AI começam sob validação humana e ganham autonomia à medida que provam estar corretos. O mesmo princípio do AURA PMS e do iPME Digital
4. **Alertas inteligentes** — o sistema destaca o que precisa de atenção (tarefas atrasadas, clientes sem contacto, objetivos em risco)
5. **Mobile-friendly** — Miguel consulta frequentemente no telemóvel
6. **Humano sempre no controlo** — o utilizador pode a qualquer momento reverter a autonomia da AI, corrigir dados, e o sistema aprende com cada correção

---

## 2. ARQUITETURA TÉCNICA

### 2.1 Stack recomendado

```
Frontend:  Next.js 14+ (App Router) + React 18+ + Tailwind CSS + shadcn/ui
Backend:   Next.js API Routes (ou NestJS se preferir consistência com AURA PMS)
Base dados: PostgreSQL 16+ (ou SQLite para MVP rápido)
Cache:     Redis (opcional no MVP)
Auth:      NextAuth.js (OAuth — Google login para consistência)
Deploy:    VPS existente (Docker Compose)
```

### 2.2 Justificação do stack

- Next.js + Tailwind + shadcn/ui: mesmo stack do AURA PMS — o Bruno já domina
- PostgreSQL: consistente com os outros projetos
- VPS: já têm servidor (89.167.39.10) com Docker
- Sem dependências externas pesadas no MVP — tudo se comunica via APIs REST/webhooks

### 2.3 Diagrama de alto nível

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMAND CENTER (Next.js)                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Mapa    │  │  Kanban  │  │ Timeline │  │ Client   │   │
│  │  Geral   │  │  Board   │  │  /Gantt  │  │  Hub     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                        │                                    │
│              ┌─────────┴─────────┐                         │
│              │   API Layer       │                         │
│              │   (Next.js API)   │                         │
│              └─────────┬─────────┘                         │
│                        │                                    │
│         ┌──────────────┼──────────────┐                    │
│         │              │              │                    │
│    ┌────┴────┐   ┌─────┴─────┐  ┌────┴────┐              │
│    │  Data   │   │  Sync     │  │  Alert  │              │
│    │  Store  │   │  Engine   │  │  Engine │              │
│    │ (Postgres)│  │  (Crons)  │  │         │              │
│    └─────────┘   └─────┬─────┘  └─────────┘              │
│                        │                                    │
└────────────────────────┼────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
    ┌─────┴─────┐  ┌─────┴─────┐   ┌───────┴───────┐
    │  Google   │  │  Discord  │   │   OpenClaw    │
    │ (Drive,   │  │  Bot API  │   │  (Telegram,   │
    │ Calendar, │  │           │   │   Agents)     │
    │ Gmail)    │  │           │   │               │
    └───────────┘  └───────────┘   └───────────────┘
```

### 2.4 Integrações (APIs e conexões)

| Fonte | API/Método | Dados que extrai | Frequência |
|-------|-----------|-----------------|------------|
| Google Drive | Google Drive API (Connection: `4b9bdfc5-28d7-48b2-8751-80953d48049b`) | Calls gravadas, documentos de requisitos, transcrições | A cada hora |
| Google Calendar | Google Calendar API (Connection: `372c29c9-4dc5-4a76-85de-fe418e5882e5`) | Reuniões, deadlines, milestones | A cada 15 min |
| Gmail | Gmail API (via Maton proxy) | Emails de/para clientes, faturas | A cada 30 min |
| Discord | Discord Bot API (bot a configurar) | Mensagens dos canais, decisões, tarefas | Tempo real (webhook) |
| OpenClaw/Telegram | Telegram Bot API (@claudette14_bot) | Comandos, briefings, interações com agentes | Tempo real (webhook) |
| Google Sheet | Google Sheets API (Connection: `ea76eac5-3a25-41d6-8e9e-c9cc6155ce54`) | Painel de tarefas existente (Sheet ID: `1S6Cl2dZVi9fJtCuiLOP54aZcM3vD_Qi9JYy_C8M24jo`) | Bi-direcional, a cada hora |
| Content Engine | Filesystem (content-engine/) | Propostas de conteúdo, estados do pipeline, vídeos | A cada hora |
| Transcrições | Groq Whisper API / Whisper local | Texto das calls → extração AI de tarefas e decisões | Após cada call (via Scout cron) |

---

## 2.5 TRUST SCORE — Modelo de Confiança e Validação Humana

### Princípio

O mesmo modelo de autonomia progressiva usado no AURA PMS (Trust Score dos agentes AI) e no iPME Digital (validação de matching de faturas). O sistema começa sob supervisão total e vai ganhando autonomia à medida que prova estar correto. O humano pode a qualquer momento reverter a autonomia.

Referência do Sérgio (call 24 Mar 2026): "Numa primeira fase, o contabilista humano valida tudo. A partir do momento que tivermos a confiança necessária, invertemos: a IA submete e o contabilista é informado."

### Três camadas de dados

#### Camada 1 — Dados factuais (confiança 100%, sem validação)

Dados que vêm diretamente das APIs sem interpretação AI. Não há risco de alucinação.

| Fonte | Tipo de dado | Exemplo |
|-------|-------------|---------|
| Google Calendar | Evento existe/não existe | "Reunião iPME 18h30" |
| Gmail | Email enviado/recebido | "Email para Sérgio às 14:22" |
| Google Drive | Ficheiro criado/modificado | "Documento de requisitos atualizado" |
| Discord | Mensagem escrita | "Bruno escreveu em #desenvolvimento" |
| Content Engine | Ficheiro de vídeo criado | "video-v8-final.mp4 criado" |

**Entrada:** Automática, sem badge, sem validação.
**Risco de erro:** Nulo (são factos da API).

#### Camada 2 — Dados extraídos por AI (Trust Score ativo, validação progressiva)

Tudo o que passa por interpretação do Claude Sonnet. Cada tipo de extração tem o seu Trust Score independente (0-100).

| Tipo de extração | Exemplo | Trust Score inicial |
|-----------------|---------|-------------------|
| Tarefas de calls | "Integrar TOC Online" extraída da transcrição | 0 |
| Decisões de calls | "Começar pelo TOC Online" | 0 |
| Resumos de calls | "Bruno apresentou protótipo funcional..." | 0 |
| Prioridade sugerida | "Alta — mencionado como urgente pelo Sérgio" | 0 |
| Classificação de tipo | "Esta call é sobre iPME Digital" | 0 |
| Atribuição de responsável | "Tarefa para Bruno" | 0 |
| Propostas de conteúdo (Scout) | "Momento forte: supersónico" | 0 |

**Ciclo de vida de um item extraído por AI:**

```
AI extrai item → Trust Score do tipo < 50?
  ├── SIM → Item entra com estado "por_confirmar"
  │         Badge amarelo + botões [Confirmar] [Editar] [Rejeitar]
  │         Aparece na secção "A validar" do dashboard
  │         └── Utilizador age:
  │             ├── Confirma sem editar → +2 pontos ao Trust Score
  │             ├── Edita e confirma → +0 pontos (correto com ajuste)
  │             └── Rejeita → -5 pontos (AI errou)
  │
  └── NÃO (Trust Score >= 50) → Item entra com estado "auto_confirmado"
            Ícone subtil de AI (🤖) no canto
            Aparece no feed normal
            └── Utilizador pode:
                ├── Ignorar (tudo OK) → +0.5 pontos
                ├── Corrigir → -3 pontos
                └── Reverter para "por_confirmar" → reset do Trust Score
```

**Thresholds:**

| Trust Score | Estado | Comportamento | Indicador visual |
|------------|--------|---------------|-----------------|
| 0-30 | Aprendizagem | Tudo requer confirmação explícita | Badge amarelo "Por confirmar" |
| 31-50 | Calibração | Confirmação necessária, mas itens de alta confiança individuais (>85%) podem auto-confirmar | Badge amarelo claro |
| 51-70 | Confiança | Auto-confirmado por defeito, notificação push para revisão | Ícone AI subtil |
| 71-90 | Autonomia | Auto-confirmado, sem notificação (visível no feed) | Nenhum (aparece como dado normal) |
| 91-100 | Pleno | Igual a dados factuais — só aparece nos logs | Nenhum |

**Regras de segurança:**

1. **Trust Score nunca sobe acima de 70 sem pelo menos 50 confirmações** — impedir auto-promoção prematura
2. **Trust Score decai 1 ponto por semana sem interação** — se o Miguel para de validar, o sistema volta a pedir validação (não assume que silêncio = aprovação)
3. **Trust Score é por tipo de extração, não global** — a AI pode ser boa a extrair tarefas mas má a atribuir prioridades
4. **Reset manual disponível** — o Miguel pode a qualquer momento resetar o Trust Score de um tipo para 0 (ex: se mudar o modelo AI)
5. **Nunca auto-confirmar dados financeiros** — valores, custos, facturação ficam sempre na Camada 2 com Trust Score máximo de 50 (sempre pedir confirmação)

#### Camada 3 — Dados manuais (entrada humana direta)

Informação que só o utilizador sabe e que a AI não consegue extrair.

| Tipo | Exemplo |
|------|---------|
| Notas pessoais | "O Sérgio pareceu hesitante sobre o prazo" |
| Contexto off-the-record | "Conversa informal no café — Sérgio quer avançar mas Nuno tem dúvidas" |
| Ajustes de prioridade | Mudar tarefa de "Média" para "Crítica" |
| Tarefas manuais | "Ligar ao informático da Casa Antunos" |
| Correções de factos | "A data da reunião era 28, não 27" |

**Entrada:** Botão "+" sempre disponível em qualquer vista. Campos: título, descrição, projeto, tipo.
**Validação:** Nenhuma — dados do utilizador são verdade por definição.

### Interface de validação

**Secção "A validar" no Dashboard principal:**

Quando existem itens pendentes de confirmação, aparece uma secção dedicada no mapa geral (entre os projetos e os alertas):

```
┌──────────────────────────────────────────────┐
│  🤖 A VALIDAR (5 itens)                      │
│                                              │
│  📋 "Integrar TOC Online" — tarefa?    [✓][✎][✗]│
│     Extraída da call 27 Mar · iPME Digital   │
│     Responsável sugerido: Bruno              │
│     Confiança: 78%                           │
│                                              │
│  📋 "Validar requisitos com Nuno" — tarefa?[✓][✎][✗]│
│     Extraída da call 30 Mar · iPME Digital   │
│     Responsável sugerido: Miguel             │
│     Confiança: 82%                           │
│                                              │
│  ✅ "Começar pelo TOC Online" — decisão? [✓][✎][✗]│
│     Extraída da call 27 Mar · iPME Digital   │
│     Confiança: 91%                           │
│                                              │
│  [Confirmar todos]  [Ver mais...]            │
└──────────────────────────────────────────────┘
```

**Ação rápida "Confirmar todos":** Para quando o Miguel revê e está tudo OK — um clique confirma todos os itens pendentes. Disponível apenas quando todos os itens têm confiança individual > 75%.

**No feed do Client Hub:** Itens "por confirmar" aparecem com borda tracejada amarela. Itens "auto-confirmados" com ícone AI subtil no canto. Itens factuais e manuais sem indicação.

### Modelo de dados adicional (Trust Score)

```sql
-- Trust Score por tipo de extração
CREATE TABLE trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_type VARCHAR(100) NOT NULL UNIQUE,  -- "tarefa", "decisao", "resumo", "prioridade", "responsavel", "conteudo"
  score INTEGER DEFAULT 0,                        -- 0-100
  total_confirmations INTEGER DEFAULT 0,
  total_edits INTEGER DEFAULT 0,
  total_rejections INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estado de validação em cada item extraído por AI
-- (adicionar às tabelas existentes: tasks, interactions, content_items)
-- Novos campos:
--   ai_extracted BOOLEAN DEFAULT FALSE         -- TRUE se extraído por AI
--   ai_confidence DECIMAL                      -- 0.0-1.0, confiança da extração individual
--   validation_status VARCHAR(20) DEFAULT 'pending'  -- 'pending', 'confirmed', 'edited', 'rejected', 'auto_confirmed'
--   validated_by UUID REFERENCES people(id)
--   validated_at TIMESTAMPTZ
--   original_data JSONB                        -- dados originais da AI (antes de edição)

ALTER TABLE tasks ADD COLUMN ai_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN ai_confidence DECIMAL;
ALTER TABLE tasks ADD COLUMN validation_status VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE tasks ADD COLUMN validated_by UUID REFERENCES people(id);
ALTER TABLE tasks ADD COLUMN validated_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN original_data JSONB;

ALTER TABLE interactions ADD COLUMN ai_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE interactions ADD COLUMN ai_confidence DECIMAL;
ALTER TABLE interactions ADD COLUMN validation_status VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE interactions ADD COLUMN validated_by UUID REFERENCES people(id);
ALTER TABLE interactions ADD COLUMN validated_at TIMESTAMPTZ;
ALTER TABLE interactions ADD COLUMN original_data JSONB;

ALTER TABLE content_items ADD COLUMN ai_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE content_items ADD COLUMN ai_confidence DECIMAL;
ALTER TABLE content_items ADD COLUMN validation_status VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE content_items ADD COLUMN validated_by UUID REFERENCES people(id);
ALTER TABLE content_items ADD COLUMN validated_at TIMESTAMPTZ;
ALTER TABLE content_items ADD COLUMN original_data JSONB;
```

### API de validação

```
GET /api/validation/pending
  → Itens pendentes de confirmação (para secção "A validar")

POST /api/validation/{item_type}/{item_id}/confirm
  → Confirmar item sem alterações. Atualiza Trust Score (+2)

POST /api/validation/{item_type}/{item_id}/edit
  body: { changes }
  → Confirmar com edições. Guarda original_data, aplica changes. Trust Score +0

POST /api/validation/{item_type}/{item_id}/reject
  → Rejeitar extração. Trust Score -5. Item removido ou arquivado

POST /api/validation/confirm-all
  → Confirmar todos os pendentes com confiança > 75%

GET /api/trust-scores
  → Trust Scores atuais por tipo de extração

POST /api/trust-scores/{type}/reset
  → Resetar Trust Score de um tipo para 0
```

### Cron de decaimento

```
Job: trust-score-decay
Frequência: Semanal (domingo 03:00)
Ação: Para cada tipo de extração sem interação há 7+ dias, reduzir Trust Score em 1 ponto
Mínimo: Nunca abaixo de 0
Log: Registar decaimento no sync_log
```

---

## 3. MODELO DE DADOS

### 3.1 Entidades principais

```sql
-- Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,           -- "AURA PMS", "iPME Digital"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "aura-pms", "ipme-digital"
  type VARCHAR(50) NOT NULL,            -- "interno", "cliente"
  status VARCHAR(50) DEFAULT 'ativo',   -- "ativo", "pausado", "concluido"
  health VARCHAR(20) DEFAULT 'green',   -- "green", "yellow", "red"
  progress INTEGER DEFAULT 0,           -- 0-100
  description TEXT,
  color VARCHAR(7),                     -- cor hex para UI (#378ADD)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fases de projeto (para timeline/gantt)
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name VARCHAR(200) NOT NULL,           -- "Foundation", "Conectividade"
  description TEXT,
  phase_order INTEGER NOT NULL,         -- 1, 2, 3...
  status VARCHAR(50) DEFAULT 'pendente', -- "pendente", "em_curso", "concluida"
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objetivos anuais/trimestrais
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,          -- "Facturar 1M€ em 2026"
  target_value DECIMAL,                 -- 1000000
  current_value DECIMAL DEFAULT 0,      -- 120000
  unit VARCHAR(50),                     -- "€", "propriedades", "%"
  deadline DATE,
  project_id UUID REFERENCES projects(id), -- NULL = objectivo geral
  status VARCHAR(50) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pessoas (equipa + stakeholders)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(300),
  role VARCHAR(200),                    -- "Co-fundador", "Contabilista"
  type VARCHAR(50) NOT NULL,            -- "equipa", "cliente", "parceiro"
  avatar_color VARCHAR(7),              -- cor para iniciais
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  area_id UUID REFERENCES areas(id),     -- área operacional (RH, Operações, etc.) — alternativa a project_id para tarefas contínuas
  phase_id UUID REFERENCES project_phases(id),
  assignee_id UUID REFERENCES people(id),
  status VARCHAR(50) DEFAULT 'backlog', -- "backlog", "a_fazer", "em_curso", "em_revisao", "feito"
  priority VARCHAR(20) DEFAULT 'media', -- "critica", "alta", "media", "baixa"
  origin VARCHAR(100),                  -- "call", "discord", "manual", "briefing", "email"
  origin_date DATE,                     -- data da call/mensagem que gerou a tarefa
  origin_ref TEXT,                      -- referência (ID da call, link Discord, etc.)
  deadline DATE,
  completed_at TIMESTAMPTZ,
  days_stale INTEGER DEFAULT 0,         -- calculado: dias sem movimento
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes (para Client Hub)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(300) NOT NULL,   -- "Fiscomelres / iPME"
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) DEFAULT 'ativo',   -- "lead", "negociacao", "ativo", "churned"
  last_interaction_at TIMESTAMPTZ,
  days_since_contact INTEGER DEFAULT 0, -- calculado
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contactos do cliente
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  person_id UUID REFERENCES people(id),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed de interações (Client Hub)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  type VARCHAR(50) NOT NULL,            -- "call", "email", "decisao", "documento", "tarefa", "nota"
  title VARCHAR(500) NOT NULL,
  body TEXT,                            -- resumo/conteúdo
  source VARCHAR(100),                  -- "google_meet", "gmail", "discord", "manual", "drive"
  source_ref TEXT,                      -- link/ID da fonte original
  participants UUID[],                  -- IDs das pessoas envolvidas
  interaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,            -- "tarefa_atrasada", "cliente_sem_contacto", "objectivo_risco", "aprovacao_pendente"
  severity VARCHAR(20) DEFAULT 'warning', -- "info", "warning", "critical"
  title VARCHAR(500) NOT NULL,
  description TEXT,
  related_task_id UUID REFERENCES tasks(id),
  related_project_id UUID REFERENCES projects(id),
  related_client_id UUID REFERENCES clients(id),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline de conteúdo
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,          -- "Vídeo: Supersónico"
  format VARCHAR(50),                   -- "avatar_ai", "mixed", "call_broll"
  status VARCHAR(50) DEFAULT 'proposta', -- "proposta", "aprovado", "em_producao", "pronto", "publicado"
  source_call_date DATE,
  source_call_ref TEXT,                 -- ID da call
  script_path TEXT,                     -- path no filesystem
  video_path TEXT,                      -- path ou Drive ID
  platform VARCHAR(100),               -- "linkedin", "instagram", "tiktok"
  approved_by UUID REFERENCES people(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log (para debug e auditoria)
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL,         -- "google_drive", "discord", "gmail"
  action VARCHAR(100) NOT NULL,         -- "sync_calls", "extract_tasks", "import_emails"
  status VARCHAR(50) NOT NULL,          -- "success", "error", "partial"
  items_processed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- WORKFLOWS & ÁREAS OPERACIONAIS
-- Preparação para escala: processos repetíveis
-- ═══════════════════════════════════════════════

-- Áreas operacionais (contínuas, sem fim — vs. projetos que têm fim)
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,            -- "Recursos Humanos", "Operações", "Financeiro"
  slug VARCHAR(100) UNIQUE NOT NULL,     -- "rh", "operacoes", "financeiro"
  description TEXT,
  color VARCHAR(7),                      -- cor hex para UI
  icon VARCHAR(50),                      -- ícone (ex: "users", "cog", "briefcase")
  owner_id UUID REFERENCES people(id),   -- responsável da área
  status VARCHAR(50) DEFAULT 'ativo',    -- "ativo", "inativo"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de workflow (sequências reutilizáveis de tarefas)
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,            -- "Onboarding novo colaborador"
  slug VARCHAR(100) UNIQUE NOT NULL,     -- "onboarding-colaborador"
  description TEXT,                      -- "Processo de integração de novos membros da equipa"
  area_id UUID REFERENCES areas(id),     -- área a que pertence (RH, Operações, etc.)
  project_id UUID REFERENCES projects(id), -- OU projeto (para workflows específicos de projeto)
  trigger_type VARCHAR(50) DEFAULT 'manual', -- "manual", "evento", "recorrente"
  trigger_config JSONB,                  -- config do trigger (ex: {"recurrence": "monthly", "day": 1})
  estimated_duration_days INTEGER,       -- duração estimada do workflow completo
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,            -- versionamento do template
  created_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Passos do template (cada passo → gera uma tarefa quando instanciado)
CREATE TABLE workflow_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,           -- 1, 2, 3...
  title VARCHAR(500) NOT NULL,           -- "Criar conta no sistema"
  description TEXT,                      -- instruções detalhadas
  default_assignee_role VARCHAR(100),    -- "manager", "rh", "admin", "mentor" (resolve para pessoa real na instanciação)
  default_assignee_id UUID REFERENCES people(id), -- OU pessoa fixa
  relative_deadline_days INTEGER,        -- prazo relativo ao início (ex: 1 = dia 1, 7 = dia 7, 30 = dia 30)
  priority VARCHAR(20) DEFAULT 'media',
  depends_on INTEGER[],                  -- step_orders de que depende (ex: [1, 2] = só começa quando passos 1 e 2 estiverem feitos)
  is_optional BOOLEAN DEFAULT FALSE,     -- passos opcionais podem ser saltados
  checklist JSONB,                       -- sub-items dentro do passo (ex: ["Enviar email boas-vindas", "Partilhar manual"])
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instâncias de workflow (quando alguém "corre" um template)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  name VARCHAR(500) NOT NULL,            -- "Onboarding — Ana Silva" (nome gerado ou personalizado)
  context JSONB,                         -- dados variáveis (ex: {"colaborador": "Ana Silva", "cargo": "Dev Frontend", "data_entrada": "2026-06-01"})
  status VARCHAR(50) DEFAULT 'em_curso', -- "em_curso", "concluido", "cancelado", "pausado"
  progress INTEGER DEFAULT 0,            -- 0-100 (calculado: passos feitos / total)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  started_by UUID REFERENCES people(id),
  project_id UUID REFERENCES projects(id),   -- projeto associado (se aplicável)
  area_id UUID REFERENCES areas(id),         -- área associada (se aplicável)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas geradas pelo workflow (ligação entre instância e tarefas reais)
CREATE TABLE workflow_instance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_template_steps(id),
  task_id UUID REFERENCES tasks(id),     -- tarefa real na tabela tasks
  step_order INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente', -- espelha task.status + "bloqueado" (dependências)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Índices recomendados

```sql
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_interactions_project ON interactions(project_id);
CREATE INDEX idx_interactions_client ON interactions(client_id);
CREATE INDEX idx_interactions_date ON interactions(interaction_date DESC);
CREATE INDEX idx_alerts_dismissed ON alerts(is_dismissed) WHERE is_dismissed = FALSE;
CREATE INDEX idx_content_status ON content_items(status);
CREATE INDEX idx_workflow_templates_area ON workflow_templates(area_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX idx_workflow_instance_tasks_instance ON workflow_instance_tasks(instance_id);
CREATE INDEX idx_areas_status ON areas(status);
```

---

## 4. VISTAS DA APLICAÇÃO

### 4.1 Vista principal — Mapa Geral (Home)

**URL:** `/`

**Descrição:** O mapa de missão. Abre e num segundo percebes o estado de tudo.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  COMMAND CENTER                    [Miguel] ⚙️   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──── AURA PMS ────┐  ┌── iPME Digital ──┐   │
│  │ MVP em dev        │  │ Negociação       │   │
│  │ ████░░░░░░ 30%   │  │ █████░░░░░ 50%  │   │
│  │ 5 tarefas ativas  │  │ 3 tarefas ativas │   │
│  │ 🟢 A progredir    │  │ 🟡 Atenção       │   │
│  └───────────────────┘  └──────────────────┘   │
│                                                 │
│  ┌──────── OBJETIVOS 2026 ──────────────┐      │
│  │  1M€: 12%  │  50 props: 0%  │  iPME: 50% │  │
│  └──────────────────────────────────────┘      │
│                                                 │
│  ┌─Calls─┐ ┌─Conteúdo─┐ ┌─Discord─┐ ┌─Cal──┐  │
│  │3 esta │ │1 pronto  │ │12 msgs │ │2 hoje│  │
│  │semana │ │2 p/aprov │ │0 pend. │ │daily │  │
│  └───────┘ └──────────┘ └────────┘ └──────┘  │
│                                                 │
│  🤖 A VALIDAR (5 itens)                        │
│  ┌──────────────────────────────────────────┐  │
│  │ "Integrar TOC Online" — tarefa? [✓][✎][✗]│  │
│  │ "Validar req. com Nuno" — tar.? [✓][✎][✗]│  │
│  │ [Confirmar todos]  [Ver mais...]         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ⚠️ ATENÇÃO                                     │
│  • "Fechar proposta iPME" — parada há 3 dias   │
│  • "Criar servidor Discord" — sem prazo        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Componentes React:**

- `<ProjectCard>` — bloco de projeto com nome, progresso, saúde, contagem de tarefas. Clicável → navega para `/project/{slug}`
- `<ObjectivesBar>` — barra com barras de progresso dos objetivos. Clicável → navega para `/objectives`
- `<SatelliteCard>` — blocos pequenos (Calls, Conteúdo, Discord, Calendar) com contadores em tempo real
- `<ValidationPanel>` — secção "A validar" com itens extraídos por AI pendentes de confirmação. Mostra confiança %, botões confirmar/editar/rejeitar, e ação "Confirmar todos" (só quando todos >75%)
- `<AlertsPanel>` — zona inferior com itens que precisam de atenção. Cor amarela/vermelha conforme severidade
- `<FlowLines>` — linhas SVG opcionais que ligam os satélites aos projetos (decorativo, mostra fluxo de dados)

**Dados necessários (API):**

```
GET /api/dashboard
→ {
    projects: [{ id, name, slug, progress, health, active_tasks, overdue_tasks }],
    objectives: [{ id, title, target_value, current_value, unit, deadline }],
    satellites: {
      calls: { this_week: 3, pending_transcription: 2 },
      content: { ready: 1, pending_approval: 2, in_production: 0 },
      discord: { messages_today: 12, pending_decisions: 0 },
      calendar: { meetings_today: 2, next_meeting: "Daily 18h30" }
    },
    validation: {
      pending_count: 5,
      items: [{ id, type, title, project, confidence, extraction_type }],
      trust_scores: { tarefa: 35, decisao: 12, resumo: 45, prioridade: 8 }
    },
    alerts: [{ id, type, severity, title, description, related_project }]
  }
```

### 4.2 Vista de Projeto — Detalhe

**URL:** `/project/{slug}` (ex: `/project/aura-pms`)

**Descrição:** Detalhe completo de um projeto. 4 separadores.

#### Separador 1: Kanban

**Colunas:** Backlog → A Fazer → Em Curso → Em Revisão → Feito

**Cada cartão de tarefa mostra:**
- Título (máx. 2 linhas)
- Badge de prioridade (Crítica = vermelho, Alta = laranja, Média = amarelo, Baixa = verde)
- Avatar do responsável (iniciais com cor)
- Origem (call, discord, manual, briefing) + data
- Indicador de "parada há X dias" (se > 2 dias sem movimento)

**Funcionalidades:**
- Drag & drop entre colunas (atualiza status)
- Filtrar por: pessoa, prioridade, origem
- Criar tarefa manual (botão +)
- Clicar num cartão → modal com detalhe completo (descrição, histórico, links)

**API:**

```
GET /api/projects/{slug}/tasks?status=all
POST /api/tasks (criar)
PATCH /api/tasks/{id} (atualizar status, atribuir, etc.)
```

#### Separador 2: Timeline

**Tipo:** Gantt simplificado (horizontal)

**Mostra:**
- Fases do projeto em barras horizontais
- Fase atual destacada
- Marcos (milestones) como diamantes
- Data atual como linha vertical
- Progresso dentro de cada fase (barra preenchida)

**API:**

```
GET /api/projects/{slug}/phases
```

#### Separador 3: Fluxo

**Tipo:** Diagrama SVG interativo

**Mostra:** Como os dados entram e saem do projeto. Específico por projeto:

- **AURA PMS:** Calls → Transcrição → Extração AI → Kanban / Conteúdo → Publicação
- **iPME Digital:** Calls Sérgio → Requisitos → Desenvolvimento → Demo → Feedback

**API:** Estático por projeto (configurado no YAML/JSON do projeto)

#### Separador 4: Cliente (só para projetos tipo "cliente")

Ver secção 4.4 — Client Hub.

### 4.3 Vista de Objetivos

**URL:** `/objectives`

**Descrição:** Scorecard dos grandes goals.

**Para cada objetivo:**
- Barra de progresso grande (valor atual vs. target)
- Percentagem e valor absoluto
- Projeção: "a este ritmo, atinges X até Y" (cálculo linear simples)
- Indicador de saúde: 🟢 no ritmo / 🟡 ligeiramente atrasado / 🔴 em risco
- Mini-gráfico de evolução (últimas 4 semanas)
- Tarefas que contribuem para este objetivo

**Objetivos iniciais:**

| Objetivo | Target | Unidade | Deadline |
|----------|--------|---------|----------|
| Facturar 1M€ em 2026 | 1.000.000 | € | 31 Dez 2026 |
| AURA PMS: 50 propriedades | 50 | propriedades | Jul 2026 (M4) |
| iPME Digital: contrato fechado | 1 | contrato | Mai 2026 |

**API:**

```
GET /api/objectives
PATCH /api/objectives/{id} (atualizar current_value)
```

### 4.4 Client Hub — Feed de interações

**URL:** `/project/{slug}/client` (separador dentro do projeto)

**Descrição:** Historial completo da relação com o cliente. Tudo o que aconteceu, organizado cronologicamente.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  ← Vista geral          iPME Digital — Cliente  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─Empresa──┐ ┌─Contacto──┐ ┌─Estado───┐ ┌─Últ.─┐
│  │Fiscomelres│ │Sérgio G.  │ │Negociação│ │3 dias│
│  └──────────┘ └───────────┘ └──────────┘ └──────┘
│                                                 │
│  PRÓXIMOS PASSOS PENDENTES                      │
│  🔴 Fechar proposta — Miguel, antes desta semana│
│  🔵 Completar módulos 2-7 Canvas — Bruno        │
│  🔵 Validar requisitos legais — Miguel          │
│                                                 │
│  ┌─Feed──┐ ┌─Calls─┐ ┌─Decisões─┐ ┌─Docs──┐   │
│                                                 │
│  [Tudo] [Sérgio] [Nuno] [Bruno] [Márcia]       │
│                                                 │
│  30 Mar │ 📞 Call de requisitos                  │
│         │ Sérgio confirmou workflow...           │
│         │ [Sérgio] [Bruno] [Miguel] [Márcia]     │
│                                                 │
│  27 Mar │ ✅ Decisão: começar pelo TOC Online    │
│         │ Acordado com Sérgio que...             │
│                                                 │
│  27 Mar │ 📞 Demo protótipo — captura faturas    │
│         │ Bruno apresentou protótipo funcional...│
│         │ "supersónico" — Sérgio                 │
│                                                 │
│  25 Mar │ 📧 Email resumo enviado à equipa       │
│                                                 │
│  24 Mar │ 📄 Documento de requisitos criado      │
│                                                 │
│  24 Mar │ 📞 Primeira call de levantamento       │
│         │ Identificadas dores: matching manual...│
│                                                 │
└─────────────────────────────────────────────────┘
```

**Componentes React:**

- `<ClientInfoBar>` — empresa, contacto principal, estado, última interação
- `<NextStepsPanel>` — lista de ações pendentes com urgência. Vermelho = urgente, azul = normal
- `<FeedTabs>` — filtros por tipo (tudo, calls, decisões, docs)
- `<PeopleFilter>` — filtro por participante
- `<FeedItem>` — item individual do feed com ícone, tipo, título, corpo, tags de participantes, data
- `<FeedTimeline>` — lista vertical cronológica (mais recente em cima)

**Tipos de feed item:**

| Tipo | Ícone | Cor | Fonte automática |
|------|-------|-----|-----------------|
| call | 📞 C | Azul info | Transcrições no Drive → extração AI |
| email | 📧 E | Roxo | Gmail API — emails de/para contactos do cliente |
| decisao | ✅ D | Verde success | Extraído das transcrições pela AI |
| documento | 📄 F | Amarelo | Google Drive — ficheiros na pasta do projeto |
| tarefa | 📋 T | Coral | Tarefas criadas com referência ao cliente |
| nota | 📝 N | Cinza | Entrada manual pelo utilizador |

**Como o feed é alimentado automaticamente:**

1. **Calls:** O Scout (cron 21h) transcreve calls novas. A AI extrai: resumo, decisões, tarefas, participantes. Cada item é inserido na tabela `interactions` com type="call", type="decisao", etc.

2. **Emails:** Sync Gmail a cada 30 min. Filtra emails onde remetente/destinatário é um contacto do cliente. Insere como type="email" com subject como título e snippet como body.

3. **Documentos:** Sync Drive a cada hora. Monitoriza pastas de projeto (ex: iPME Digital folder ID: `1MyRMePHuk3BzcLYAMN3Ksjbi9JcmIQPC`). Ficheiros novos/modificados geram entrada type="documento".

4. **Notas manuais:** Botão "+ Nota" no feed para o utilizador adicionar observações.

**API:**

```
GET /api/projects/{slug}/client
→ { client_info, next_steps, feed_items }

GET /api/projects/{slug}/interactions?type=call&person=sergio
→ { items: [...], total: 15, page: 1 }

POST /api/projects/{slug}/interactions (nota manual)
```

### 4.5 Vista de Conteúdo

**URL:** `/content`

**Descrição:** Pipeline visual do content engine.

**Layout tipo Kanban com colunas:**
- Proposta (Scout detectou momento forte)
- Aprovado (Miguel aprovou para produção)
- Em Produção (Editor a produzir vídeo)
- Pronto (vídeo finalizado, aguarda OK para publicar)
- Publicado (com data e plataforma)

**Cada cartão mostra:**
- Título/hook do vídeo
- Formato (A: Avatar, B: Mixed, C: Call+B-roll)
- Data da call original
- Plataforma alvo
- Thumbnail (se disponível)

**API:**

```
GET /api/content?status=all
PATCH /api/content/{id} (aprovar, mover estado)
```

### 4.6 Vista de Workflows — Processos reutilizáveis

**URL:** `/workflows`

**Descrição:** Biblioteca de workflows (processos repetíveis) e instâncias ativas. Dois modos: gestão de templates e acompanhamento de execuções.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  WORKFLOWS                           [+ Novo]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─Templates─┐  ┌─Em curso─┐  ┌─Concluídos─┐  │
│                                                 │
│  EM CURSO (3)                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔄 Onboarding — Ana Silva               │   │
│  │    RH · 5/8 passos · 62%                 │   │
│  │    ████████░░░░ Próximo: Revisão 30 dias │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔄 Setup projeto — Cliente Novo X        │   │
│  │    Operações · 2/5 passos · 40%          │   │
│  │    ████░░░░░░ Próximo: Configurar Drive  │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔄 Fecho mensal — Março 2026             │   │
│  │    Financeiro · 1/6 passos · 16%         │   │
│  │    ██░░░░░░░░ Próximo: Reconciliação     │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  TEMPLATES (biblioteca)                         │
│  ┌──────────────────────────────────────────┐   │
│  │ 📋 Onboarding novo colaborador    8 passos│  │
│  │    RH · ~30 dias · Usado 0x    [Iniciar] │   │
│  ├──────────────────────────────────────────┤   │
│  │ 📋 Setup novo projeto cliente     5 passos│  │
│  │    Operações · ~5 dias · Usado 1x [Iniciar]│ │
│  ├──────────────────────────────────────────┤   │
│  │ 📋 Fecho mensal contabilidade    6 passos │  │
│  │    Financeiro · ~5 dias · Recorrente [Iniciar]│
│  └──────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Separador "Templates":**

Lista todos os templates de workflow disponíveis. Cada template mostra:
- Nome e descrição
- Área a que pertence (RH, Operações, Financeiro, etc.)
- Número de passos
- Duração estimada
- Quantas vezes foi usado
- Tipo de trigger (manual, recorrente, evento)
- Botão "Iniciar" (cria nova instância)
- Botão "Editar" (modificar template)

**Criar/editar template:**

Modal ou página dedicada com:
- Nome e descrição do workflow
- Área associada
- Lista de passos (ordenáveis por drag & drop):
  - Título do passo
  - Descrição / instruções
  - Responsável por defeito (pessoa fixa ou role: "manager", "rh", "mentor")
  - Prazo relativo (dia 1, dia 3, dia 7, dia 30)
  - Dependências (só começa quando passo X estiver feito)
  - Checklist interno (sub-items dentro do passo)
  - Opcional (pode ser saltado)
- Tipo de trigger:
  - Manual: alguém clica "Iniciar"
  - Recorrente: corre automaticamente (ex: primeiro dia de cada mês)
  - Evento: disparado por ação no sistema (ex: novo projeto criado → setup automático)

**Separador "Em curso":**

Lista instâncias ativas com barra de progresso. Cada instância mostra:
- Nome (ex: "Onboarding — Ana Silva")
- Área e template de origem
- Progresso (X/Y passos, percentagem)
- Próximo passo pendente
- Quem é responsável pelo próximo passo
- Há quanto tempo está parado (se aplicável)

**Clique numa instância → vista de detalhe:**

```
┌─────────────────────────────────────────────────┐
│  ← Workflows    Onboarding — Ana Silva          │
│  RH · Iniciado 1 Jun 2026 · 62%                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✅ 1. Criar conta no sistema           Dia 1  │
│     Bruno · Concluído 1 Jun                     │
│                                                 │
│  ✅ 2. Dar acessos (email, Drive, Discord) Dia 1│
│     Bruno · Concluído 1 Jun                     │
│                                                 │
│  ✅ 3. Atribuir mentor                   Dia 1  │
│     Miguel · Concluído 1 Jun                    │
│                                                 │
│  ✅ 4. Enviar manual de boas-vindas      Dia 1  │
│     RH · Concluído 2 Jun                        │
│                                                 │
│  ✅ 5. Agendar formação inicial          Dia 3  │
│     Mentor · Concluído 3 Jun                    │
│                                                 │
│  🔵 6. Revisão primeira semana           Dia 7  │
│     Miguel · Prazo: 8 Jun                       │
│                                                 │
│  ⬜ 7. Feedback 360°                    Dia 14  │
│     RH · Bloqueado (depende de 6)               │
│                                                 │
│  ⬜ 8. Revisão 30 dias                  Dia 30  │
│     Miguel · Bloqueado (depende de 7)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Componentes React:**

- `<WorkflowTemplateList>` — lista de templates com filtro por área
- `<WorkflowTemplateEditor>` — criar/editar template com drag & drop de passos
- `<WorkflowStepEditor>` — formulário de cada passo (título, responsável, prazo, dependências, checklist)
- `<WorkflowInstanceCard>` — cartão com progresso de uma instância ativa
- `<WorkflowInstanceDetail>` — vista de detalhe com todos os passos e estado
- `<WorkflowStartModal>` — modal para iniciar um workflow (preencher variáveis de contexto: nome da pessoa, cargo, etc.)

**Como os workflows geram tarefas:**

Quando uma instância é criada (alguém clica "Iniciar" ou um trigger automático dispara):

1. O sistema lê os passos do template
2. Para cada passo, cria uma tarefa real na tabela `tasks` com:
   - `title` = título do passo
   - `description` = descrição + checklist
   - `assignee_id` = pessoa resolvida (do role ou da pessoa fixa)
   - `deadline` = data de início da instância + `relative_deadline_days`
   - `project_id` ou `area_id` = conforme o template
   - `status` = "a_fazer" se não tem dependências, "backlog" se tem dependências pendentes
3. Regista a ligação na tabela `workflow_instance_tasks`
4. Quando uma tarefa do workflow é concluída, o sistema verifica se as dependências dos próximos passos estão satisfeitas → se sim, move-os para "a_fazer"
5. Quando todos os passos estão concluídos → instância marcada como "concluido"

As tarefas geradas por workflows aparecem normalmente no Kanban — com um badge extra que indica "Workflow: Onboarding Ana" para contexto. Isto significa que o Kanban mostra tudo junto (tarefas de projeto + tarefas de workflow + tarefas manuais) e os filtros permitem separar.

**API:**

```
GET    /api/workflows/templates
  → Lista de templates

POST   /api/workflows/templates
  body: { name, description, area_id, steps: [...], trigger_type, trigger_config }
  → Criar template

PATCH  /api/workflows/templates/{id}
  → Editar template (cria nova versão)

GET    /api/workflows/instances
  ?status=em_curso  &area=rh  &template=onboarding
  → Instâncias filtradas

POST   /api/workflows/instances
  body: { template_id, name, context: { colaborador: "Ana Silva", ... } }
  → Iniciar workflow (cria instância + tarefas)

GET    /api/workflows/instances/{id}
  → Detalhe da instância com todos os passos e estado

PATCH  /api/workflows/instances/{id}
  body: { status }
  → Pausar/cancelar instância
```

### 4.7 Vista de Áreas Operacionais

**URL:** `/areas` (e `/area/{slug}`)

**Descrição:** Áreas contínuas da empresa (vs. projetos que têm fim). Cada área tem os seus workflows, tarefas recorrentes e pessoas.

**Na vista principal (Mapa Geral):**

Além dos blocos de projetos, o mapa mostra uma secção de áreas operacionais quando existirem:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  PROJETOS                                       │
│  ┌──── AURA PMS ────┐  ┌── iPME Digital ──┐   │
│  │ ...               │  │ ...              │   │
│  └───────────────────┘  └──────────────────┘   │
│                                                 │
│  ÁREAS OPERACIONAIS                             │
│  ┌─── RH ───┐  ┌─ Operações ─┐  ┌─ Financeiro─┐│
│  │ 1 workflow│  │ 0 workflows │  │ 1 workflow  ││
│  │ 3 tarefas │  │ 2 tarefas   │  │ 5 tarefas   ││
│  └───────────┘  └─────────────┘  └─────────────┘│
│                                                 │
└─────────────────────────────────────────────────┘
```

**Vista de detalhe de uma área (`/area/{slug}`):**

Semelhante à vista de projeto, mas com separadores adaptados:
- **Tarefas** — Kanban com tarefas da área (filtro automático)
- **Workflows** — Templates e instâncias desta área
- **Pessoas** — Quem trabalha nesta área
- **Métricas** — Tarefas concluídas/mês, workflows executados, tempo médio de conclusão

**API:**

```
GET    /api/areas
  → Lista de áreas com contadores

GET    /api/areas/{slug}
  → Detalhe da área (tarefas, workflows, pessoas)

POST   /api/areas
  body: { name, description, color, owner_id }
  → Criar área

PATCH  /api/areas/{slug}
  → Editar área
```

---

## 5. SYNC ENGINE — Alimentação automática de dados

### 5.1 Arquitetura do Sync

```
┌─────────────────────────────────────┐
│         SYNC ENGINE (crons)         │
│                                     │
│  ┌──────────┐  ┌──────────────┐    │
│  │ Scheduler │  │ Task Queue   │    │
│  │ (node-   │  │ (Bull/Redis  │    │
│  │  cron)   │→ │  ou simples) │    │
│  └──────────┘  └──────┬───────┘    │
│                       │            │
│    ┌──────────────────┼────────┐   │
│    │                  │        │   │
│  ┌─┴──────┐  ┌───────┴──┐  ┌─┴─┐ │
│  │ Drive  │  │ Discord  │  │...│ │
│  │ Sync   │  │ Sync     │  │   │ │
│  └────────┘  └──────────┘  └───┘ │
│                                   │
└───────────────────────────────────┘
```

### 5.2 Jobs de sincronização

| Job | Frequência | Fonte | Ação |
|-----|-----------|-------|------|
| `sync-drive-calls` | A cada hora | Google Drive (Meet Recordings) | Detectar calls novas, registar para transcrição |
| `sync-drive-docs` | A cada hora | Google Drive (pastas de projeto) | Detectar docs novos/modificados, inserir no feed |
| `sync-gmail` | A cada 30 min | Gmail API | Buscar emails de/para contactos de clientes |
| `sync-calendar` | A cada 15 min | Google Calendar | Importar reuniões, deadlines, criar alertas |
| `sync-discord` | Tempo real (webhook) | Discord Bot | Capturar mensagens relevantes, decisões, tarefas |
| `sync-content-engine` | A cada hora | Filesystem (content-engine/) | Verificar propostas, estados de vídeos |
| `extract-tasks-from-calls` | Após transcrição | Transcrição AI (Claude Sonnet) | Extrair tarefas, decisões, compromissos das calls |
| `calculate-alerts` | A cada hora | Base de dados interna | Gerar alertas (tarefas atrasadas, clientes sem contacto, etc.) |
| `calculate-projections` | Diário (7h) | Base de dados interna | Recalcular projeções de objetivos |
| `sync-google-sheet` | A cada hora | Google Sheet (bi-direcional) | Sincronizar com Painel-Tarefas-Empresa existente |

### 5.3 Extração AI de calls

**Prompt para extração (enviado ao Claude Sonnet após transcrição):**

```
Contexto: Empresa de software com 2 sócios (Miguel e Bruno).
Projetos ativos: {lista de projetos ativos}
Clientes: {lista de clientes e contactos}
Objetivos: {lista de objetivos}

Transcrição da call ({data}, {participantes}):
{transcrição}

Extrai e devolve em JSON:

1. RESUMO — 3-5 frases com os pontos principais
2. TAREFAS — para cada: título, descrição, responsável, prazo (se mencionado), projeto, prioridade estimada
3. DECISÕES — para cada: o que foi decidido, por quem, impacto, projeto
4. COMPROMISSOS — reuniões agendadas, follow-ups prometidos
5. FRASES_FORTES — citações relevantes para conteúdo (com falante e timestamp aprox.)
6. TIPO_CALL — "interna" ou "cliente" + nome do cliente se aplicável

Para cada item, indica o timestamp aproximado e o falante.
```

**Schema de resposta:**

```json
{
  "resumo": "...",
  "tipo": "cliente",
  "cliente": "iPME Digital",
  "tarefas": [
    {
      "titulo": "...",
      "descricao": "...",
      "responsavel": "Bruno",
      "prazo": "2026-04-15",
      "projeto": "ipme-digital",
      "prioridade": "alta",
      "timestamp": "12:34",
      "falante": "Sérgio"
    }
  ],
  "decisoes": [
    {
      "titulo": "...",
      "descricao": "...",
      "decidido_por": ["Sérgio", "Bruno"],
      "projeto": "ipme-digital",
      "timestamp": "15:20"
    }
  ],
  "compromissos": [...],
  "frases_fortes": [...]
}
```

### 5.4 Regras de alertas

| Condição | Tipo de alerta | Severidade |
|----------|---------------|------------|
| Tarefa pendente há 2+ dias | `tarefa_atrasada` | warning |
| Tarefa pendente há 5+ dias | `tarefa_atrasada` | critical |
| Tarefa sem prazo há 5+ dias | `tarefa_sem_prazo` | info |
| Cliente sem interação há 5+ dias | `cliente_sem_contacto` | warning |
| Cliente sem interação há 10+ dias | `cliente_sem_contacto` | critical |
| Objetivo com progresso < esperado (linear) | `objectivo_risco` | warning |
| Conteúdo aguardando aprovação há 3+ dias | `aprovacao_pendente` | info |
| Pessoa com 10+ tarefas ativas | `sobrecarga` | warning |
| Fase de projeto sem tarefas | `fase_sem_planeamento` | info |

---

## 6. API — Endpoints completos

### 6.1 Dashboard

```
GET /api/dashboard
  → Dados agregados para a vista principal (mapa geral)

GET /api/dashboard/satellites
  → Contadores dos satélites (calls, conteúdo, discord, calendar)
```

### 6.2 Projetos

```
GET    /api/projects
  → Lista de todos os projetos

GET    /api/projects/{slug}
  → Detalhe de um projeto (info + fases + stats)

GET    /api/projects/{slug}/tasks
  ?status=a_fazer,em_curso  &assignee=miguel  &priority=alta
  → Tarefas filtradas (para Kanban)

GET    /api/projects/{slug}/phases
  → Fases do projeto (para timeline)

GET    /api/projects/{slug}/client
  → Info do cliente + próximos passos + último feed

GET    /api/projects/{slug}/interactions
  ?type=call  &person_id=uuid  &page=1  &limit=20
  → Feed de interações paginado e filtrado
```

### 6.3 Tarefas

```
GET    /api/tasks
  ?project=aura-pms  &assignee=miguel  &status=em_curso
  → Tarefas globais filtradas

POST   /api/tasks
  body: { title, project_id, assignee_id, priority, deadline, description }
  → Criar tarefa manual

PATCH  /api/tasks/{id}
  body: { status?, priority?, assignee_id?, deadline? }
  → Atualizar tarefa (inclui drag & drop no Kanban)

DELETE /api/tasks/{id}
  → Arquivar tarefa
```

### 6.4 Objetivos

```
GET    /api/objectives
  → Todos os objetivos com progresso e projeção

PATCH  /api/objectives/{id}
  body: { current_value }
  → Atualizar progresso
```

### 6.5 Conteúdo

```
GET    /api/content
  ?status=proposta,aprovado
  → Pipeline de conteúdo

PATCH  /api/content/{id}
  body: { status }
  → Mover estado (aprovar, publicar, etc.)
```

### 6.6 Alertas

```
GET    /api/alerts
  ?dismissed=false
  → Alertas ativos

PATCH  /api/alerts/{id}/dismiss
  → Dispensar alerta
```

### 6.7 Sync

```
POST   /api/sync/trigger/{job}
  → Forçar execução de um job de sync (ex: sync-gmail)

GET    /api/sync/status
  → Estado dos últimos syncs (último run, erros, etc.)
```

---

## 7. COMPONENTES REACT — Guia de implementação

### 7.1 Estrutura de pastas

```
app/
├── page.tsx                    # Dashboard (mapa geral)
├── layout.tsx                  # Layout global (sidebar + topbar)
├── objectives/
│   └── page.tsx                # Vista de objetivos
├── content/
│   └── page.tsx                # Pipeline de conteúdo
├── workflows/
│   └── page.tsx                # Biblioteca de workflows + instâncias
├── area/
│   └── [slug]/
│       └── page.tsx            # Detalhe de uma área operacional
├── project/
│   └── [slug]/
│       ├── page.tsx            # Detalhe do projeto (Kanban default)
│       └── client/
│           └── page.tsx        # Client Hub (feed)
├── api/
│   ├── dashboard/
│   │   └── route.ts
│   ├── projects/
│   │   └── [slug]/
│   │       ├── route.ts
│   │       ├── tasks/
│   │       │   └── route.ts
│   │       ├── phases/
│   │       │   └── route.ts
│   │       └── interactions/
│   │           └── route.ts
│   ├── tasks/
│   │   └── route.ts
│   ├── objectives/
│   │   └── route.ts
│   ├── content/
│   │   └── route.ts
│   ├── alerts/
│   │   └── route.ts
│   ├── validation/
│   │   └── route.ts
│   ├── trust-scores/
│   │   └── route.ts
│   └── sync/
│       └── route.ts
components/
├── dashboard/
│   ├── project-card.tsx
│   ├── objectives-bar.tsx
│   ├── satellite-card.tsx
│   ├── validation-panel.tsx
│   ├── alerts-panel.tsx
│   └── flow-lines.tsx
├── kanban/
│   ├── kanban-board.tsx
│   ├── kanban-column.tsx
│   ├── task-card.tsx
│   └── task-detail-modal.tsx
├── timeline/
│   ├── gantt-chart.tsx
│   └── phase-bar.tsx
├── client/
│   ├── client-info-bar.tsx
│   ├── next-steps-panel.tsx
│   ├── feed-timeline.tsx
│   ├── feed-item.tsx
│   └── people-filter.tsx
├── content/
│   ├── content-pipeline.tsx
│   └── content-card.tsx
├── validation/
│   ├── validation-item.tsx
│   ├── validation-actions.tsx
│   ├── trust-score-badge.tsx
│   └── trust-score-settings.tsx
├── workflows/
│   ├── workflow-template-list.tsx
│   ├── workflow-template-editor.tsx
│   ├── workflow-step-editor.tsx
│   ├── workflow-instance-card.tsx
│   ├── workflow-instance-detail.tsx
│   └── workflow-start-modal.tsx
├── areas/
│   ├── area-card.tsx
│   └── area-detail.tsx
├── shared/
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── progress-bar.tsx
│   ├── health-indicator.tsx
│   ├── ai-confidence-badge.tsx
│   └── date-relative.tsx
lib/
├── db.ts                       # Conexão PostgreSQL (Drizzle ORM ou Prisma)
├── sync/
│   ├── drive.ts                # Sync Google Drive
│   ├── gmail.ts                # Sync Gmail
│   ├── calendar.ts             # Sync Calendar
│   ├── discord.ts              # Sync Discord
│   ├── content-engine.ts       # Sync Content Engine
│   └── extract-ai.ts           # Extração AI de calls
├── alerts.ts                   # Motor de alertas
├── trust-score.ts              # Motor de Trust Score (cálculo, decaimento, thresholds)
└── projections.ts              # Cálculo de projeções
```

### 7.2 Componentes-chave (pseudo-código)

**ProjectCard:**

```tsx
// Bloco de projeto na vista principal
interface ProjectCardProps {
  name: string;
  slug: string;
  progress: number;
  health: 'green' | 'yellow' | 'red';
  activeTasks: number;
  overdueTasks: number;
  type: 'interno' | 'cliente';
  color: string;
}

// Mostra: nome, barra de progresso, indicador de saúde, contadores
// Clique: navega para /project/{slug}
// Se overdueTasks > 0: badge vermelho no canto
```

**TaskCard (Kanban):**

```tsx
interface TaskCardProps {
  id: string;
  title: string;
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  assignee: { name: string; initials: string; color: string };
  origin: string;
  originDate: string;
  daysStale: number;
  deadline?: string;
  // Trust Score fields
  aiExtracted: boolean;
  aiConfidence?: number;        // 0.0-1.0
  validationStatus: 'confirmed' | 'pending' | 'auto_confirmed' | 'edited';
}

// Draggable (react-beautiful-dnd ou @dnd-kit/core)
// Se daysStale >= 2: borda laranja
// Se daysStale >= 5: borda vermelha
// Se aiExtracted && validationStatus === 'pending': borda tracejada amarela + badge "Por confirmar"
// Se aiExtracted && validationStatus === 'auto_confirmed': ícone AI subtil no canto
// Clique: abre TaskDetailModal
```

**FeedItem (Client Hub):**

```tsx
interface FeedItemProps {
  type: 'call' | 'email' | 'decisao' | 'documento' | 'tarefa' | 'nota';
  title: string;
  body: string;
  date: string;
  participants: { name: string }[];
  sourceRef?: string; // link para fonte original
  // Trust Score fields
  aiExtracted: boolean;
  aiConfidence?: number;
  validationStatus: 'confirmed' | 'pending' | 'auto_confirmed' | 'edited' | 'manual';
}

// Ícone e cor conforme tipo
// Participantes como tags
// Se aiExtracted && validationStatus === 'pending': borda tracejada amarela + botões [✓][✎][✗]
// Se aiExtracted && validationStatus === 'auto_confirmed': ícone AI subtil
// Se validationStatus === 'manual': sem indicação (dado do utilizador)
// Clique no sourceRef abre a fonte (Drive doc, email, etc.)
```

---

## 8. AUTENTICAÇÃO E PERMISSÕES

### 8.1 MVP (Fase 1)

- Login simples com Google OAuth (NextAuth.js)
- Whitelist de emails autorizados: `miguel@...`, `brunojtfontes@gmail.com`
- Sem roles diferenciados — ambos veem tudo

### 8.2 Fase 2 — Roles

| Role | Acesso |
|------|--------|
| `admin` | Tudo — criar projetos, gerir equipa, configurar integrações |
| `membro` | Ver e gerir tarefas dos seus projetos |
| `cliente` | Ver apenas o Client Hub do seu projeto (vista filtrada) |

### 8.3 Fase 3 — Multi-tenant (clientes externos)

- Cada cliente tem login próprio
- Vê apenas: seu projeto, seu feed, suas tarefas
- Não vê: outros projetos, dados financeiros, objetivos internos
- Implementação: middleware de tenant (similar ao AURA PMS)

---

## 9. DADOS INICIAIS (Seed)

### 9.1 Projetos

```json
[
  {
    "name": "AURA PMS",
    "slug": "aura-pms",
    "type": "interno",
    "status": "ativo",
    "health": "green",
    "progress": 30,
    "color": "#378ADD",
    "description": "Property Management System AI-native para gestores de alojamento local"
  },
  {
    "name": "iPME Digital",
    "slug": "ipme-digital",
    "type": "cliente",
    "status": "ativo",
    "health": "yellow",
    "progress": 50,
    "color": "#1D9E75",
    "description": "Software de gestão e automação contabilística para PMEs"
  },
  {
    "name": "Operações",
    "slug": "operacoes",
    "type": "interno",
    "status": "ativo",
    "health": "green",
    "progress": 0,
    "color": "#888780",
    "description": "Infraestrutura, admin, tooling interno"
  },
  {
    "name": "Conteúdo",
    "slug": "conteudo",
    "type": "interno",
    "status": "ativo",
    "health": "green",
    "progress": 0,
    "color": "#D85A30",
    "description": "Content engine — vídeos, posts, thought leadership"
  }
]
```

### 9.2 Pessoas

```json
[
  { "name": "Miguel Martins", "email": "...", "role": "Co-fundador, Gestão", "type": "equipa", "avatar_color": "#378ADD" },
  { "name": "Bruno Fontes", "email": "brunojtfontes@gmail.com", "role": "Co-fundador, CTO", "type": "equipa", "avatar_color": "#1D9E75" },
  { "name": "Sérgio Gonçalves", "email": "sergio.goncalves@fiscomelres.pt", "role": "Proprietário / Contabilidade", "type": "cliente", "avatar_color": "#534AB7" },
  { "name": "Nuno Gonçalves", "email": "nuno.goncalves@iniciativapme.pt", "role": "Proprietário / Salários", "type": "cliente", "avatar_color": "#D4537E" },
  { "name": "Márcia Costa", "email": "marcia.costa@fiscomelres.pt", "role": "Contabilidade", "type": "cliente", "avatar_color": "#BA7517" }
]
```

### 9.3 Fases AURA PMS

```json
[
  { "name": "Foundation", "phase_order": 1, "status": "em_curso", "progress": 30, "start_date": "2026-01-01", "end_date": "2026-03-31" },
  { "name": "Conectividade", "phase_order": 2, "status": "pendente", "progress": 0, "start_date": "2026-04-01", "end_date": "2026-05-31" },
  { "name": "UX e Operações", "phase_order": 3, "status": "pendente", "progress": 0, "start_date": "2026-06-01", "end_date": "2026-07-31" },
  { "name": "Portal Proprietários", "phase_order": 4, "status": "pendente", "progress": 0, "start_date": "2026-08-01", "end_date": "2026-09-30" },
  { "name": "AI Agents", "phase_order": 5, "status": "pendente", "progress": 0, "start_date": "2026-10-01", "end_date": "2026-10-31" }
]
```

### 9.4 Fases iPME Digital

```json
[
  { "name": "Levantamento de Requisitos", "phase_order": 1, "status": "em_curso", "progress": 50, "start_date": "2026-03-24", "end_date": "2026-04-15" },
  { "name": "Proposta e Contrato", "phase_order": 2, "status": "pendente", "progress": 0, "start_date": "2026-04-15", "end_date": "2026-05-01" },
  { "name": "Infraestrutura", "phase_order": 3, "status": "pendente", "progress": 0, "start_date": "2026-05-01", "end_date": "2026-05-15" },
  { "name": "M0 — Captura Documentos", "phase_order": 4, "status": "pendente", "progress": 0, "start_date": "2026-05-15", "end_date": "2026-06-30" },
  { "name": "M1 — Conferências", "phase_order": 5, "status": "pendente", "progress": 0, "start_date": "2026-07-01", "end_date": "2026-08-31" },
  { "name": "M2-M4 — Estudos e Demonstrações", "phase_order": 6, "status": "pendente", "progress": 0, "start_date": "2026-09-01", "end_date": "2026-11-30" },
  { "name": "Estabilização", "phase_order": 7, "status": "pendente", "progress": 0, "start_date": "2026-12-01", "end_date": "2026-12-31" }
]
```

### 9.5 Tarefas iniciais (importar do CSV existente)

Importar diretamente do ficheiro `Painel-Tarefas-Empresa.csv` que já existe. Mapeamento:

| CSV | Campo DB |
|-----|----------|
| Projecto | project_id (lookup por nome) |
| Tarefa | title |
| Quem | assignee_id (lookup por nome) |
| Prioridade | priority |
| Prazo | deadline |
| Estado | status |
| Origem | origin |
| Data | origin_date |
| Notas | description |

### 9.6 Objetivos iniciais

```json
[
  { "title": "Facturar 1M€ em 2026", "target_value": 1000000, "current_value": 120000, "unit": "€", "deadline": "2026-12-31" },
  { "title": "AURA PMS: 50 propriedades até M4", "target_value": 50, "current_value": 0, "unit": "propriedades", "deadline": "2026-07-31", "project": "aura-pms" },
  { "title": "iPME Digital: contrato fechado", "target_value": 1, "current_value": 0, "unit": "contrato", "deadline": "2026-05-31", "project": "ipme-digital" }
]
```

### 9.7 Cliente inicial

```json
{
  "company_name": "Fiscomelres / iPME",
  "project": "ipme-digital",
  "status": "negociacao",
  "contacts": ["Sérgio Gonçalves", "Nuno Gonçalves", "Márcia Costa"],
  "primary_contact": "Sérgio Gonçalves"
}
```

### 9.8 Áreas operacionais iniciais

```json
[
  {
    "name": "Recursos Humanos",
    "slug": "rh",
    "description": "Contratação, onboarding, gestão de equipa, avaliações de desempenho",
    "color": "#D4537E",
    "icon": "users"
  },
  {
    "name": "Operações",
    "slug": "operacoes",
    "description": "Infraestrutura técnica, admin, tooling, servidores, DevOps",
    "color": "#888780",
    "icon": "cog"
  },
  {
    "name": "Financeiro",
    "slug": "financeiro",
    "description": "Facturação, contabilidade, pagamentos, tesouraria",
    "color": "#639922",
    "icon": "briefcase"
  },
  {
    "name": "Comercial",
    "slug": "comercial",
    "description": "Vendas, propostas, relação com clientes, pipeline comercial",
    "color": "#BA7517",
    "icon": "target"
  }
]
```

### 9.9 Templates de workflow iniciais

```json
[
  {
    "name": "Onboarding novo colaborador",
    "slug": "onboarding-colaborador",
    "description": "Processo de integração de novos membros da equipa — do primeiro dia à revisão dos 30 dias",
    "area": "rh",
    "trigger_type": "manual",
    "estimated_duration_days": 30,
    "steps": [
      { "order": 1, "title": "Criar conta no sistema (email, Drive, Discord)", "assignee_role": "admin", "deadline_days": 1, "priority": "alta" },
      { "order": 2, "title": "Dar acessos aos projetos relevantes", "assignee_role": "admin", "deadline_days": 1, "depends_on": [1], "priority": "alta" },
      { "order": 3, "title": "Atribuir mentor", "assignee_role": "manager", "deadline_days": 1, "priority": "alta" },
      { "order": 4, "title": "Enviar manual de boas-vindas e documentação", "assignee_role": "rh", "deadline_days": 2, "priority": "media" },
      { "order": 5, "title": "Agendar formação inicial (ferramentas, processos)", "assignee_role": "mentor", "deadline_days": 3, "depends_on": [3], "priority": "media" },
      { "order": 6, "title": "Revisão primeira semana — check-in com manager", "assignee_role": "manager", "deadline_days": 7, "depends_on": [5], "priority": "media" },
      { "order": 7, "title": "Feedback 360° — recolher input da equipa", "assignee_role": "rh", "deadline_days": 14, "depends_on": [6], "priority": "baixa", "is_optional": true },
      { "order": 8, "title": "Revisão 30 dias — avaliação e ajustes", "assignee_role": "manager", "deadline_days": 30, "depends_on": [6], "priority": "alta" }
    ]
  },
  {
    "name": "Setup novo projeto cliente",
    "slug": "setup-projeto-cliente",
    "description": "Configuração inicial quando se fecha um novo projeto com cliente",
    "area": "operacoes",
    "trigger_type": "manual",
    "estimated_duration_days": 5,
    "steps": [
      { "order": 1, "title": "Criar pasta no Google Drive com estrutura padrão", "assignee_role": "admin", "deadline_days": 1, "priority": "alta" },
      { "order": 2, "title": "Criar canais no Discord (#dev, #cliente, #decisões)", "assignee_role": "admin", "deadline_days": 1, "priority": "alta" },
      { "order": 3, "title": "Configurar grupo Telegram com agente discovery", "assignee_role": "admin", "deadline_days": 2, "depends_on": [1], "priority": "alta" },
      { "order": 4, "title": "Criar projeto no Command Center com fases e equipa", "assignee_role": "manager", "deadline_days": 2, "priority": "alta" },
      { "order": 5, "title": "Agendar kickoff meeting com cliente", "assignee_role": "manager", "deadline_days": 5, "depends_on": [1, 2, 3], "priority": "alta" }
    ]
  },
  {
    "name": "Fecho mensal contabilidade",
    "slug": "fecho-mensal",
    "description": "Processo mensal de fecho de contas e reconciliação",
    "area": "financeiro",
    "trigger_type": "recorrente",
    "trigger_config": { "recurrence": "monthly", "day": 1 },
    "estimated_duration_days": 5,
    "steps": [
      { "order": 1, "title": "Reconciliação bancária", "assignee_role": "financeiro", "deadline_days": 2, "priority": "alta" },
      { "order": 2, "title": "Verificar faturas pendentes de pagamento", "assignee_role": "financeiro", "deadline_days": 2, "priority": "alta" },
      { "order": 3, "title": "Emitir faturas do mês (clientes)", "assignee_role": "financeiro", "deadline_days": 3, "depends_on": [1], "priority": "alta" },
      { "order": 4, "title": "Atualizar previsão de tesouraria", "assignee_role": "financeiro", "deadline_days": 4, "depends_on": [1, 2], "priority": "media" },
      { "order": 5, "title": "Enviar dados ao contabilista", "assignee_role": "financeiro", "deadline_days": 5, "depends_on": [3], "priority": "alta" },
      { "order": 6, "title": "Relatório financeiro mensal para sócios", "assignee_role": "manager", "deadline_days": 5, "depends_on": [4], "priority": "media" }
    ]
  },
  {
    "name": "Processo de contratação",
    "slug": "contratacao",
    "description": "Do anúncio à decisão final de contratação",
    "area": "rh",
    "trigger_type": "manual",
    "estimated_duration_days": 21,
    "steps": [
      { "order": 1, "title": "Definir perfil e requisitos da função", "assignee_role": "manager", "deadline_days": 2, "priority": "alta" },
      { "order": 2, "title": "Criar e publicar anúncio (LinkedIn, plataformas)", "assignee_role": "rh", "deadline_days": 3, "depends_on": [1], "priority": "alta" },
      { "order": 3, "title": "Triagem de candidaturas", "assignee_role": "rh", "deadline_days": 10, "depends_on": [2], "priority": "media" },
      { "order": 4, "title": "Entrevistas (primeira ronda)", "assignee_role": "manager", "deadline_days": 14, "depends_on": [3], "priority": "alta" },
      { "order": 5, "title": "Entrevista técnica / prova prática", "assignee_role": "cto", "deadline_days": 17, "depends_on": [4], "priority": "alta" },
      { "order": 6, "title": "Decisão final e proposta", "assignee_role": "manager", "deadline_days": 21, "depends_on": [5], "priority": "alta" }
    ]
  }
]
```

---

## 10. DEPLOY E INFRAESTRUTURA

### 10.1 Docker Compose

```yaml
version: '3.8'

services:
  command-center:
    build: .
    ports:
      - "3100:3000"
    environment:
      - DATABASE_URL=postgresql://cc:${DB_PASSWORD}@db:5432/command_center
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://cc.dominio.pt
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - GOOGLE_DRIVE_CONNECTION=${GOOGLE_DRIVE_CONNECTION}
      - GOOGLE_CALENDAR_CONNECTION=${GOOGLE_CALENDAR_CONNECTION}
      - MATON_API_KEY=${MATON_API_KEY}
      - GMAIL_CONNECTION=${GMAIL_CONNECTION}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=cc
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=command_center
    restart: unless-stopped

volumes:
  pgdata:
```

### 10.2 Variáveis de ambiente necessárias

```env
# Base de dados
DB_PASSWORD=

# Auth (Google OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://cc.dominio.pt

# Google APIs (via Maton proxy ou direto)
MATON_API_KEY=
GOOGLE_DRIVE_CONNECTION=4b9bdfc5-28d7-48b2-8751-80953d48049b
GOOGLE_CALENDAR_CONNECTION=372c29c9-4dc5-4a76-85de-fe418e5882e5
GMAIL_CONNECTION=174334e7-6c42-4c6a-ab14-56d372c0f610

# Discord
DISCORD_BOT_TOKEN=

# AI (para extração de calls)
ANTHROPIC_API_KEY=

# Google Sheet (sync bi-direcional)
GOOGLE_SHEET_ID=1S6Cl2dZVi9fJtCuiLOP54aZcM3vD_Qi9JYy_C8M24jo
GOOGLE_SHEET_CONNECTION=ea76eac5-3a25-41d6-8e9e-c9cc6155ce54
```

### 10.3 Nginx (reverse proxy)

```nginx
server {
    listen 443 ssl;
    server_name cc.dominio.pt;

    ssl_certificate /etc/letsencrypt/live/cc.dominio.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cc.dominio.pt/privkey.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 11. ROADMAP DE IMPLEMENTAÇÃO

### Sprint 1 (Semana 1-2) — Fundação

- [ ] Setup projeto Next.js + Tailwind + shadcn/ui
- [ ] PostgreSQL + schema (migrations)
- [ ] Seed com dados iniciais (projetos, pessoas, fases, objetivos)
- [ ] Importar tarefas do CSV existente
- [ ] Auth com Google OAuth
- [ ] Vista principal (mapa geral) — estática com dados reais
- [ ] Deploy no VPS com Docker

### Sprint 2 (Semana 3-4) — Kanban + Tarefas

- [ ] Vista de projeto com Kanban funcional
- [ ] Drag & drop de tarefas entre colunas
- [ ] Criar/editar/arquivar tarefas
- [ ] Filtros por pessoa, prioridade, origem
- [ ] Modal de detalhe de tarefa
- [ ] Timeline/Gantt básico com fases

### Sprint 3 (Semana 5-6) — Client Hub + Feed

- [ ] Client Hub com feed cronológico
- [ ] Filtros por tipo e por pessoa
- [ ] Próximos passos pendentes
- [ ] Entrada manual de notas
- [ ] Info bar do cliente

### Sprint 4 (Semana 7-8) — Sync Engine

- [ ] Sync Google Drive (calls + docs)
- [ ] Sync Gmail (emails de clientes)
- [ ] Sync Google Calendar
- [ ] Extração AI de calls (Claude Sonnet)
- [ ] Motor de alertas automáticos

### Sprint 5 (Semana 9-10) — Conteúdo + Polish

- [ ] Pipeline de conteúdo visual
- [ ] Vista de objetivos com projeções
- [ ] Sync Discord (webhook)
- [ ] Sync Google Sheet bi-direcional
- [ ] Responsive/mobile
- [ ] Performance e UX polish

### Sprint 6 (Semana 11-12) — Automação Avançada

- [ ] Briefing matinal automático (dados do Command Center)
- [ ] Relatório semanal automático
- [ ] Integração com OpenClaw (comandos conversacionais)
- [ ] Notificações push (Telegram)

---

## 12. NOTAS FINAIS

### 12.1 Compatibilidade com sistemas existentes

O Command Center não substitui o OpenClaw, Discord, ou Google Suite — complementa-os com uma camada visual. Os dados continuam a ser gerados pelas ferramentas existentes. O Command Center apenas os agrega e visualiza.

A sync bi-direcional com o Google Sheet garante que o Painel-Tarefas-Empresa.csv continua atualizado para quem preferir essa vista.

### 12.2 Escalabilidade

O sistema está desenhado para crescer:
- Novos projetos: adicionar na tabela `projects`
- Novos clientes: adicionar na tabela `clients` + contactos
- Novos membros de equipa: adicionar na tabela `people`
- Novas integrações: adicionar sync jobs na engine
- Novas áreas operacionais: adicionar na tabela `areas` (RH, Financeiro, Comercial, etc.)
- Novos workflows: criar templates reutilizáveis na biblioteca — cada instância gera tarefas reais no Kanban
- Processos recorrentes: triggers automáticos (ex: fecho mensal no dia 1 de cada mês)

### 12.3 Projetos vs. Áreas — quando usar cada um

| | Projeto | Área operacional |
|---|---------|-----------------|
| Duração | Tem início e fim | Contínua, sem fim |
| Exemplo | AURA PMS, iPME Digital | RH, Financeiro, Operações |
| Fases | Sim (Foundation, Connectivity...) | Não |
| Workflows | Pontuais (setup projeto) | Recorrentes (fecho mensal, onboarding) |
| Quando criar | Novo produto ou cliente | Novo departamento ou função na empresa |

### 12.3 Segurança

- Todas as API keys e tokens em variáveis de ambiente (nunca em código)
- HTTPS obrigatório (Let's Encrypt)
- Auth OAuth — sem passwords próprias
- Dados de clientes isolados por projeto (preparação para multi-tenant)
- Logs de sync para auditoria

### 12.4 Decisões em aberto (para discutir com Bruno)

1. **ORM:** Drizzle vs. Prisma — ambos funcionam, Drizzle é mais leve
2. **Real-time:** WebSockets (Socket.io) vs. polling (mais simples no MVP)
3. **Drag & drop:** @dnd-kit vs. react-beautiful-dnd (dnd-kit é mais moderno)
4. **Subdomínio:** cc.dominio.pt vs. command.dominio.pt vs. outro
5. **Redis:** necessário no MVP? Provavelmente não — adicionar quando precisarem de cache/queues

---

*Documento gerado a 2 de Abril de 2026. Versão 1.2 (Trust Score + Workflows + Áreas).*
*Para ser usado como especificação de desenvolvimento com Claude Code.*
