# COMMAND CENTER — Addendum: Dashboard
# Extensão ao documento principal (SPECS-CURRENT-STATE.md, 2026-04-21)
# Depende de: addendum-alinhamento-v2.1.md (modelo de agentes, design system, mapa de ecrãs)
# Versão: 1.0
# Data: 22 Abril 2026

---

## 1. CONTEXTO

O Dashboard actual (`/`) é básico — stats, tasks recentes, alertas, validation panel. Este addendum especifica a **versão ideal** do Dashboard consolidado (direção Bridge, refinada com toques editoriais), incluindo estrutura, comportamento, e roadmap de implementação incremental.

### Princípio

O Dashboard é o **briefing matinal** de quem usa o Command Center. Abres, passas 5-10 minutos a perceber o que aconteceu desde ontem, decides o que fazer hoje, fechas. Voltas quando recebes notificação ou quando precisas de algo específico. Não é um painel de monitorização contínua — para isso há um modo TV alternativo.

O narrador do Dashboard é o **Maestro**. Todo o texto narrativo (hero, feed, sub-linhas) é voz dele. Os 4 papéis (Pipeline, Comms, Ops, QA) aparecem como entidades com estado, mas falam em primeira pessoa apenas nas páginas dedicadas (CRM, aba Dev, Feedback).

### Audiência v1

**Interno** — Miguel e Bruno. Partes pessoais (hero com nome, referências a pessoas concretas, contexto específico do projecto) são permitidas. Quando houver clientes pagantes do CC, o Dashboard será revisitado para generalizar a voz; até lá é dívida conhecida.

### Referências ao documento principal

- Secção 6.1 (Rotas) — `/` muda radicalmente
- Secção 7 (Maestro AI) — o Maestro ganha nova superfície visível (hero, feed, decisões, crew)
- Secção 10 (Integrações) — polling já previsto; reutilização mínima
- Secção 11 (Sprints) — ver §9

---

## 2. POSTURA E MODOS

### 2.1 Modo default · cockpit diário

Optimizado para 5-10 minutos de atenção focada. Navegação rica, interactividade completa, chat do Maestro acessível por botão flutuante bottom-right.

### 2.2 Modo TV · 2º monitor

Vista alternativa da **mesma base** com:

- Abre em **nova janela** (mantém o Dashboard normal no monitor principal)
- **Refresh automático a 60 segundos**
- **Só leitura** — clicar não faz nada; não há decisões, botões, popovers
- **Sem chat** — o botão flutuante do Maestro não aparece
- **Densidade aumentada** — cabe mais informação por cm²

Trigger: botão "Abrir em TV mode" no fundo da coluna de decisões.

---

## 3. ESTRUTURA · 3 COLUNAS

### 3.1 Proporções

Canvas de referência: **1440×900**.

```
 280px          Centro (flex)                 380px
┌─────────┬──────────────────────────────┬──────────────┐
│  CREW   │  HERO                        │  DECISÕES    │
│ COLUMN  │  METRICS STRIP               │              │
│         │  FEED · fluxo da manhã       │  ALERTAS     │
│         │  PROJECTOS · em voo          │              │
│         │                              │  MODO TV     │
└─────────┴──────────────────────────────┴──────────────┘
              TOP NAV · 54px de altura
```

- **Esquerda (280px)** · Crew column — quem está de turno
- **Centro (flex)** · o que aconteceu e o que está em voo
- **Direita (380px)** · o que precisa de ti

### 3.2 Top navigation · 54px

Barra horizontal fina com:

- **Esquerda** — wordmark do brand book Portiqa (`porti_q_a · command` com `q` em itálico latão). Mantém-se enquanto não houver identidade própria do CC.
- **Centro-esquerda** — nav horizontal: `Dashboard · Projetos · CRM · OKRs · Feedback`. Item activo sublinhado em latão.
- **Direita** — data/hora em mono (`QUARTA · 23 ABR · 09:47`) e **pill "Maestro"** com estado:
  - **Verde (viridian)** — Maestro activo normal
  - **Latão** — Maestro tem backlog de escalações
  - **Coral** — Maestro caído (ex: MiniMax a falhar)

