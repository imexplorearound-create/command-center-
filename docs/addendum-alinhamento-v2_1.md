# COMMAND CENTER — Addendum: Alinhamento Specs ↔ Designs
# Extensão ao documento principal (SPECS-CURRENT-STATE.md, 2026-04-21)
# Versão: 2.1
# Data: 22 Abril 2026
# Substitui: v2.0 (mesma data)

## Changelog v2.0 → v2.1

- **§4** · Design system deixa de ser "obsidian workshop próprio do CC". CC adopta directamente a paleta e tipografia do brand book Portiqa — decisão pragmática para não duplicar identidade até haver clientes pagantes no CC.
- **§8.2 · B3** · Tema: decisão fechada — dark (default) + light, toggle em `/settings`. Ambos usam cores do brand book Portiqa.
- **§7** · Acrescentadas 3 decisões resultantes da discussão do Dashboard (agora D23, D24, D25 no total).

---

## 1. CONTEXTO

Este documento faz a ponte entre o **estado implementado** descrito em `SPECS-CURRENT-STATE.md` (2026-04-21) e as **decisões de produto** tomadas em discussão iterativa a 22 Abril 2026, tendo por base os designs produzidos no Claude Design. Não é um addendum funcional novo — é um registo de **decisões estruturais** que contaminam todos os módulos do CC e que precisavam de ser fechadas antes de escrever addenda por ecrã.

### Porque uma v2

A v1.0 foi escrita antes da discussão e continha imprecisões herdadas de ficção presente nos designs (nomes de agentes do Portiqa brand book arrastados para o CC, papel "Legal & Fin" inexistente no domínio, sugestão de migração legacy para personas que nunca existiram no código). Esta v2.0 reflecte apenas o que foi explicitamente decidido.

### Princípio

O Command Center v1 foi construído depressa para resolver necessidades internas. Alguns modelos mentais que ficaram em código (agentes anónimos espalhados, 4 módulos separados para Pipeline/Horas/Investimento/Email) não envelhecem bem. Antes de escrever addenda por ecrã, este doc consolida as **4 decisões estruturais** que afectam tudo:

1. Modelo de agentes (Maestro + 4 papéis)
2. Consolidação em CRM único
3. Sistema de design próprio ("obsidian workshop")
4. Mapa dos 6 ecrãs prioritários

### Referências ao documento principal

- Secção 1 (Visão Geral) — lista de módulos precisa de ser revista (§3)
- Secção 3.3 (Roles de utilizador) — inalterado; mantêm-se `admin`/`manager`/`membro`/`cliente`
- Secção 4 (Modelos de Dados) — acrescentam-se `Role` e `Executor`; campos em TrustScore, MaestroAction, FeedbackItem, Task (§2.4)
- Secção 6.1 (Rotas) — candidatos a descontinuação/fusão (§5)
- Secção 7 (Maestro AI) — o modelo mental consolida-se; mecânica de trust score e tools mantém-se (§2.1)
- Secção 10 (Integrações) — sem alterações directas
- Secção 11 (Sprints) — ordem das próximas sprints é afectada (§9)

---

## 2. DECISÃO 1 · Modelo de agentes

### 2.1 Maestro · uma entidade, duas faces

**O Maestro é o único agente nomeado do Command Center.** Corrige a postura de ficção que aparecia nos designs (6 agentes inventados do Portiqa brand book). No CC só existe o Maestro.

Tem duas faces que são a mesma entidade:

- **Chat** — o painel lateral slide-in que já existe em código (MiniMax M2.7 + 20 tools). É como tu falas com ele.
- **Orquestrador** — a camada de decisão que recebe sinais do sistema (acções dos papéis, alertas, feedback, handoffs) e decide o que te mostrar, quando escalar, como narrar. Hoje está implementada dispersa (validation panel, gating, `MaestroAction` log); passa a ter nome explícito.

A razão de serem uma entidade só e não duas é evitar a alternativa ("o chat" + "o sistema anónimo que decide coisas"), que cria dois conceitos para o utilizador e é exactamente a postura de subatribuição de personalidade que queremos evitar.

#### O que o Maestro decide sozinho

