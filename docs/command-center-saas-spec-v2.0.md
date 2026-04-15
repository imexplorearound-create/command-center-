# COMMAND CENTER — Especificação Produto SaaS para PMEs
# Versão: 2.0
# Data: 12 Abril 2026
# Para: Desenvolvimento com Claude Code

---

## LEGENDA DE ESTADO

Cada secção e funcionalidade está marcada com o seu estado actual:

- ✅ **Existe** — Já está implementado e funcional no Command Center actual
- 🔄 **Adaptar** — Existe mas precisa de alterações para a nova realidade multi-tenant/SaaS
- 🆕 **Novo** — Funcionalidade nova a construir de raiz

---

## 1. VISÃO DO PRODUTO

### 1.1 O que é

O Command Center é um cockpit operacional AI-first para PMEs até 50 funcionários. Consolida gestão de projectos, CRM, workflows, objectivos, timetracking e comunicações numa única interface, com agentes AI que automatizam grande parte das actualizações e um sistema de trust score que dá autonomia progressiva à AI.

### 1.2 Modelo de Negócio

Produto SaaS multi-tenant com:
- **Mensalidade base** — acesso ao core (projectos, tarefas, pessoas, áreas, OKRs, Maestro AI básico)
- **Módulos plugáveis** — cada módulo extra é activado/desactivado por tenant e cobra um valor adicional mensal
- **Catálogo crescente** — à medida que se constroem módulos para clientes específicos, esses módulos entram no catálogo e ficam disponíveis para todos os tenants

### 1.3 Mercado Alvo

PMEs portuguesas de serviços até 50 funcionários — gabinetes de contabilidade, agências de marketing, consultoras, gabinetes de arquitectura, empresas de engenharia, empresas de TI, escritórios de advogados. Empresas que hoje usam ClickUp, Notion, Monday ou Excel e que precisam de algo mais integrado mas sem a complexidade de um ERP.

### 1.4 Princípios de Design

1. **Visão primeiro** — ao abrir, vejo tudo num relance sem cliques
2. **Profundidade a pedido** — clico e mergulho no detalhe
3. **AI core** — agentes fazem grande parte das actualizações; humano valida e corrige
4. **Trust Score** — AI ganha autonomia à medida que acerta
5. **Plug-and-play** — módulos activam-se sem código, com templates default prontos a usar
6. **Configurável dentro de limites** — até 10 estados/modos por módulo, nomes configuráveis
7. **Humano sempre no controlo** — reverter autonomia da AI, corrigir dados, CRUD manual completo
8. **Feedback bidireccional** — feedback ao agente AI (confirmar/editar/rejeitar) e feedback ao produto

### 1.5 Idiomas

- 🔄 **PT-PT** (existe hardcoded, adaptar para sistema i18n)
- 🆕 **EN** (adicionar como segundo idioma)

Sistema de internacionalização com ficheiros de tradução por chave. Cada string visível no frontend vem de ficheiro de traduções. Idioma configurável por utilizador.

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Stack ✅ (manter)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Next.js (App Router, Server Components) | 16.2.2 |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS | 4 |
| Icons | Lucide React | 1.7.0 |
| Drag & Drop | @dnd-kit (core + sortable) | 6.3.1 / 10.0.0 |
| Backend | Next.js API Routes + Server Actions | 16.2.2 |
| Base de Dados | PostgreSQL | 16 |
| ORM | Prisma (com @prisma/adapter-pg) | 7.6.0 |
| Auth | jose (JWT) + bcryptjs | — |
| AI | Camada de abstração LLM (ver 2.4) | — |
| Testes | Vitest + Testing Library | 4.1.3 |
| TypeScript | Strict mode | 5 |

### 2.2 Multi-Tenancy 🆕

Arquitectura single-instance, multi-tenant com isolamento na base de dados.

**Princípio:** Uma única instalação serve todos os tenants. Os dados são isolados por `tenantId` em todas as tabelas.

**Implementação:**