O pill é informação real, não decoração. Clicar abre `/maestro` (painel de trás).

**Nota** · Client Hub não aparece no top nav; acede-se via Projeto-detalhe.

### 3.3 Responsive

- **≥1280px** — 3 colunas conforme especificado
- **<1280px** — coluna direita colapsa para **dropdown no top nav**: ícone de sino + contador de decisões, popover compacto (só título + deadline de cada decisão)
- Crew column e centro mantêm-se sempre visíveis

---

## 4. COLUNA ESQUERDA · CREW COLUMN

A Crew column é onde vês "quem está de turno". Materializa o modelo de agentes (Maestro + 4 papéis) definido no `addendum-alinhamento-v2.1.md` §2.

### 4.1 Bloco do Maestro (topo)

Destaque editorial em relação aos papéis:

- **Fundo** ligeiramente tingido de latão (`rgba(200, 163, 94, 0.06)`)
- **Glifo do Maestro** 44×44px (batuta em latão sobre quadrado vazado)
- **Nome** "Maestro" em serif grande (22px) a cor de latão
- **Papel** "Orquestrador do CC" em mono 10px uppercase, cinza
- **Frase viva** em serif italic 12px — a voz dele a narrar o contexto do momento

#### 4.1.1 A frase viva — tom variável por contexto

O Maestro escolhe o tom consoante o estado do sistema:

| Contexto | Exemplo de frase |
|---|---|
| Decisões urgentes | *"Tens 3 decisões — começava pela OpenClaw."* |
| Estado calmo | *"Nada urgente. Pipeline processou 12 leads esta manhã."* |
| Escalação grave | *"OpenClaw bloqueado há 3 dias — é a 3ª vez, precisa de ti."* |
| Fim de dia | *"Dia fechado. Bruno merge PR #412. Amanhã: sign-off Fiscomelres."* |

**Geração**: templates contextuais escolhidos pelo Maestro com base em sinais do sistema (N decisões abertas, severidade máxima, hora do dia, última actividade de cada papel). Não é free-form — é escolha entre variantes pré-definidas com slots dinâmicos. Evita envelhecimento prematuro.

#### 4.1.2 Interacção

**Clicar na frase abre o chat do Maestro com contexto da frase** — ex: clicas em "começava pela OpenClaw", abre o chat pré-preenchido com "Fala-me sobre o estado do OpenClaw". Mantém o Maestro como entidade dialogável.

### 4.2 Lista de papéis

Abaixo do bloco Maestro, lista vertical dos **4 papéis** (Pipeline, Comms, Ops, QA) em cartões densos.

#### 4.2.1 Anatomia do cartão (denso)

Cada cartão contém:

- **Glifo do papel** 24×24px com dot de estado colorido no canto
  - Estados: `live` (viridian) · `pending` (latão) · `thinking` (azure) · `idle` (cinza)
- **Nome do papel** em serif 14px a cor própria
- **Descrição** em sans 10px cinza (ex: "Conversas com clientes e hóspedes")
- **Badge do executor** — mono 10px com borda fina, cor consoante `kind` do executor (ver `CCExecutorBadge` nos atoms)
  - `clawbot` em latão · `claude-code` em viridian · `humano` em cinza neutro
- **Última linha** em serif italic 11px (ex: *"respondi ao Sérgio ontem 17:22"*)
- **Barra de carga** horizontal 2px, cor do papel, preenchimento proporcional ao `load` (0.0–1.0)

Altura aproximada: 130px por cartão. 4 cartões = ~520px.

#### 4.2.2 Estados dinâmicos

| Estado | Condição | Dot |
|---|---|---|
| `live` | Executor activo, com acção nos últimos 15min | Viridian |
| `pending` | Executor aguarda validação humana | Latão |
| `thinking` | Executor em tool-call em progresso | Azure |
| `idle` | Sem actividade nos últimos 60min | Cinza |