- **Priorização da lista do dia** — olha para tudo o que está pendente (decisões, alertas, tasks em revisão, feedback) e escolhe a ordem de apresentação no dashboard. Utilizador pode resetar a ordem (voltar ao cronológico).
- **Detecção de escalações** — quando um papel tem algo acima do trust score dele, o Maestro decide mostrar já, agrupar, ou esperar mais contexto.
- **Narração** — hero line do dashboard, entradas do feed, sub-linhas dos projectos. No dashboard, o narrador é sempre o Maestro.
- **Gestão do trust score** — confirmar/rejeitar acções escreve no score dos executores via Maestro, não directamente.

#### O que escala para ti

- Qualquer acção que ultrapasse o trust score do executor que a propôs
- Contradições entre papéis (ex: Pipeline marca opp como ganha sem sinal de contrato do Comms)
- Acções sensíveis (cap de 50 no trust score, sempre pending — já implementado em §7.1 do spec principal)

#### O que nunca faz sem confirmação explícita

- Mandar mensagens externas em teu nome (emails, outbound, commits)
- Apagar dados de clientes ou projectos
- Mudar roles de utilizadores
- Qualquer efeito em GESC2

### 2.2 Os 4 papéis

O resto da automação do CC organiza-se em **4 papéis fixos na v1** — espaços permanentes no produto, cada um com um executor primário real e um fallback humano. A palavra "papel" é vocabulário interno: o utilizador vê apenas os nomes dos papéis (Pipeline, Comms, Ops, QA).

| Papel | Scope | Executor primário | Fallback humano |
|---|---|---|---|
| **Pipeline** | Quem ainda não é cliente. Leads, opps, email prospect, campaigns de outbound. | Clawbot (ou equivalente) · `crm-skill` | Miguel |
| **Comms** | Quem já é cliente. Conversas pós-venda, updates de projecto, notas de reunião, interacções. | Claude Code · `comms-skill` | Miguel |
| **Ops** | Execução técnica — código, PRs, deploys, CI/CD, testes, infra. | Claude Code · `build-skill` | Bruno (via handoff) |
| **QA** | Triagem de feedback de testers, validação contra critérios, entrega a Ops. | Claude Code · `triage-feedback` | Miguel |

#### Pipeline

- Absorve o CRM actual (`/crm`), a ingestão Gmail (`/email-sync`) e as campanhas de email (`/crm/campaigns`) — ver §3
- Linha com Comms: **Pipeline = prospect, Comms = cliente activo**
- Executor move no kanban com **confirmar/anular** (janela tipo undo do Gmail). Proposta de threshold: movimentos reversíveis só acima de trust score 70; abaixo ficam pending.
- Inbox próprio na página do CRM (painel direito) — acções pendentes ordenadas por prioridade

#### Comms

- Reutiliza o modelo `Interaction` existente + ingestão de calendário (`/api/sync/calendar`)
- Não tem rota dedicada no Tier 1 — aparece como aba "Conversas" dentro de `/project/[slug]` e timeline agregada dentro do Client Hub
- Executor responde a emails de clientes sobre projectos activos, redige updates, sugere agendamentos, sumariza reuniões

#### Ops

- Mantém-se o ecossistema actual (GitHub integration, `/project/[slug]` aba Dev, `GithubRepo`/`GithubEvent`/`DevMetricsDaily`, handoff protocol)
- **Bruno é executor humano do papel Ops** (via handoff) — isto faz o Bruno visível no modelo em vez de canal escondido. O protocolo de handoff torna-se o mecanismo do papel para passar trabalho para ele.
- Inclui CI/testes e validação pré-release (não fica no QA — testes pertencem a quem escreve o código)
- Unificado — não há papel separado para DevOps/Infra no tamanho actual de equipa

#### QA

- Mantém-se o pipeline actual (extensão Chrome, FeedbackSession, FeedbackItem com campos de triagem, Gemini Vision, classifier AI)
- **Fluxo fechado:** QA cria task → Ops pega → Ops resolve → QA valida na próxima ronda
- Item convertido em task vai directamente para o kanban do projecto a que o feedback pertence, com estado `por_confirmar` (camada 2 do trust score)
- **Sem detecção de regressões na v1** — é valor real mas requer embeddings/comparação semântica; fica para v2 se escaparem regressões demais