```
┌──────────────────────────────────────────────────┐
│          COMMAND CENTER (Single Instance)          │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │            Tenant Resolution Layer          │   │
│  │  (subdomínio / header / JWT claim)          │   │
│  └────────────────────────────────────────────┘   │
│                       │                            │
│  ┌────────────────────────────────────────────┐   │
│  │            Application Layer                │   │
│  │  (Core + Módulos activos do tenant)         │   │
│  └────────────────────────────────────────────┘   │
│                       │                            │
│  ┌────────────────────────────────────────────┐   │
│  │            PostgreSQL (shared DB)            │   │
│  │  Todas as tabelas com tenantId              │   │
│  │  Row-Level Security / Prisma middleware     │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Modelo Tenant:**

```prisma
model Tenant {
  id            String   @id @default(cuid())
  name          String                          // Nome da empresa
  slug          String   @unique                // Subdomínio ou identificador
  plan          String   @default("basic")      // basic, pro, enterprise
  activeModules String[]                        // IDs dos módulos activos
  settings      Json     @default("{}")         // Configurações gerais do tenant
  locale        String   @default("pt-PT")      // Idioma preferido
  timezone      String   @default("Europe/Lisbon")
  createdAt     DateTime @default(now())
  archivedAt    DateTime?

  // Relações
  users         User[]
  projects      Project[]
  // ... todas as entidades raiz
}
```

**Regras:**
- Todas as tabelas principais ganham campo `tenantId` (obrigatório, indexado)
- Prisma middleware filtra automaticamente por tenant em todas as queries
- JWT inclui `tenantId` no payload
- Seed de tenant inicial para migração dos dados existentes (Miguel + Bruno)
- Nenhum endpoint retorna dados cross-tenant (excepto superadmin)

### 2.3 Sistema de Módulos 🆕

**Catálogo de Módulos:**

```prisma
model ModuleCatalog {
  id           String   @id @default(cuid())
  slug         String   @unique               // "crm", "timetracking", "content-pipeline"
  name         Json                            // { "pt-PT": "Pipeline Comercial", "en": "Sales Pipeline" }
  description  Json                            // Descrição por idioma
  category     String                          // "core", "operations", "communication", "analytics"
  isCore       Boolean  @default(false)        // Módulos core não se desactivam
  defaultConfig Json    @default("{}")         // Configuração default (estados, campos, etc.)
  version      String   @default("1.0")
  createdAt    DateTime @default(now())
}
```

**Configuração do Módulo por Tenant:**

```prisma
model TenantModuleConfig {
  id         String   @id @default(cuid())
  tenantId   String
  moduleSlug String
  isActive   Boolean  @default(true)
  config     Json     @default("{}")          // Override do defaultConfig
  activatedAt DateTime @default(now())

  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, moduleSlug])
}
```

**Estrutura de configuração de um módulo (exemplo CRM):**

```json
{
  "states": [
    { "id": "contact", "label": { "pt-PT": "Contacto Inicial", "en": "Initial Contact" }, "order": 1, "color": "#94A3B8" },
    { "id": "qualification", "label": { "pt-PT": "Qualificação", "en": "Qualification" }, "order": 2, "color": "#3B82F6" },
    { "id": "proposal", "label": { "pt-PT": "Proposta", "en": "Proposal" }, "order": 3, "color": "#F59E0B" },
    { "id": "negotiation", "label": { "pt-PT": "Negociação", "en": "Negotiation" }, "order": 4, "color": "#8B5CF6" },
    { "id": "won", "label": { "pt-PT": "Ganho", "en": "Won" }, "order": 5, "color": "#10B981", "isFinal": true },
    { "id": "lost", "label": { "pt-PT": "Perdido", "en": "Lost" }, "order": 6, "color": "#EF4444", "isFinal": true }
  ],
  "maxStates": 10,
  "fields": {
    "value": { "visible": true, "required": false },
    "probability": { "visible": true, "required": false },
    "source": { "visible": true, "options": ["website", "referral", "cold", "event", "other"] }
  },
  "automations": {
    "alertOnStale": { "enabled": true, "daysThreshold": 7 },
    "convertToProject": { "enabled": true, "onState": "won" }
  }
}
```

**Regra dos 10 estados:** Cada módulo suporta até 10 estados/modos configuráveis. O tenant pode usar entre 2 e 10, renomear livremente, reordenar, e escolher cores. Os módulos vêm com um template default pronto a usar.

**Módulos Core (não desactiváveis):**

| Módulo | Slug | Descrição |
|--------|------|-----------|
| Dashboard | `dashboard` | Vista geral, alertas, satellites, validação AI |
| Projectos | `projects` | Gestão de projectos, fases, Kanban |
| Pessoas | `people` | Equipa, contactos, roles |
| Áreas | `areas` | Departamentos / áreas operacionais |
| OKRs | `objectives` | Objectivos, key results, roadmap |
| Maestro AI | `maestro` | Assistente AI com trust scores |

**Módulos Plugáveis (catálogo):**

| Módulo | Slug | Descrição | Prioridade |
|--------|------|-----------|------------|
| Pipeline Comercial (CRM) | `crm` | Funil de vendas, oportunidades, clientes | P1 |
| Gestão Cross-Departamento | `cross-projects` | Mapas de investimento, distribuição por departamento | P1 |
| Email Integrado | `email-sync` | Categorização automática, vista por cliente/projecto | P1 |
| Timetracking | `timetracking` | Registo de horas, custos, desvios | P1 |
| Pipeline de Conteúdo | `content-pipeline` | Kanban de conteúdo (proposta → publicado) | P2 |
| Feedback & QA | `feedback` | Extensão Chrome, gravação voz, classificação AI | P2 |
| Workflows Avançados | `workflows` | Templates recorrentes com triggers automáticos | P2 |
| Campanhas | `campaigns` | Email marketing, audiências, automações | P3 |
| Notificações WhatsApp | `whatsapp` | Notificações e comunicação bidirecional via WhatsApp | P3 |
| Notificações Telegram | `telegram` | Notificações e automações via Telegram | P3 |

### 2.4 Abstracção LLM 🔄

**Estado actual:** MiniMax (endpoint compatível Anthropic) + Groq (transcrição Whisper).

**Nova arquitectura:**

```
┌────────────────────────────────────────┐
│         Maestro AI Layer               │
│  (prompts, tools, trust score)         │
│  Agnóstico do modelo                   │
└───────────────┬────────────────────────┘
                │
        ┌───────┴───────┐
        │  LLM Gateway  │
        │  (adaptador)  │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───┴───┐  ┌───┴───┐  ┌───┴───┐