#### 4.2.3 Interacção

**Clicar num papel abre a página dedicada**:

- **Pipeline** → `/crm`
- **Comms** → `/project/[slug]` aba Conversas do projecto mais recente com actividade, ou agregado se não houver
- **Ops** → aba Dev do projecto mais recente com actividade
- **QA** → `/feedback`

### 4.3 Autonomy meter (fundo)

Card destacado no fundo da coluna:

- **Kicker** "AUTONOMIA · 7D" em mono 10px uppercase
- **Valor grande** em serif 28px (ex: "87%")
- **Sub-label** em mono 10px uppercase: "DAS ACÇÕES · SEM HUMANO"

#### 4.3.1 Cálculo (v1)

```
autonomy_7d = count(Task where aiExtracted=true
                          AND validationStatus IN ('confirmed', 'auto_confirmado')
                          AND createdAt >= now() - 7 days)
              /
              count(Task where createdAt >= now() - 7 days)
```

Simples, directo, apoia-se em campos que já existem no schema. Evolução para composite (ponderar confirmações sem edição, escalações, acções AI vs humanas em `MaestroAction`) fica para v2.

#### 4.3.2 Interacção

**Clicar vai para `/maestro`** — o painel de trás onde tu vês trust scores por executor, histórico de acções, podes afinar thresholds.

---

## 5. COLUNA CENTRAL

### 5.1 Hero

- **Kicker** em sans 10px uppercase com metadata: `01 · DASHBOARD · MIGUEL`
- **H1** em serif 30px, line-height 1.15, max-width 30ch
  - Estrutura variável por contexto (ver 5.1.1)
  - Números e nomes-chave **clicáveis** (ver 5.1.2)
- **Subtítulo** em serif italic 14px, cinza, max-width 58ch, line-height 1.55
  - Curadoria livre do Maestro — 2-3 frases escolhidas por ele sem estrutura fixa

#### 5.1.1 H1 variável por contexto

O Maestro escolhe entre estruturas consoante o estado do dia. Exemplos representativos:

| Padrão | Quando aparece |
|---|---|
| *"Bom dia, Miguel. Estás a **3 decisões** de um dia limpo."* | Decisões presentes, dia ainda cedo |
| *"**Pipeline** está a queimar — novo lead Tavira + 2 follow-ups."* | Actividade comercial intensa |
| *"**Fiscomelres** precisa de ti — sign-off daqui a 48h."* | Projecto crítico com deadline próximo |
| *"Nada urgente. Tens espaço para **código**."* | Estado calmo, bom para trabalho focado |
| *"**OpenClaw** ainda parado — 3º dia sem decisão."* | Escalação grave, repetida |

Mesma lógica da frase da Crew column: templates com slots dinâmicos, não free-form.

#### 5.1.2 Elementos clicáveis no hero

- **Números** (ex: "3 decisões") → scroll + highlight na coluna direita, na secção correspondente
- **Nomes de projecto** (ex: "Fiscomelres") → `/project/fiscomelres`
- **Nomes de papéis** (ex: "Pipeline") → `/crm`

#### 5.1.3 Subtítulo — curadoria do Maestro

O Maestro escolhe livremente 2-3 frases relevantes. Podem ser estatística, destaque, facto humano, ou mix. Exemplos:

> *"A tripulação processou 34 eventos nas últimas 12h. A Fiscomelres precisa de atenção humana até ao fim do dia. Bruno entra online às 14:00."*

> *"Pipeline classificou 12 leads. Clawbot sugere 2 follow-ups. Ops em sprint de release — PR #412 mergido."*

> *"Dia calmo. Feedback do teste de ontem triado — 2 bugs, 4 ux, 1 pergunta. Passou tudo pelo QA."*

Sem template fixo. O Maestro decide o que vale contar.

### 5.2 Metrics strip · 5 KPIs