### 2.3 Trabalho que não pertence a papel nenhum

Nem tudo tem papel. Tasks manuais (escrever proposta, preparar slides, investigar fornecedor) **não pertencem a papel nenhum** — ficam explicitamente manuais, sem executor AI atribuído. Papel é uma relação entre trabalho e automação, não uma categoria de trabalho.

Isto aplica-se a tudo o que não seja Pipeline, Comms, Ops ou QA. Fica arrumado em `Task` sem `roleId` / `executorId`, atribuído a uma Person real.

### 2.4 Modelo de dados proposto

**Nova tabela `Role`** (por tenant, 4 linhas seed):

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | PK |
| `tenantId` | uuid | FK |
| `slug` | string | `pipeline`, `comms`, `ops`, `qa` |
| `name` | string | "Pipeline" (chave i18n) |
| `description` | string | descrição curta mostrada na UI |
| `color` | string | hex do papel |
| `glyphKey` | string | identificador do glifo SVG |
| `order` | int | ordenação na Crew column |

**Nova tabela `Executor`** (por tenant, N por Role):

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | PK |
| `tenantId` | uuid | FK |
| `roleId` | uuid | FK → Role |
| `kind` | enum | `clawbot` / `claude-code` / `mcp` / `humano` / `manual` |
| `name` | string | "Clawbot", "Claude Code · build-skill", "Miguel", "Bruno" |
| `note` | string | sub-linha mostrada na UI ("via Clawbot · crm-skill") |
| `isPrimary` | bool | um primário + fallback humano por papel |
| `personId` | uuid? | FK → Person se `kind=humano` |
| `apiClientId` | string? | identifica executor em chamadas à Agent API |

**Campos a acrescentar em entidades existentes:**

| Entidade | Campo actual | Campo a juntar |
|---|---|---|
| `TrustScore` | `agentId` (ex: `"maestro-chat"`) | `executorId` nullable; `(executorId, extractionType)` passa a ser a chave. Scores antigos (com `executorId=null`) continuam a funcionar como "score por extractionType a nível de tenant" |
| `MaestroAction` | `agentId` | `roleId` + `executorId` |
| `FeedbackItem` | — | `attributedRoleId` (sempre `qa`), `attributedExecutorId` |
| `Task` | `handoffAgentId` | `handoffExecutorId` (FK → Executor do papel Ops com kind=humano) — `handoffAgentId` mantém-se durante transição e cai quando refactor do handoff for feito |
| `Opportunity` | — | `roleId` default = papel `pipeline`; `executorId` quando a acção é automatizada |
| `OpportunityActivity` | — | `executorId` para distinguir acção humana vs automática |

### 2.5 Trust score no novo modelo

A mecânica do spec principal §7.1 mantém-se (5 thresholds 0-30/31-50/51-70/71-90/91-100, deltas `confirmar +2` / `editar 0` / `rejeitar -5`, cap de 50 em acções sensíveis). O que muda é a **chave**: passa de `(agentId, extractionType)` para `(executorId, extractionType)`.

Razão: um trust score é uma reputação construída por acções específicas de um executor específico. Trocar o Clawbot por outro bot no papel Pipeline faz sentido que o score do novo comece do zero — cada executor prova-se.

Quando `executorId` é null (caso do Maestro-chat, que é sempre o mesmo MiniMax), o score colapsa para `extractionType` global — que é o comportamento actual. Compatibilidade backward preservada.

### 2.6 Como o Maestro vê os papéis — modelo passivo/agregador

Adoptado o modelo passivo: **os papéis agem autonomamente dentro dos limites dos respectivos trust scores; o Maestro agrega a vista e dá voz**. Não é o Maestro quem autoriza cada acção de cada papel.

Consequências práticas:

- Os papéis escrevem directamente no sistema (ex: Pipeline move opp no kanban); aparecem no feed do Maestro, mas o Maestro não tem poder de veto em tempo real
- Se amanhã for preciso orquestração activa (Maestro resolver contradições entre papéis, segurar uma acção porque outra é mais urgente), promovemos para modelo activo. Na v1 ficamos no passivo.