│ Cloud │  │ Local │  │ Outro │
│ API   │  │ Model │  │       │
│(Anth.)│  │(Llama)│  │       │
└───────┘  └───────┘  └───────┘
```

**Configuração por tenant:**

```prisma
model TenantLLMConfig {
  id         String @id @default(cuid())
  tenantId   String @unique
  provider   String @default("internal")  // "internal", "anthropic", "openai", "custom"
  endpoint   String?                       // URL do endpoint (para custom/local)
  model      String @default("default")    // Modelo a usar
  apiKey     String?                       // Chave API (encriptada) — só para cloud
  
  tenant     Tenant @relation(fields: [tenantId], references: [id])
}
```

**Objectivo:** Transição para modelos internos (Llama, Mistral, Qwen) a correr nas próprias máquinas. Motivação: dados confidenciais de clientes, custos, independência. O sistema é agnóstico — prompts, tools e trust scores funcionam igual independentemente do motor.

---

## 3. CORE — FUNCIONALIDADES BASE

> Tudo o que está nesta secção é incluído na mensalidade base e não pode ser desactivado.

### 3.1 Dashboard ✅🔄

**Existe:**
- Cards de projectos com badge saúde, barra progresso, contagem tarefas
- Barra horizontal de objectivos activos
- Satellite cards (calls, conteúdo, Discord, calendar, GitHub)
- Painel de alertas por severity
- Painel de validação humana (confirm/edit/reject)
- Stats gerais

**Adaptar:**
- Filtrar tudo por `tenantId`
- Satellites configuráveis por tenant (mostrar apenas os que têm integrações activas)
- Dashboard adaptável aos módulos activos (se CRM activo, mostra resumo do pipeline; se timetracking activo, mostra horas da semana)
- Textos via i18n (PT-PT / EN)

### 3.2 Projectos e Fases ✅🔄

**Existe:**
- CRUD completo de projectos (name, slug, type, status, health, progress, color)
- Fases com ordem, status, progresso, datas
- Vista detalhe com 3 tabs: Kanban, Timeline, Dev
- Kanban com 5 colunas (backlog → feito), drag-drop
- Filtros por status, prioridade, assignee

**Adaptar:**
- Adicionar `tenantId` a Project e ProjectPhase
- Estados do Kanban configuráveis por tenant (até 10, default 5)
- Type expandido: além de `interno | cliente`, permitir tipos custom
- Tab "Dev" (GitHub) só visível se módulo de integração GitHub estiver activo
- i18n em labels e mensagens

### 3.3 Tarefas ✅🔄

**Existe (20+ campos):**
- Identificação: title, description, projectId, phaseId, areaId
- Workflow: status, priority, kanbanOrder
- Atribuição: assigneeId, validatedById
- Datas: deadline, completedAt
- Origem: manual, ai, agent, github, email, call
- Validação AI: validationStatus, aiConfidence, originalData
- GitHub: devStatus, branch, prNumber, prStatus, prUrl, lastCommitAt

**Adaptar:**
- Adicionar `tenantId`
- Campos de GitHub opcionais (só se módulo GitHub activo)
- Prioridades configuráveis (default: crítica/alta/média/baixa)
- Origens expandíveis por módulo activo (se CRM activo, adiciona "crm"; se email-sync, adiciona "email")

### 3.4 Pessoas e Contactos ✅🔄

**Existe:**
- Person: name, email, role, type, avatarColor, githubUsername
- ClientContact: liga clientes a pessoas (isPrimary)

**Adaptar:**
- Adicionar `tenantId`
- Campo `departmentId` para ligar pessoa a uma Area (departamento)
- Campo `costPerHour` (Decimal, opcional) — para módulo timetracking
- githubUsername opcional (só se módulo GitHub activo)
- Tipo expandido para suportar "funcionário", "freelancer", "contacto externo"

### 3.5 Áreas Operacionais ✅🔄

**Existe:**
- Area: name, description, ownerId
- Agrupamento cross-projecto

**Adaptar:**
- Adicionar `tenantId`
- Funcionar como "departamentos" — consultoria, multimédia, financeiro, RH, etc.
- Cada área pode ter sub-áreas (parentId opcional para hierarquia simples de 2 níveis)
- Vista de detalhe de área com: tarefas do departamento, workflows, pessoas, métricas

### 3.6 OKRs e Roadmap ✅🔄

**Existe:**
- Objective com title, description, targetValue, currentValue, unit, deadline, status
- KeyResult com weight, order, targetValue, currentValue, unit
- OkrSnapshot para tracking histórico
- 3 vistas: lista OKR, roadmap temporal, mapa canvas

**Adaptar:**
- Adicionar `tenantId`
- Objectivos podem pertencer a uma Area (departamento) além de um projecto
- i18n em labels
- Export de roadmap para PDF (ver secção 10)

### 3.7 Roles e Permissões 🔄

**Existe:**
- 3 roles: admin, membro, cliente
- Guards: requireAdmin(), requireWriter(), requireNonClient()
- UserProjectAccess (many-to-many)

**Nova hierarquia (4 roles):**

| Role | Slug | Permissões |
|------|------|-----------|
| Administrador | `admin` | Acesso total. Configura tenant, módulos, roles. Gere todos os projectos e departamentos |
| Gestor | `manager` | Vê e gere projectos e pessoas do(s) seu(s) departamento(s). Pode criar projectos, atribuir tarefas, configurar workflows do departamento. Não acede a configurações do tenant |
| Colaborador | `member` | Vê tarefas atribuídas a si e projectos em que participa. Pode criar tarefas, registar horas, actualizar status. Não gere pessoas nem configurações |
| Cliente Externo | `client` | Vê o Client Hub dos projectos a que está associado. Read-only com possibilidade de adicionar comentários/interacções |

**Permissões por módulo:**

```prisma
model UserModuleAccess {
  id         String  @id @default(cuid())
  userId     String
  moduleSlug String
  canRead    Boolean @default(true)
  canWrite   Boolean @default(false)
  canAdmin   Boolean @default(false)

  user       User    @relation(fields: [userId], references: [id])

  @@unique([userId, moduleSlug])
}
```

O admin pode definir que um colaborador tem acesso ao CRM mas não ao timetracking, por exemplo.

### 3.8 Maestro AI ✅🔄

**Existe:**
- System prompt em PT-PT, tom directo
- 4 tools: listar_projectos, listar_tarefas, listar_pessoas, criar_tarefa
- Trust Score com 7 tipos de extracção, 5 estados de validação, 5 níveis de trust
- Cap de acções sensíveis (score 50)
- Fluxo chat com loop agêntico
- Persistência de conversas (MaestroConversation, MaestroMessage)
- MaestroAction audit log

**Adaptar:**
- Tudo filtrado por `tenantId`
- System prompt dinâmico baseado nos módulos activos do tenant
- Tools expandíveis por módulo (se CRM activo, adiciona `listar_oportunidades`, `criar_oportunidade`; se timetracking activo, adiciona `registar_horas`)
- Idioma do Maestro segue locale do tenant/user
- LLM configurável por tenant (ver secção 2.4)
- Trust score por tenant (cada empresa tem o seu histórico de confiança)

**Tools por módulo:**

| Módulo | Tools adicionais do Maestro |
|--------|----------------------------|
| Core | listar_projectos, listar_tarefas, listar_pessoas, criar_tarefa |
| CRM | listar_oportunidades, criar_oportunidade, listar_clientes |
| Timetracking | registar_horas, resumo_horas_semana |
| Email | pesquisar_emails, categorizar_email |
| Cross-Projects | listar_mapa_investimento, estado_financeiro_projecto |

### 3.9 Sistema de Alertas ✅🔄

**Existe:**
- Alert com type, severity, message, relatedTaskId/ProjectId/ClientId
- Tipos: tarefa_atrasada, cliente_sem_contacto, etc.

**Adaptar:**
- Adicionar `tenantId`
- Tipos de alerta expandíveis por módulo activo
- Configuração de thresholds por tenant (ex: "alerta de cliente sem contacto" após 7 ou 14 ou 30 dias — configurável)
- Canal de notificação configurável por tipo de alerta e por user (email, push, WhatsApp, Telegram)

### 3.10 Validação Humana / Trust Score ✅🔄

**Existe:**
- Painel de validação com 3 acções: Confirmar, Editar, Rejeitar
- Trust Score recalcula automaticamente
- 7 categorias: tarefa, decisão, resumo, prioridade, responsável, conteúdo, ligação_código
- 5 níveis de trust (0-100)

**Adaptar:**
- Trust score por tenant (isolado)
- Categorias expandíveis por módulo (se CRM activo, adiciona "oportunidade", "valor_deal")
- Configuração do threshold de auto-confirmação por tenant (default 80%, configurável)

### 3.11 Autenticação ✅🔄

**Existe:**
- JWT via jose, cookie httpOnly (7 dias)
- Login com email + password
- Payload: userId, personId, email, name, role

**Adaptar:**
- Adicionar `tenantId` ao JWT payload
- Adicionar `locale` ao JWT payload
- Suportar convite por email (admin convida novo user, user recebe link de setup)
- Password reset via email
- Preparar para OAuth futuro (Google login) — não implementar agora, mas não bloquear

---

## 4. MÓDULO: PIPELINE COMERCIAL (CRM) 🆕

> Slug: `crm`
> Prioridade: P1
> Substitui/complementa: Client + ClientContact + Interaction (existentes)

### 4.1 Problema que resolve

PMEs gerem o pipeline comercial em Excel, no ClickUp, ou de memória. O Nuno (Iniciativa PME) descreveu: "chega um contacto, faço reunião inicial, filtragem, troco ideias e tento vender os meus serviços." Sem visibilidade centralizada do funil, oportunidades perdem-se.

### 4.2 Modelo de Dados

```prisma
model Opportunity {
  id            String    @id @default(cuid())
  tenantId      String
  title         String
  description   String?
  
  // Pipeline
  stateId       String                        // Estado actual (configurável, até 10)
  kanbanOrder   Int       @default(0)
  
  // Valores
  value         Decimal?                      // Valor estimado do deal
  currency      String    @default("EUR")
  probability   Int?                          // 0-100%
  
  // Pessoas
  contactId     String?                       // Pessoa de contacto (do model Person)
  ownerId       String?                       // Responsável interno
  companyName   String?                       // Empresa do lead
  companyNif    String?                       // NIF (importante para mercado PT)
  
  // Datas
  expectedClose DateTime?                     // Data prevista de fecho
  closedAt      DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  archivedAt    DateTime?
  
  // Origem
  source        String?                       // website, referral, cold, event, other
  
  // Validação AI
  validationStatus String @default("confirmed") // por_confirmar, confirmed, etc.
  aiConfidence     Float?
  
  // Conversão
  convertedProjectId String?                  // Quando ganho, liga ao projecto criado
  
  // Relações
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  contact       Person?   @relation("OpportunityContact", fields: [contactId], references: [id])
  owner         Person?   @relation("OpportunityOwner", fields: [ownerId], references: [id])
  convertedProject Project? @relation(fields: [convertedProjectId], references: [id])
  interactions  Interaction[]
  activities    OpportunityActivity[]
}