Grelha horizontal de 5 cartões com hairline a separar. Cada cartão:

- **Kicker** em sans 10px uppercase · label do KPI
- **Valor grande** em serif 22px · número ou agregado
- **Sub-label** em mono 10px · variação, contexto ou total

#### 5.2.1 Os 5 KPIs adaptados à realidade actual

| # | KPI | Valor | Sub-label | Cor | Fonte |
|---|---|---|---|---|---|
| 1 | **Projetos em risco** | `count(Project where health IN ('warn','block'))` | nomes dos 2-3 mais críticos | Coral se >0, cinza se 0 | `Project.health` |
| 2 | **Decisões hoje** | `count(open decisions today)` | "X bloqueadas · Y hoje" | Latão | Decisões do Maestro |
| 3 | **Feedback por triar** | `count(FeedbackItem where status='pending')` | "N sessões abertas" | Amarelo se >5, cinza se ≤5 | `FeedbackItem.status` |
| 4 | **Dev velocity** | `commits + PRs mergidos últimos 7d` | "vs 7d anteriores" | Viridian se crescer, cinza se igual, coral se descer | `GithubEvent`, `DevMetricsDaily` |
| 5 | **Pipeline valor** | `sum(value × probability of open opps)` | "N opps activas" | Latão | `Opportunity` |

#### 5.2.2 Interacção

Todos os KPIs são **clicáveis com drill-down**:

- **Projetos em risco** → `/cross-projects?filter=at-risk` (ou dashboard filtrado)
- **Decisões hoje** → scroll + highlight na coluna direita
- **Feedback por triar** → `/feedback?status=pending`
- **Dev velocity** → aba Dev do projecto mais recente
- **Pipeline valor** → `/crm`

### 5.3 Feed · fluxo da manhã

#### 5.3.1 Header

- **Título** "Fluxo da manhã" em serif italic 20px
- **Sub-label** em mono 10px: "ÚLT 90 MIN · 34 EVENTOS"

#### 5.3.2 Timeline

Linha vertical hairline à esquerda com dots coloridos (cor do papel que produziu a acção). Cada entrada:

- **Hora** em mono 10px cinza (ex: `09:42`)
- **Nome do papel** em serif 13px a cor do papel
- **Texto narrativo** em sans 13px cinza claro — frase do Maestro a descrever a acção
- **Pill de estado** quando aplicável:
  - `decide` (coral) — precisa de decisão tua
  - `revê` (latão) — precisa de revisão tua
  - `feito` (cinza) — decisão/revisão já resolvida (ver 5.3.5)

#### 5.3.3 Densidade e limite

**6-8 eventos fixos no dashboard.** Link "ver tudo" no fim abre ecrã dedicado (`/maestro/activity` ou `/feed`). O feed não scrolla dentro do dashboard.

Razão: o feed aqui serve "o que aconteceu recentemente que importa". Para forense, há a página dedicada.

#### 5.3.4 Agregação

Eventos do mesmo executor em janela curta (≤15min) **aparecem agregados por default** com opção de expansão.

Exemplo:

> `09:42` · **Pipeline** · Classificou 12 leads em 10 min ▸

Clicar no `▸` expande para:

> `09:42` · Quinta do Vale · Tavira · 6 apts · 84%
> `09:41` · Imobiliária Norte · Porto · 4 apts · 72%
> `09:40` · ... (10 linhas)

Permite manter densidade sem perder granularidade.

#### 5.3.5 Pills accionáveis · comportamento

- **Pill `decide` clicado** → scroll + highlight do card correspondente na coluna direita
- **Pill `revê` clicado** → idem, vai para o card na coluna direita
- **Decisão resolvida** → o evento **fica no feed** com pill `feito` em cinza (não desaparece)

Razão da persistência: o feed é memória das 90 min, não uma vista que se reescreve sozinha. Honesto e consistente com a ordem cronológica.

### 5.4 Projectos em voo