### 2.7 Voz · quem fala onde

- **No dashboard**, o narrador é sempre o **Maestro**. Hero line, entradas do feed, sub-linhas — voz dele.
- **Nas páginas dedicadas dos papéis** (CRM para Pipeline, Feedback para QA, Dev para Ops), o papel fala em primeira pessoa com a sua cor.
- **Escalações** aparecem em dois sítios com papéis diferentes:
  - No dashboard: **card autoritativo** na coluna de decisões (título, contexto, botões)
  - No chat: **mensagem conversacional** quando o chat está aberto e tem contexto activo

### 2.8 Ausência de migração legacy

Confirmado na discussão: **os nomes Orion/Aurora/Atlas/Nova/Vega/Polaris nunca existiram no código do CC**. Foram puramente vocabulário do Portiqa brand book arrastado para o design. Em código, `agentId` já era um identificador técnico (`"maestro-chat"`, etc.), não uma persona.

Logo, não há "migração de nomes antigos". O que há é refactor de `agentId` (flat string) para `(roleId, executorId)` — ver §2.4.

---

## 3. DECISÃO 2 · Consolidação em CRM único

### 3.1 Mudança

Hoje existem **4 módulos separados** que fazem parte do pulso comercial:

| Módulo actual | Rota | O que faz |
|---|---|---|
| Pipeline | `/crm` | Opportunities em kanban |
| Horas | `/timetracking` | Log de horas + aprovação |
| Investimento | dentro de Project | Rubric + totalBudget |
| Email | `/crm/campaigns`, `/email-sync` | Ingestão Gmail + campanhas outbound |

A decisão é **consolidar num CRM único** (rota `/crm`) onde o papel Pipeline vê a pessoa inteira — kanban de opps + email in/out + campaigns — e onde as acções automáticas do executor têm um inbox dedicado.

### 3.2 O que consolida vs o que fica fora

| Funcionalidade | Destino |
|---|---|
| Pipeline de opportunities (kanban 5 colunas) | ✅ Vista principal do CRM |
| Campanhas email outbound | ✅ Aba dentro do CRM; modelo `EmailCampaign` mantém-se |
| Ingestão Gmail inbound | ✅ Fonte para o CRM; `/api/sync/gmail` continua |
| Timetracking standalone | ⚠️ Ver §5; candidato a fusão com Projeto ou descontinuação |
| Investimento (rubric de projecto) | ⚠️ Fica em Projeto aba Financeiro; ver §5 |
| Facturação / Contabilidade / Payroll | ❌ Fora — exclusivo de GESC2 |

### 3.3 Integração com GESC2

Mantém-se a regra: **CC e GESC2 conectam via ingestion API genérica**. Quando uma opp é ganha no CRM, passa para GESC2 via `/api/integration/export/projects` (já existe). Facturação, payroll e contabilidade ficam em GESC2.

Nenhum papel do CC — incluindo Pipeline — tem responsabilidade legal/fiscal/contabilística.

### 3.4 Impacto no schema

- `Opportunity` e `OpportunityActivity` — acrescentam `roleId` + `executorId` (§2.4)
- `EmailRecord` e `EmailCampaign` — sem alterações; continuam ligados a `opportunityId`, `projectId`, `clientId`, `personId`
- `TimeEntry` e `InvestmentMap` — decisão em aberto (ver §8)

---

## 4. DECISÃO 3 · Adopção do Design System Portiqa

### 4.1 Mudança

Hoje: Tailwind + Lucide, sem tokens próprios, componentes Shadcn em algumas áreas, sem identidade coerente entre ecrãs.

Passa a ser: **adopção directa da paleta e tipografia do brand book Portiqa** (mesmo design system usado no PMS). Mesmas cores, mesmos tokens, mesmos atoms. CC e PMS partilham identidade visual completa.

### 4.2 Porquê · pragmatismo

A v2.0 propunha um sistema próprio do CC ("obsidian workshop") — mais cool, mais ink, menos gilded que o Portiqa. A decisão foi **não complicar**:

- Um só design system para manter, um só brand book, um só vocabulário visual
- Tu e o Bruno trabalham **uma identidade, não duas**
- Ecrãs onde CC e PMS aparecem lado a lado (ex: sidebar de navegação entre produtos) parecem uma família
- Menos trabalho de design, menos tokens, menos atoms duplicados