model OpportunityActivity {
  id            String   @id @default(cuid())
  opportunityId String
  type          String                        // "note", "call", "email", "meeting", "task"
  title         String
  description   String?
  scheduledAt   DateTime?
  completedAt   DateTime?
  createdById   String
  createdAt     DateTime @default(now())
  
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id])
  createdBy     Person      @relation(fields: [createdById], references: [id])
}
```

### 4.3 Funcionalidades

**Vista Kanban do Pipeline:**
- Colunas = estados configuráveis (até 10, default 6: Contacto Inicial → Qualificação → Proposta → Negociação → Ganho → Perdido)
- Drag-drop entre colunas (reutilizar @dnd-kit existente)
- Card mostra: título, empresa, valor, responsável, dias no estado, próxima acção
- Filtros: por responsável, por valor, por fonte, por data

**Ficha de Oportunidade:**
- Dados do deal (título, valor, probabilidade, datas)
- Dados do contacto/empresa (com ligação ao modelo Person existente)
- Timeline de actividades (notas, calls, emails, reuniões)
- Canais de comunicação (conceito dos "canais" que o Sérgio descreveu — separadores temáticos dentro da ficha)
- Próxima acção com data e responsável
- Botão "Converter em Projecto" (quando estado = ganho)

**Conversão Oportunidade → Projecto:**
- Ao fechar como ganho, o sistema sugere criar projecto
- Arrasta automaticamente: dados do cliente, valor como orçamento, contacto como ClientContact
- O projecto nasce já com a informação do deal

**Métricas no Dashboard (se módulo activo):**
- Total de oportunidades abertas e valor total no pipeline
- Taxa de conversão (ganhos / total fechados)
- Tempo médio de fecho
- Oportunidades paradas há mais de X dias (alerta configurável)

**Integração com Maestro:**
- Tool `listar_oportunidades` — lista pipeline com filtros
- Tool `criar_oportunidade` — cria nova oportunidade (com trust score)
- Sugestão automática: quando o Maestro detecta uma nova interação com lead potencial, sugere criar oportunidade

### 4.4 Campanhas de Email (sub-funcionalidade do CRM)

> Nota: Funcionalidade simples de comunicação, não é email marketing avançado.

**O que resolve:** Substituir o Klozum que a Iniciativa PME usa para newsletters e comunicações.

**Funcionalidades:**
- Definir audiências (segmentos de contactos por tags/tipo/departamento)
- Criar templates de email (editor simples, não visual builder)
- Enviar comunicações para audiências
- Métricas básicas: enviados, abertos, bounced
- Templates automáticos: email de boas-vindas para novo cliente
- Agendamento de envios

**Não inclui (por agora):** Funis automatizados de follow-up, A/B testing, landing pages.

---

## 5. MÓDULO: GESTÃO DE PROJECTOS CROSS-DEPARTAMENTO 🆕

> Slug: `cross-projects`
> Prioridade: P1
> Complementa: Projects + Tasks (existentes)

### 5.1 Problema que resolve

O Nuno descreveu: "o departamento financeiro faz num Excel com as tarefas todas, o departamento de multimédia põe-se a olhar e é um filme, vai criar no ClickUp as tarefas, e andamos sempre a dois ritmos." Projectos que envolvem múltiplos departamentos (financeiro + multimédia + consultoria) não têm visibilidade cruzada.

### 5.2 Modelo de Dados

```prisma
model InvestmentMap {
  id            String   @id @default(cuid())
  tenantId      String
  projectId     String
  
  // Orçamento
  totalBudget   Decimal                       // Orçamento total do projecto
  fundingSource String?                       // "PRR", "PT2030", "próprio", "misto"
  fundingPercentage Decimal?                  // % a fundo perdido (ex: 75%)
  
  // Datas
  startDate     DateTime?
  endDate       DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relações
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  project       Project  @relation(fields: [projectId], references: [id])
  rubrics       InvestmentRubric[]
}