Strip horizontal com cards de projecto. Altura única, densidade fixa.

#### 5.4.1 Anatomia do card

- **Nome** em serif 15px
- **Glifo do executor** do papel responsável (20px) no canto superior direito
- **Cliente** em sans 10px cinza
- **Barra de progresso** horizontal 3px, cor por `health`:
  - `ok` → viridian
  - `warn` → coral
  - `block` → rosa
- **Próximo marco** em mono 9px uppercase — expresso em **dias relativos** (não data absoluta): "9 DIAS · SIGN-OFF", "HOJE · GO-LIVE", "AMANHÃ · WIREFRAMES"

**Borda superior** de 2px na cor do `health` — sinal rápido de estado sem olhar para a barra.

#### 5.4.2 Escopo · "em voo"

**Todos os projectos não-arquivados.** Não há filtro — se tens 5 projectos activos, mostras 5; se tens 10, mostras 10.

#### 5.4.3 Overflow · >5 projectos

**Scroll horizontal** nessa faixa. Mantém altura fixa, aparece com scrollbar subtil. Funciona confortavelmente até ~10 projectos. Se crescer para >15, considerar promoção/demoção (os 5 mais activos em evidência, resto em "ver mais") — fora de escopo da v1.

#### 5.4.4 Interacção

**Clicar no card** → `/project/[slug]`.

---

## 6. COLUNA DIREITA · DECISÕES + ALERTAS + TV MODE

### 6.1 Decisões

#### 6.1.1 Linha Decisão vs Alerta

A coluna distingue explicitamente:

- **Decisão** · alguém espera por ti. Sem a tua acção, o trabalho pára. Tem deadline implícito ou explícito.
- **Alerta passivo** · informação para atenção; podes ignorar sem consequência imediata.

Exemplos:

| Item | Tipo |
|---|---|
| "OpenClaw bloqueado há 3 dias, precisa decisão" | Decisão |
| "Fiscomelres · 2 dias sem interacção do cliente" | Alerta |
| "7 items de feedback aguardam validação" | Decisão |
| "Pipeline classificou 12 leads" | Nenhum (evento de feed) |

#### 6.1.2 Anatomia do card de decisão

- **Header** · tag do papel (cor própria) + deadline em mono latão (ex: "HOJE")
- **Título** em serif 15px
- **Contexto** em sans 12px cinza — 2-3 linhas explicando o porquê
- **Botões** · "Abrir" (primário, latão) + "Adiar" (secundário, hairline)

#### 6.1.3 Limite e overflow

**Top 3 expandidas** com anatomia completa. **Overflow** em versão compacta — só título + deadline, empilhadas verticalmente no fundo.

Se há >7 decisões totais: aparece alerta visual subtil no topo da coluna ("Muitas decisões abertas — considera adiar ou delegar") — apenas sinal, não bloqueia.

#### 6.1.4 Priorização

**O Maestro prioriza** consoante contexto (deadline, severidade, dependências, idade da decisão). Utilizador pode **resetar para cronológico** via toggle no header da coluna ("Ordenar por: Maestro | Mais recente").

#### 6.1.5 Adiar · snooze temporal

Clicar em "Adiar" abre dropdown:

- 1h · 4h · amanhã · próxima semana

A decisão sai da vista e volta no prazo escolhido. Evolução para snooze contextual ("até Bruno estar online", "até cliente responder") fica para v2.

#### 6.1.6 Resolução · auto + manual

Dois caminhos para uma decisão sair da lista:

- **Auto-resolve** — o Maestro detecta que a decisão já não se aplica (ex: cliente respondeu, Bruno desbloqueou). Remove com confiança alta.
- **Manual** — botão "Marcar como resolvido" no card expandido (ou atalho no popover da versão compacta).

Decisões resolvidas nas últimas 24h ficam acessíveis num sub-view ("Resolvidas · 24h") para recuperar caso o Maestro tenha removido algo relevante.

### 6.2 Alertas passivos

Lista vertical simples, densidade alta.