### 4.3 Consequência assumida

Quando houver **clientes pagantes do CC que não usam o PMS**, herdarão a estética "Portiqa" (gold editorial, wordmark `porti_q_a`, etc.). Duas leituras possíveis:

- **Casa com identidade coerente** — o cliente compra "produto da casa X" e vê a casa. Aceitável como posicionamento.
- **Problema de neutralidade** — clientes devem sentir-se donos; estética editorial Portuguesa é forte demais para uma PME genérica.

Decisão: **para já fica pragmatismo** (primeira leitura). Revisita-se quando o primeiro cliente pagante do CC sem PMS fizer ruído. Até lá é dívida conhecida.

### 4.4 Tema claro e escuro

**Ambos existem**, ambos usam as famílias de cor do brand book Portiqa:

- **Dark** (default) · Midnight `#0F1B2D` como base, Gold como acento, Gold-Muted como texto principal
- **Light** · Limestone `#FAF7F2` como base, Gold como acento, Midnight como texto principal

Toggle em `/settings`, não visível no UI. Default dark.

### 4.5 Camadas

```
┌─────────────────────────────────────────┐
│ colors_and_type.css (Portiqa)           │ ← tokens do brand book
│ ├── :root                (dark default) │
│ └── .light               (light mode)   │
│ ├── semantic classes                    │ ← .display, .h1, .kicker,
│                                         │   .mono, .pill, .card, .btn
└─────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────┐
│ Tailwind (utilities, layout)            │
└─────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────┐
│ Componentes React (atoms)               │
│ Logo marks, agent glyphs, executor      │
│ badges, role tags, health indicators    │
└─────────────────────────────────────────┘
```

### 4.6 Ficheiros a criar no repo

| Ficheiro | Origem | Notas |
|---|---|---|
| `app/styles/colors_and_type.css` | bundle Portiqa | importar tal qual |
| `app/styles/fonts.css` | bundle Portiqa | Source Serif 4, Inter, JetBrains Mono — self-hosted |
| `public/fonts/` | `.woff2` do bundle | latin + latin-ext |
| `components/atoms/` | atoms do bundle | portar a TS, um componente por ficheiro |

Os JSX do bundle são **protótipos de design, não código de produção** — recriar em React + TS seguindo o visual, não a estrutura interna.

---

## 5. DECISÃO 4 · Mapa dos 6 Ecrãs

### 5.1 Tier 1 · Redesenhar

| # | Ecrã | Rota | Direção |
|---|---|---|---|
| 1 | **Dashboard** | `/` | Bridge consolidado (hero narrativo + metrics strip + crew column + decisões) |
| 2 | **Projeto-detalhe** | `/project/[slug]` | Hero editorial + fases + tabs (Visão geral, Kanban, Conversas, Ficheiros, Financeiro) + side rail |
| 3 | **CRM** | `/crm` | Kanban + inbox do papel Pipeline com acções pendentes |
| 4 | **OKRs** | `/objectives` | Refinamento visual das 3 vistas existentes |
| 5 | **Feedback triagem** | `/feedback/[id]` | 3 colunas — sessões, items, rascunho editável |
| 6 | **Client Hub** | `/project/[slug]/client` | Tema claro editorial |

### 5.2 Tier 2 · Repensar ou fundir

| Rota actual | Destino proposto |
|---|---|
| `/timetracking` | Absorver em Projeto aba Financeiro, ou descontinuar — ver §8 |
| `/email-sync` | Mover para `/settings/integrations` como estado de sync |
| `/crm/campaigns` e sub-rotas | Sub-aba dentro do CRM |
| `/cross-projects` | Avaliar: fusão no Dashboard ou descontinuar — ver §8 |
| `/workflows` | Avaliar: templates fazem sentido ou é cognitive load? — ver §8 |
| `/content` | Avaliar: é crítico ou descontinuar? — ver §8 |

### 5.3 Tier 3 · Manter sem redesign