model InvestmentRubric {
  id              String   @id @default(cuid())
  investmentMapId String
  
  name            String                      // "Multimédia", "Consultoria", "Equipamento"
  budgetAllocated Decimal                     // Valor orçamentado
  budgetExecuted  Decimal  @default(0)        // Valor já executado
  areaId          String?                     // Departamento responsável
  
  order           Int      @default(0)
  
  investmentMap   InvestmentMap @relation(fields: [investmentMapId], references: [id])
  area            Area?    @relation(fields: [areaId], references: [id])
}
```

### 5.3 Funcionalidades

**Mapa de Investimento por Projecto:**
- Criação do mapa com rubricas orçamentais e distribuição por departamento
- Geração automática de tarefas a partir das rubricas (rubrica → lista de tarefas atribuídas ao departamento)
- Vista de execução: orçamentado vs. executado por rubrica, com barras de progresso e alertas de desvio
- Timeline cross-departamento: ver tarefas de todos os departamentos num projecto

**Dashboard Cross-Departamento:**
- Para cada projecto, ver estado por departamento (financeiro 80% completo, multimédia 40%, consultoria 100%)
- Alertas de desvio orçamental (executado > 90% do orçamentado antes de concluir)
- Alertas de atraso por departamento

**Funcionalidades para projectos de candidatura/investimento:**
- Tracking de milestones de financiamento (submissão → aprovação → 1º pagamento → conclusão)
- Indicadores de execução (o Nuno mencionou "confirmar se existiu o cumprimento dos indicadores")
- Geração de evidências de execução por actividade

**Integração com core:**
- As tarefas geradas pelo mapa de investimento são Task normais com `origin: "investment_map"`
- Aparecem no Kanban do projecto filtráveis por rubrica/departamento
- O Maestro consegue reportar estado financeiro de um projecto

---

## 6. MÓDULO: EMAIL INTEGRADO 🔄

> Slug: `email-sync`
> Prioridade: P1
> Base existente: endpoints `/api/sync/gmail` + modelo Interaction

### 6.1 Estado Actual ✅

- Endpoint `/api/sync/gmail` existe (parcialmente implementado)
- Modelo Interaction regista interacções com clientes (incluindo emails)
- SyncLog para tracking de sincronizações

### 6.2 O que Construir 🆕

**Modelo adicional:**

```prisma
model EmailRecord {
  id            String   @id @default(cuid())
  tenantId      String
  
  // Email metadata
  gmailId       String   @unique             // ID no Gmail para dedup
  threadId      String?                       // Thread ID para agrupar
  from          String
  to            String[]
  cc            String[]
  subject       String
  snippet       String?                       // Preview do corpo
  receivedAt    DateTime
  
  // Categorização (AI + manual)
  projectId     String?                       // Projecto associado
  clientId      String?                       // Cliente associado
  personId      String?                       // Pessoa associada
  opportunityId String?                       // Oportunidade associada (se CRM activo)
  
  // Validação AI
  validationStatus String @default("por_confirmar")
  aiConfidence     Float?
  categorizationMethod String?               // "auto_email", "auto_ai", "manual"
  
  // Estado
  isProcessed   Boolean  @default(false)
  direction     String                        // "inbound", "outbound"
  
  createdAt     DateTime @default(now())
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  project       Project? @relation(fields: [projectId], references: [id])
}
```

**Funcionalidades:**

**Categorização automática:**
1. Primeiro tenta match por email do remetente/destinatário → Person → Client → Project
2. Se não encontra, o Maestro analisa assunto e conteúdo e sugere categorização (trust score)
3. Utilizador confirma/edita/rejeita — sistema aprende

**Vistas:**
- Na ficha do projecto: separador "Emails" com todos os emails categorizados nesse projecto
- Na ficha do cliente: separador "Emails" com todo o histórico
- Na ficha da oportunidade (se CRM activo): emails associados ao deal
- Vista global: lista de emails recentes com filtros por projecto/cliente/departamento

**Configuração por tenant:**
- Caixas de email a sincronizar (uma ou mais)
- Frequência de sync (15min, 30min, 1h)
- Regras de exclusão (não sincronizar newsletters, spam, etc.)
- Labels/pastas a ignorar

**Integração com Maestro:**
- Tool `pesquisar_emails` — pesquisa por cliente, projecto, assunto, data
- Sugestão: quando entra email de contacto desconhecido, Maestro sugere criar oportunidade no CRM

---

## 7. MÓDULO: TIMETRACKING 🆕

> Slug: `timetracking`
> Prioridade: P1
> Liga-se a: Task, Person, Project, Area

### 7.1 Problema que resolve

O Nuno descreveu ao detalhe: "para validar o custo de um projecto, desvios em relação ao inicial", "saber a percentagem de horas faturáveis vs. não faturáveis", e "um trabalhador trabalha 8 horas por dia e pode estar em 8 projectos diferentes — regista uma hora em cada." Também há a componente ACT (registo de tempos de trabalho obrigatório por lei).

### 7.2 Modelo de Dados

```prisma
model TimeEntry {
  id          String   @id @default(cuid())
  tenantId    String
  
  // O quê e quem
  personId    String                          // Quem registou
  taskId      String?                         // Tarefa (opcional — pode ser hora sem tarefa)
  projectId   String?                         // Projecto (derivado da tarefa ou manual)
  areaId      String?                         // Departamento (derivado ou manual)
  
  // Quando e quanto
  date        DateTime                        // Dia do registo
  duration    Int                             // Duração em minutos
  startTime   DateTime?                       // Hora início (opcional, para timer)
  endTime     DateTime?                       // Hora fim (opcional)
  
  // Descrição
  description String?
  
  // Tipo
  isBillable  Boolean  @default(true)         // Faturável ou overhead
  
  // Validação
  status      String   @default("draft")      // draft, submitted, approved, rejected
  approvedById String?
  
  // Origem
  origin      String   @default("manual")     // manual, timer, ai_suggestion
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  person      Person   @relation(fields: [personId], references: [id])
  task        Task?    @relation(fields: [taskId], references: [id])
  project     Project? @relation(fields: [projectId], references: [id])
  area        Area?    @relation(fields: [areaId], references: [id])
  approvedBy  Person?  @relation("TimeApprover", fields: [approvedById], references: [id])
}
```

**Adições ao modelo Task existente:**

```prisma
// Adicionar a Task
estimatedHours  Float?                        // Horas estimadas para a tarefa
timeEntries     TimeEntry[]                   // Relação com registos de horas
```

**Adições ao modelo Person existente:**

```prisma
// Adicionar a Person
costPerHour     Decimal?                      // Custo/hora deste recurso
weeklyHours     Float?    @default(40)        // Horas semanais contratadas
```

### 7.3 Funcionalidades

**Registo de Horas (3 modos):**
1. **Manual** — Abrir tarefa, indicar data e duração ("gastei 2h nisto na terça")
2. **Timer** — Botão start/stop na tarefa (o sistema calcula a duração)
3. **Sugestão AI** — O Maestro analisa padrões (tarefa esteve "em curso" durante 3 dias, histórico sugere 6h) e sugere registo com trust score

**Vista Pessoal (Colaborador):**
- Semana actual com entradas por dia
- Total de horas vs. horas contratadas
- Lista de tarefas sem horas registadas (reminder)
- Botão "Submeter semana" para aprovação

**Vista Gestão (Manager/Admin):**
- Dashboard de equipa: horas registadas vs. esperadas por pessoa
- Alertas: quem não registou horas esta semana (configurável — ex: até quinta-feira)
- Aprovação de timesheets submetidos

**Vista Projecto:**
- Horas estimadas vs. horas reais (barra de desvio)
- Custo real do projecto (soma de horas × custo/hora de cada pessoa)
- Breakdown por departamento e por pessoa
- Comparação com orçamento (se módulo cross-projects activo)

**Métricas no Dashboard:**
- Taxa de horas faturáveis vs. não faturáveis (global e por departamento)
- Top 5 projectos por consumo de horas
- Desvio médio (estimado vs. real)
- Horas registadas esta semana vs. semana passada

**Integração com Maestro:**
- Tool `registar_horas` — "registei 3 horas no projecto X tarefa Y"
- Tool `resumo_horas_semana` — "quanto tempo gastei esta semana?"
- Alerta automático: "Faltam registos de horas para terça e quarta-feira"

### 7.4 Configuração por Tenant

```json
{
  "submissionDeadline": "thursday",
  "approvalRequired": true,
  "minimumEntryMinutes": 30,
  "trackBillable": true,
  "alertMissingEntries": true,
  "alertDayOfWeek": "thursday",
  "showCostToManagers": true,
  "showCostToMembers": false
}
```

---

## 8. MÓDULOS EXISTENTES A ADAPTAR

### 8.1 Pipeline de Conteúdo ✅🔄

> Slug: `content-pipeline`

**Existe:**
- ContentItem com id, projectId, title, format, status
- Pipeline: sourceCallDate → scriptPath → videoPath → approvedAt → publishedAt
- Kanban por status (proposta → approved → published)
- AI validation

**Adaptar:**
- Adicionar `tenantId`
- Estados configuráveis (até 10, default 4)
- Labels genéricos (em vez de "script" / "vídeo", permitir campos custom por tenant)
- Tornar opcional — só activo se empresa tem pipeline de conteúdo

### 8.2 Workflows ✅🔄

> Slug: `workflows`

**Existe:**
- WorkflowTemplate com steps, dependências, prazos, assignees
- WorkflowInstance como execução activa
- WorkflowInstanceTask com tarefas geradas

**Adaptar:**
- Adicionar `tenantId`
- Templates partilháveis entre tenants (catálogo global vs. custom do tenant)
- Biblioteca de templates default por tipo de negócio
- Triggers automáticos configuráveis (ex: "quando oportunidade muda para estado X, criar workflow Y")

### 8.3 Feedback & QA ✅🔄

> Slug: `feedback`

**Existe:**
- FeedbackSession com testerName, pagesVisited, duration, aiSummary
- FeedbackItem com type, classification, voiceAudioUrl, voiceTranscript
- Extensão Chrome MV3
- Transcrição Groq (Whisper)
- Conversão feedback → tarefa

**Adaptar:**
- Adicionar `tenantId`
- Extensão Chrome configurável por tenant (apontar para instância correcta)
- Módulo opcional — útil para empresas de software/agências, não para contabilistas

### 8.4 Integrações GitHub ✅🔄

**Existe:**
- GithubRepo, GithubEvent, DevMetricsDaily
- Webhooks (push, PR, issues)
- Task linking (explícito CC-##, implícito por branch)
- Dev status (sem_código → deployed)

**Adaptar:**
- Adicionar `tenantId`
- Completamente opcional — só activo se empresa faz desenvolvimento
- Configuração de repos por tenant

---

## 9. INTEGRAÇÕES EXTERNAS

### 9.1 Integrações Core (incluídas na base) 🔄

| Integração | Estado | Notas |
|-----------|--------|-------|
| Gmail Sync | 🔄 Parcial | Endpoints existem, falta polishing e categorização AI |
| Google Calendar | 🔄 Parcial | Endpoint existe, falta refinamento |

### 9.2 API de Ingestão Genérica 🆕

Endpoint aberto e documentado que aceita dados de sistemas externos (software de contabilidade, ERP, CRM antigo) num formato padronizado.

**Endpoints:**

```
POST /api/integration/ingest/clients
  body: { nif, name, email, phone, address, metadata }
  → Cria ou actualiza Person/Client no tenant