#### 6.2.1 Anatomia

Cada alerta:

- **Faixa colorida** 3px à esquerda · severidade
- **Texto** em sans 12px a cinza claro — 1-2 linhas
- **Tag do papel** em baixo

#### 6.2.2 Severidades · 3 níveis

| Severidade | Cor | Exemplo |
|---|---|---|
| **Block** | Rosa | "OpenClaw · decisão há 3 dias em espera" |
| **Warn** | Coral | "Fiscomelres · 2 dias sem interacção cliente" |
| **Pend** | Latão | "7 items feedback aguardam validação" |

#### 6.2.3 Interacção

- **Clicar** → vai para a fonte (projecto, feedback item, opp, etc.)
- **Não há botão dismiss** — alertas **resolvem-se automaticamente** quando a condição deixa de ser verdadeira

### 6.3 Modo 2º monitor

Card destacado no fundo da coluna:

- **Kicker** "MODO 2º MONITOR" em mono 10px latão
- **Descrição** curta em sans 12px
- **Botão** "Abrir em TV mode"

Comportamento ao clicar: abre nova janela com `?tv=1` (ou rota `/tv`), aplicando comportamento definido em §2.2.

---

## 7. MAESTRO NO DASHBOARD · ONDE APARECE

Inventário das superfícies onde o Maestro tem presença:

| Superfície | Papel |
|---|---|
| Bloco Maestro na Crew column | Identidade + frase viva dialogável |
| Hero H1 e subtítulo | Narrador — voz dele no tópico do dia |
| Pills e anotações do feed | "O Maestro diz que o Pipeline fez X" (narração) |
| Cards de decisão | Apresentação — "isto precisa de ti porque..." |
| Alertas passivos | Curadoria — ele escolhe o que mostrar |
| Top nav · pill "Maestro" | Indicador de saúde dele próprio |
| Botão flutuante bottom-right | Acesso ao chat |

O Maestro **não tem página própria no Dashboard** — o painel de trás está em `/maestro` (trust scores, log de acções, thresholds), separado.

---

## 8. COMPORTAMENTO DINÂMICO

### 8.1 Refresh

**Polling a cada 60 segundos** para feed, actividade dos papéis, alertas, decisões. KPIs do metrics strip podem usar intervalo maior (5 min) se o cálculo for pesado.

SSE (server-sent events) fica para v2 — o chat do Maestro já usa SSE, mas alargar para todo o dashboard adiciona complexidade que não se justifica na v1.

### 8.2 Densidade

Preferência do utilizador em `/settings` · 3 valores:

- `compact` · padding reduzido, body 12px
- `comfortable` · default · padding normal, body 13px
- `spacious` · padding generoso, body 14px

Sem toggle no dashboard — a maioria dos utilizadores não escolhe, e o default cobre-os.

### 8.3 Tema

Preferência em `/settings` · 2 valores:

- `dark` · default · paleta midnight/limestone do brand book
- `light` · paleta invertida (limestone/midnight) do brand book

Sem toggle visível no dashboard (consistente com densidade).

---

## 9. ROADMAP DE IMPLEMENTAÇÃO · SUGESTÃO

O spec acima é o **ideal final**. Para incremental, sugestão de ordem:

### 9.1 Fase 1 · Ossos (~3-5 dias)

Substitui o dashboard actual sem perder funcionalidade.

- Layout 3 colunas + top nav (sem responsive ainda)
- Crew column com bloco Maestro estático + 4 papéis (dados mock se o modelo ainda não está migrado)
- Hero com H1 e subtítulo estáticos
- Feed reaproveitando actividade actual
- Cards de projectos e decisões reaproveitando dados existentes
- Paleta Portiqa aplicada (tokens CSS + Source Serif 4 + Inter)

### 9.2 Fase 2 · Músculo (~5-7 dias)

- Metrics strip com os 5 KPIs
- Autonomy meter com cálculo real
- Alertas passivos + auto-resolve
- Pills `decide`/`revê`/`feito` no feed
- Modo TV funcional