- `/maestro` — trust score + últimas MaestroActions (admin-only). Continua útil como "painel de trás" do Maestro
- `/areas`, `/people` — CRUD simples
- `/settings`, `/settings/notifications`, `/settings/llm` — preferências
- `/onboarding` — wizard inicial

---

## 6. GAPS · O que os designs mostram e o código/schema ainda não tem

### 6.1 Dashboard
- **Hero line narrativo** — "Bom dia Miguel, estás a 3 decisões de um dia limpo" (computed: count de decisões abertas; voz do Maestro)
- **Metrics strip** — 5 KPIs no topo (MRR, Runway, Pipeline, A atenção, Decisões). Precisa query agregada ou view `DashboardKPI`
- **Autonomy meter** — % das acções nos últimos 7d que foram tomadas sem humano. Derivável de `MaestroAction` / `Task.aiExtracted` / handoffs resolvidos
- **Crew column** — estado por papel (`live`/`pending`/`thinking`/`idle`) + load bar + última linha narrada. Query agregada sobre activity + executors activos
- **Modo 2º monitor** — rota read-only `/tv` ou query param `?tv=1` que ajusta densidade e desliga interacção

### 6.2 CRM
- **Inbox do papel Pipeline** — acções pendentes ordenadas por prioridade AI, com threshold de autonomia editável
- **Confidence por lead** — score visível no card do kanban (hoje existe em Task, falta em `Opportunity`)
- **Janela de undo** para movimentos reversíveis do executor no kanban

### 6.3 OKRs
- **Sparklines** por KR (variação ao longo do tempo) — `OkrSnapshot` já existe; falta query + componente
- **Mapa relacional** — grafo Objetivo → KR → Projeto âncora; SVG custom ou lib leve (reactflow)

### 6.4 Feedback
- **Rascunho editável por item** — `reproSteps[]`, `expectedResult`, `actualResult`, `acceptanceCriteria` já existem no schema; falta UI de edição inline antes de converter em task
- **Voz sincronizada** — scrubber de áudio alinhado com eventos da timeline da sessão

### 6.5 Client Hub
- **Tema claro** — toda a rota muda paleta (ver §4)
- **Narração por agentes** — a timeline é narrada pelo Maestro em vez de mostrar eventos crus
- **"A aguardar ti"** — lista priorizada do que o cliente precisa de decidir/validar/assinar

### 6.6 Projeto-detalhe
- **Aba "Conversas"** — centraliza emails + notas + interactions por projecto (o papel Comms vive aqui)
- **Aba "Financeiro"** — se `InvestmentMap` fica em Projeto

---

## 7. DECISÕES FECHADAS (resumo desta v2.0)

| # | Decisão |
|---|---|
| 1 | Maestro = chat + orquestração; uma entidade, duas faces |
| 2 | 4 papéis fixos na v1 (Pipeline, Comms, Ops, QA) |
| 3 | 1 executor primário + fallback humano por papel |
| 4 | Sem papéis ou executores "vagos" — sempre atribuído |
| 5 | "Papel" é vocabulário interno; utilizador vê só os nomes |
| 6 | Maestro é excepção nomeada, fora do modelo de papéis |
| 7 | Trust score por `(executorId, extractionType)` |
| 8 | Sem migração legacy — Orion/Aurora/etc. nunca existiram no código do CC |
| 9 | Legal & Fin não existe no CC — exclusivo de GESC2 |
| 10 | Maestro prioriza lista do dia (utilizador pode resetar) |
| 11 | Maestro é passivo/agregador (papéis agem autonomamente dentro do trust score) |
| 12 | Maestro narra no dashboard; papéis falam em primeira pessoa nas suas páginas |
| 13 | Chat mantém-se como painel lateral slide-in |
| 14 | Escalações aparecem no dashboard (card) **e** no chat (mensagem) |
| 15 | Pipeline absorve email + campaigns |
| 16 | Linha Pipeline/Comms: prospect vs cliente activo |
| 17 | Executor no kanban do CRM: confirmar/anular (trust ≥70 para reversíveis) |
| 18 | Ops inclui CI/testes e Bruno como executor humano via handoff |
| 19 | QA sem detecção de regressões na v1 |
| 20 | QA→Ops: item convertido vai para kanban do projecto com estado `por_confirmar` |
| 21 | Trabalho manual não pertence a papel nenhum |
| 22 | Facturação/contabilidade/payroll — GESC2, via ingestion API |
| 23 | Design system = adopção directa do brand book Portiqa (sem sistema próprio do CC na v1) |
| 24 | Tema dark (default) + light, ambos com cores Portiqa, toggle em `/settings` |
| 25 | Densidade e tema = preferências de utilizador em `/settings`, sem toggles visíveis no UI |