POST /api/integration/ingest/financials
  body: { projectRef, rubric, invoiceRef, amount, date, type }
  → Actualiza dados financeiros no InvestmentMap

POST /api/integration/ingest/contacts
  body: [{ name, email, phone, company, tags }]
  → Importação batch de contactos

GET /api/integration/export/projects
  → Exporta projectos com métricas para sistema externo

GET /api/integration/export/timeentries
  → Exporta registos de horas (para processamento salarial externo)
```

**Auth:** API key por tenant (gerada no painel de admin).

**Objectivo:** O GESC2 ou qualquer outro software de contabilidade pode alimentar o Command Center com dados de clientes e dados financeiros, sem acoplamento directo. O Command Center nunca faz contabilidade — recebe dados e enriquece a visão operacional.

### 9.3 Canais de Notificação 🔄🆕

| Canal | Estado | Notas |
|-------|--------|-------|
| Email (SMTP) | ✅ Existe | Adaptar para multi-tenant |
| Discord | ✅ Existe | Manter como opção |
| Telegram | ✅ Existe | Expandir — bom para automações internas e comunicação de equipa |
| Webhook genérico | ✅ Existe | Manter |
| WhatsApp | 🆕 Novo | Módulo plugável — para notificações e comunicação com clientes externos |

Cada user pode configurar quais canais recebe, por tipo de alerta.

---

## 10. REPORTING E EXPORTAÇÃO 🆕

### 10.1 Dashboards Visuais (in-app)

Toda a informação é visual primeiro — gráficos, barras de progresso, Kanban, organogramas. Nada que exija exportar para perceber o estado.

**Dashboards por módulo:**

| Módulo | Métricas visuais |
|--------|-----------------|
| Core | Projectos por status, saúde, progresso global, alertas |
| CRM | Funil com valores, taxa conversão, tempo médio fecho |
| Cross-Projects | Execução orçamental, desvios, estado por departamento |
| Timetracking | Horas faturáveis vs. overhead, desvio estimado vs. real |
| Email | Emails categorizados vs. pendentes, volume por cliente |

### 10.2 Exportação

**PDF:**
- Relatório de projecto (estado, tarefas, timeline, orçamento)
- Relatório de timesheet (horas por pessoa, por projecto, por semana/mês)
- Roadmap de OKRs
- Estado do pipeline comercial

**Excel:**
- Dados crus de qualquer tabela filtrada (tarefas, horas, oportunidades, etc.)
- Template formatado para timesheets
- Export de contactos/clientes

**Funcionalidade:** Botão "Exportar" presente em todas as vistas de lista e dashboards. O user escolhe formato (PDF ou Excel).

---

## 11. ONBOARDING DE NOVOS TENANTS 🆕

### 11.1 Wizard de Setup

Fluxo guiado na primeira vez que o admin entra:

**Passo 1 — Empresa:**
- Nome da empresa, NIF, sector de actividade
- Idioma preferido (PT-PT / EN)
- Logo (opcional)

**Passo 2 — Departamentos:**
- "Quantos departamentos tem a sua empresa?"
- Sugestão automática baseada no sector (contabilidade: Contabilidade, Consultoria, RH, Administração)
- Pode adicionar/remover/renomear

**Passo 3 — Pessoas:**
- Importar de CSV/Excel ou adicionar manualmente
- Para cada pessoa: nome, email, departamento, role (admin/manager/member)
- Envio de convites por email

**Passo 4 — Módulos:**
- Catálogo visual com descrição e preview de cada módulo
- Cada módulo tem "Activar" com configuração default
- Indicação de preço adicional por módulo

**Passo 5 — Primeiro Projecto:**
- Criação guiada do primeiro projecto
- Sugestão de workflow baseado no sector

### 11.2 Onboarding assistido pelo Maestro

Alternativa ao wizard — o admin conversa com o Maestro:

> "Somos um gabinete de contabilidade com 30 pessoas, 4 departamentos: contabilidade, consultoria, multimédia e administração. Gerimos cerca de 200 projectos de candidaturas a fundos."

O Maestro:
1. Cria o tenant com as áreas
2. Sugere os módulos relevantes (CRM, Cross-Projects, Email, Timetracking)
3. Configura templates default para o sector
4. Pergunta se quer importar pessoas de ficheiro

---

## 12. MIGRAÇÃO DO ESTADO ACTUAL 🔄

### 12.1 Dados Existentes

O Command Center actual tem dados reais do Miguel e Bruno que devem migrar para o primeiro tenant:

| Entidade | Quantidade aprox. | Acção |
|----------|-------------------|-------|
| Users | 2 (Miguel, Bruno) | Associar ao tenant "imexplorearound" |
| Projects | ~5 | Adicionar tenantId |
| Tasks | ~100+ | Adicionar tenantId |
| People | ~10 | Adicionar tenantId |
| Areas | ~5 | Adicionar tenantId |
| Objectives | ~10 | Adicionar tenantId |
| ContentItems | ~20 | Adicionar tenantId |
| Interactions | ~50 | Adicionar tenantId |
| MaestroConversations | Vários | Adicionar tenantId |
| TrustScores | Vários | Manter no tenant |
| FeedbackSessions | Vários | Adicionar tenantId |
| GithubRepos | ~3 | Adicionar tenantId |

### 12.2 Script de Migração

1. Criar tenant "imexplorearound" com todos os módulos activos
2. Adicionar coluna `tenantId` a todas as tabelas (nullable primeiro)
3. Preencher `tenantId` com o ID do tenant criado em todos os registos existentes
4. Tornar `tenantId` not-nullable
5. Adicionar índices compostos (tenantId + campos frequentes de query)
6. Activar Prisma middleware de filtro por tenant
7. Testar que todos os endpoints retornam apenas dados do tenant correcto

### 12.3 O que Mantém, o que Muda

| Componente | Acção |
|-----------|-------|
| Estrutura de directórios | ✅ Mantém — app/, components/, lib/, prisma/ |
| Tech stack | ✅ Mantém — Next.js 16, React 19, PostgreSQL 16, Prisma 7 |
| Server Actions pattern | ✅ Mantém — mesmo padrão com auth + Zod + DB + revalidate |
| Componentes UI | 🔄 Adaptar — adicionar i18n, adaptar a módulos dinâmicos |
| API routes | 🔄 Adaptar — filtrar por tenantId, expandir Agent API |
| Prisma schema | 🔄 Expandir — novos modelos, tenantId em todos |
| Sidebar | 🔄 Adaptar — itens dinâmicos baseados em módulos activos |
| System prompt Maestro | 🔄 Adaptar — dinâmico por tenant, idioma, módulos |
| Integrações (GitHub, Gmail, Calendar) | 🔄 Adaptar — configuração por tenant |
| Design system (Tailwind + custom) | ✅ Mantém — sem component library, tudo custom |

---

## 13. FLUXOS BPM — MAPEAMENTO PARA MÓDULOS

> Referência aos diagramas BPM enviados pela Iniciativa PME

### 13.1 BPM 1 — Marketing/Comercial (lane "Supervisão")

**Fluxo:** Contacto → Qualificação → Lead Scoring → Proposta → Negociação → Fecho → Início Projecto
**Módulo:** `crm` (Pipeline Comercial)
**Estados default sugeridos:** Contacto Inicial, Qualificação, Proposta Enviada, Negociação, Ganho, Perdido

### 13.2 BPM 1 — Operacional

**Fluxo:** Criar dossier → Submissão → Políticas de comunicação → Reclamações → Avaliação de satisfação → Avaliação de sustentabilidade
**Módulo:** `cross-projects` (Gestão Cross-Departamento) + `workflows` (template "Gestão Operacional")
**Mapping:** Dossier de projecto = Project com InvestmentMap. Lançamentos de dados periódicos = tarefas recorrentes via workflow.

### 13.3 BPM 1 — Financeiro

**Fluxo:** Início projecto → Verificar orçamento → Fazer pedido de financiamento → Acompanhar pagamentos → Controlar facturas
**Módulo:** `cross-projects` (InvestmentMap com rubricas e tracking de execução orçamental)
**Dados de contabilidade:** Recebidos via API de Ingestão do GESC2

### 13.4 BPM 1 — Candidaturas a Programas

**Fluxo:** Criação mapa investimento → Indicadores → Verificar alinhamento → Gerar evidências → Follow-up automático
**Módulo:** `cross-projects` + `workflows` (template "Candidatura a Fundos")
**Template default:** Workflow com passos: Análise Elegibilidade → Preparação Candidatura → Submissão → Acompanhamento → Execução → Fecho

### 13.5 BPM 1 — Multimédia/Kick-off

**Fluxo:** Reunião kick-off → Planeamento → Sprints → Entrega → Relatório
**Módulo:** Core (Projects + Phases + Tasks) — é gestão de projecto standard

### 13.6 BPM 2 — Supervisão/Qualificação

**Fluxo:** Qualificação de leads → Lead scoring ABC → Aprovação/Rejeição → Follow-up
**Módulo:** `crm` — parte de qualificação do pipeline comercial

### 13.7 BPM 2 — Inead/Operação

**Fluxo:** Planeamento → Verificação → Net Façade → Orçamento → Sprints → Relatórios → Entrega → MPS/NPS
**Módulo:** Core (Projects) + `cross-projects` + `timetracking`

### 13.8 BPM 2 — Recorrência (Social, Performance, SEO)

**Fluxo:** Planeamento mensal → Aprovação interna → Aprovação cliente → Execução → Relatório → Factura
**Módulo:** `workflows` (template "Serviço Recorrente Mensal") — cria instância automática no dia 1 de cada mês

### 13.9 BPM 2 — Contabilidade

**Fluxo:** Verificar → Analisar → Enviar factura
**Módulo:** Não entra no Command Center — pertence ao GESC2. O Command Center recebe o estado via API de Ingestão.

---

## 14. ROADMAP DE IMPLEMENTAÇÃO

### Fase 0 — Fundação Multi-Tenant (Semanas 1-3)

- [ ] Modelo Tenant + TenantModuleConfig + ModuleCatalog no Prisma
- [ ] Adicionar tenantId a todos os modelos existentes
- [ ] Prisma middleware de filtro automático por tenant
- [ ] Migração dos dados existentes para primeiro tenant
- [ ] JWT com tenantId no payload
- [ ] Tenant resolution (por subdomínio ou header)
- [ ] Sistema i18n básico (PT-PT + EN) com ficheiros de tradução
- [ ] Roles expandidos (admin, manager, member, client)
- [ ] UserModuleAccess para permissões por módulo
- [ ] Sidebar dinâmica baseada em módulos activos
- [ ] Testes: verificar isolamento total entre tenants

### Fase 1 — Módulos P1 (Semanas 4-8)

- [ ] **CRM / Pipeline Comercial**
  - [ ] Modelo Opportunity + OpportunityActivity
  - [ ] Vista Kanban do pipeline (reutilizar @dnd-kit)
  - [ ] Ficha de oportunidade com timeline de actividades
  - [ ] Conversão oportunidade → projecto
  - [ ] Métricas de pipeline no dashboard
  - [ ] Tools Maestro: listar_oportunidades, criar_oportunidade

- [ ] **Timetracking**
  - [ ] Modelo TimeEntry
  - [ ] Adições a Task (estimatedHours) e Person (costPerHour)
  - [ ] Registo manual + timer na tarefa
  - [ ] Vista pessoal (semana do colaborador)
  - [ ] Vista gestão (equipa, aprovações)
  - [ ] Vista projecto (estimado vs. real, custos)
  - [ ] Alertas de horas não registadas
  - [ ] Tools Maestro: registar_horas, resumo_horas

### Fase 2 — Módulos P1 cont. + Integrações (Semanas 9-12)

- [ ] **Email Integrado**
  - [ ] Modelo EmailRecord
  - [ ] Polishing do Gmail sync existente
  - [ ] Categorização automática (email → cliente → projecto)
  - [ ] Vistas de email por projecto e por cliente
  - [ ] Trust score na categorização

- [ ] **Gestão Cross-Departamento**
  - [ ] Modelo InvestmentMap + InvestmentRubric
  - [ ] Geração de tarefas a partir de rubricas
  - [ ] Vista de execução orçamental
  - [ ] Dashboard cross-departamento

- [ ] **API de Ingestão**
  - [ ] Endpoints padronizados (clients, financials, contacts)
  - [ ] Auth por API key de tenant
  - [ ] Documentação da API

### Fase 3 — Onboarding, Export, Polish (Semanas 13-16)

- [ ] **Wizard de Onboarding**
  - [ ] Fluxo guiado de 5 passos
  - [ ] Importação CSV/Excel de pessoas
  - [ ] Onboarding assistido pelo Maestro
  - [ ] Templates default por sector

- [ ] **Exportação**
  - [ ] Export PDF (projectos, timesheets, roadmap, pipeline)
  - [ ] Export Excel (dados crus, listas filtradas)
  - [ ] Botão "Exportar" em todas as vistas

- [ ] **Adaptação dos módulos existentes**
  - [ ] Content Pipeline: tenantId, estados configuráveis
  - [ ] Workflows: tenantId, catálogo de templates partilhável
  - [ ] Feedback: tenantId, módulo opcional
  - [ ] GitHub: tenantId, módulo opcional

- [ ] **Campanhas de Email (CRM sub-módulo)**
  - [ ] Audiências e templates
  - [ ] Envio e métricas básicas
  - [ ] Email de boas-vindas automático

### Fase 4 — Abstracção LLM + Canais (Semanas 17-20)

- [ ] **LLM Gateway**
  - [ ] Camada de abstracção agnóstica
  - [ ] Suporte para modelos locais (Llama, Mistral, Qwen)
  - [ ] Configuração de provider por tenant
  - [ ] Testes com modelo local vs. cloud

- [ ] **Canal WhatsApp**
  - [ ] Integração WhatsApp Business API
  - [ ] Notificações outbound
  - [ ] Comunicação bidirecional básica

- [ ] **Canal Telegram expandido**
  - [ ] Bot com comandos para consulta rápida
  - [ ] Notificações configuráveis
  - [ ] Inline keyboards para acções rápidas (aprovar, rejeitar)

---

## 15. CRITÉRIOS DE SUCESSO

O Command Center SaaS está pronto para mercado quando:

1. **Isolamento total** — Tenant A nunca vê dados do Tenant B, em nenhuma circunstância
2. **Setup em 15 minutos** — Uma PME nova consegue estar operacional (wizard completo, primeiro projecto criado, equipa convidada) em 15 minutos
3. **Zero código por cliente** — Nenhum módulo exige desenvolvimento custom para funcionar
4. **AI útil do dia 1** — O Maestro dá respostas úteis mesmo com pouco histórico
5. **Trust Score funcional** — Após 2 semanas de uso, o sistema já categoriza emails e sugere tarefas com >80% de acerto
6. **PT-PT e EN** — Toda a interface funciona nos dois idiomas sem strings hardcoded
7. **Exportação limpa** — PDFs profissionais e Excels formatados, prontos para enviar a clientes
8. **Downtime zero** — Deploy de novas versões sem interrupção de serviço para tenants existentes

---

## 16. REFERÊNCIAS AOS DOCUMENTOS EXISTENTES

| Documento | Relevância para esta spec |
|-----------|--------------------------|
| `command-center-spec-v1.2.md` | Spec original — funcionalidades core detalhadas |
| `command-center-specs__1_.md` | Specs técnicas — stack, páginas, API, componentes |
| `addendum-github-v1.0.md` | Integração GitHub — mantém-se como módulo opcional |
| `SPECS-CURRENT-STATE.md` | Estado actual completo — referência para migração |
| `call-2026-04-11-transcricao.md` | Requisitos iPME — mapeados na secção 13 |
| `BPM_Iniciativa_PME1.png` | Fluxos comercial, operacional, financeiro, candidaturas |
| `BPM_Iniciativa_PME2.png` | Fluxos supervisão, operação, recorrência, contabilidade |

---

*Documento gerado a 12 de Abril de 2026. Versão 2.0 (SaaS Multi-Tenant + Módulos Plugáveis).*
*Para ser usado como especificação de desenvolvimento com Claude Code.*
*Baseia-se no Command Center existente (v1.2) e nos requisitos da Iniciativa PME.*