### 9.3 Fase 3 · Voz (~5-7 dias)

- Frase viva do Maestro na Crew column (templates contextuais)
- H1 variável no hero (templates contextuais)
- Subtítulo como curadoria do Maestro
- Priorização inteligente de decisões
- Auto-resolve inteligente

### 9.4 Fase 4 · Refinamentos (~3 dias)

- Agregação expansível no feed
- Hover states e micro-interacções
- Responsive <1280px (colapso da coluna direita para dropdown)
- Tema light
- Densidade configurável

### 9.5 Adiados explicitamente (v2)

- Autonomy meter composite
- Snooze contextual ("até evento")
- Promoção/demoção de projectos quando >15
- SSE em vez de polling
- Multi-tenantização da voz (quando houver clientes pagantes)

---

## 10. DEPENDÊNCIAS

| Depende de | Porquê |
|---|---|
| `addendum-alinhamento-v2.1.md` | Modelo de agentes (Maestro + papéis), design system Portiqa, mapa de ecrãs |
| `addendum-modelo-agentes-v1.0.md` *(a escrever)* | Schema `Role`/`Executor` necessário para Crew column viva |
| `addendum-crm-consolidado-v1.0.md` *(a escrever)* | Pipeline valor no metrics strip depende de schema consolidado de `Opportunity` |

A fase 1 do roadmap pode arrancar antes dos addenda dependentes estarem escritos — usa dados mock ou aproveita o que existe hoje. As fases 2-3 já precisam do modelo de agentes em código.

---

## 11. DECISÕES FECHADAS (resumo)

39 decisões fechadas em discussão iterativa:

**Estrutura** · Cockpit + modo TV · Spec ideal · Audiência interna · 3 colunas 280/flex/380 · Ordem centro hero→metrics→feed→projectos · Responsive direita colapsa <1280px

**Crew column** · Frase Maestro variável · Clicável abre chat · Cartões densos · Clicar abre página dedicada · Autonomy meter ratio de tasks AI · Clicar vai para /maestro

**Hero + Metrics** · H1 variável · Clicáveis · Subtítulo curado · 5 KPIs (Projetos em risco, Decisões hoje, Feedback por triar, Dev velocity, Pipeline valor) · KPIs clicáveis

**Feed + Projectos** · 6-8 fixos + ver tudo · Agregação expansível · Pill decide abre card direita · Decididos ficam com "feito" · Todos não-arquivados · Scroll horizontal · Dias até marco

**Decisões + Alertas + TV** · Decisão espera por ti vs Alerta ignorável · Top 3 + overflow · Maestro prioriza + reset · Snooze temporal · Auto + manual resolve · 3 severidades · Alertas clicáveis · TV nova janela/60s/read-only/sem chat

**Top nav + afinações** · 5 itens (Dashboard/Projetos/CRM/OKRs/Feedback) · Chat só flutuante · Pill Maestro dinâmico · Polling 60s · Densidade em settings · Dark + light do brand book em settings

---

## 12. DECISÕES AINDA ABERTAS

| # | Questão | Contexto |
|---|---|---|
| DB1 | Como tratar decisões resolvidas que reabrem | Ex: cliente respondeu mas não com resposta conclusiva — reabre como nova ou actualiza antiga? |
| DB2 | Multi-língua dos templates do Maestro | Hoje PT-PT first + EN. Templates das frases do Maestro precisam de duas versões ou começa só PT? |
| DB3 | Persistência da ordenação ("Maestro" vs "cronológico") | Fica guardada por utilizador ou reseta a cada sessão? |

Nenhuma destas bloqueia a Fase 1. Decidem-se durante a implementação.

---

_Versão 1.0 · 22 Abril 2026 · Miguel_
_Depende de: addendum-alinhamento-v2.1.md_
_Próximo: `addendum-modelo-agentes-v1.0.md` (schema Role/Executor)_