---

## 8. DECISÕES EM ABERTO

### 8.1 Para o Miguel decidir (produto)

- **A1** · `/timetracking` standalone — absorver em Projeto, manter como vista cross-projecto read-only, ou eliminar?
- **A2** · `/workflows` — são usados hoje ou é dívida aspiracional?
- **A3** · `/content` — é crítico para o negócio ou candidato a descontinuação?
- **A4** · `/cross-projects` — que vistas tem hoje? Alguma é substituível pelo Dashboard?
- **A5** · `Client` + `Person type=cliente` — dobram contextos; consolidar?
- **A6** · Branding próprio do CC quando formos vender a terceiros, ou wordmark partilhado com Portiqa/AURA por agora?
- **A7** · PRR — aparece no CC como projecto interno, vista agregada, ou não aparece de todo?

### 8.2 Para discutir com o Bruno (técnico)

- **B1** · Migração do `agentId → (roleId, executorId)`: destrutiva ou paralela com shims durante 1-2 sprints?
- **B2** · Agent API: header `X-Executor` ou identificação via token? Proposta do addendum: token.

---

## 9. PRÓXIMOS ADDENDA

Ordem sugerida:

1. **`addendum-alinhamento-v2.0.md`** — este documento
2. **`addendum-modelo-agentes-v1.0.md`** — schema `Role` + `Executor`, migração, atoms, Agent API
3. **`addendum-crm-consolidado-v1.0.md`** — absorção de email/campaigns, inbox do papel Pipeline
4. **`addendum-design-tokens-v1.0.md`** — obsidian workshop
5. **`addendum-dashboard-v1.0.md`** — Bridge consolidado com Maestro como narrador
6. **`addendum-client-hub-v1.0.md`** — tema claro, narração, a-aguardar-ti
7. **`addendum-okrs-v1.0.md`** — refinamento das 3 vistas
8. **`addendum-feedback-triagem-v1.0.md`** — 3 colunas, rascunho editável
9. **`addendum-projeto-detalhe-v1.0.md`** — hero + fases + tabs (fecha o ciclo, depende dos outros)

Entre o 2 e o 3, pausar para decidir se há alguma decisão aberta em §8 que vale a pena fechar antes. Em particular, **A5** (Client vs Person cliente) afecta o CRM.

---

## 10. APÊNDICE · Ficheiros do design bundle como referência

| Ficheiro | Uso |
|---|---|
| `command-center/cc-tokens.css` | importar em `app/styles/cc-tokens.css` |
| `command-center/cc-atoms.jsx` | portar a TS em `components/cc/atoms/` |
| `command-center/cc-data.jsx` | exemplos de shapes (`CC_ROLES`, `CC_ACTIVITY_V2`) |
| `command-center/screen-dashboard.jsx` | referência do layout Dashboard |
| `command-center/screen-dashboard-v2.jsx` | variante com Maestro + Papéis explícitos — mais próxima do modelo desta v2.0 |
| `command-center/screen-project.jsx` | layout Projeto-detalhe |
| `command-center/screen-crm.jsx` | layout CRM |
| `command-center/screen-okrs.jsx` | 3 vistas de OKRs |
| `command-center/screen-feedback.jsx` | triagem |
| `command-center/screen-clienthub.jsx` | Client Hub (tema claro) |
| `fonts/` + `fonts.css` | fontes self-hosted |

Os JSX são protótipos; recriar seguindo o visual, não a estrutura interna.

---

_Versão 2.1 · 22 Abril 2026 · Miguel_
_Changelog v2.0 → v2.1: design system = Portiqa directo (§4); B3 tema fechado; +3 decisões da discussão do Dashboard._
_Próxima revisão: após fechar A1-A7 com Miguel e B1-B2 com Bruno._
