# CENTRO DE COMANDO
## Especificação Completa do Produto

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Produto:** Centro de Comando — Plataforma de Gestão de Operações para PMEs  
**Mercado-alvo:** PMEs até 50 trabalhadores, qualquer setor  
**Diferenciador:** AI-First com Maestro como agente central  

---

## Sumário Executivo

O Centro de Comando é uma plataforma de gestão de operações desenhada para PMEs até 50 trabalhadores. O seu diferenciador principal é o Maestro AI — um agente inteligente que faz a maior parte das atualizações automaticamente, ganha autonomia progressivamente com trust score, e pode ser configurado por linguagem natural.

O sistema é construído para a empresa do utilizador mas facilmente adaptável a qualquer setor: software, serviços, comércio, contabilidade, ou qualquer outra atividade. Cada módulo é configurável, e o Maestro ajuda na configuração inicial.

### Módulos Core

1. **Projetos & Tarefas** — Kanban, timeline, mapa relacional. Priorização inteligente.
2. **Clientes & CRM** — Feed de interações, pipeline configurável, agente de recolha.
3. **Workflows** — Templates reutilizáveis, triggers automáticos, áreas operacionais emergentes.
4. **Dev Hub** (opcional) — GitHub bidirecional, ciclo code+Maestro, feedback & QA com SDK.
5. **Objetivos & Roadmap** — Goals, OKRs, KPIs. Progresso cascadeado e atualização automática.
6. **Integrações** — Conectores pré-construídos, conector genérico, Agent API, marketplace futuro.

### Sistemas Transversais

- **Maestro AI** — Agente central com trust score progressivo.
- **Pipeline de Conteúdo** — Workflow especializado pré-construído (não é módulo separado).

### Princípios de Design

- **Navegação híbrida** — Landing page hierárquica com blocos resumo, vista relacional ao expandir.
- **Configuração por linguagem natural** — Com opção tradicional sempre disponível.
- **Trust score progressivo** — AI começa supervisionada, ganha autonomia.
- **Adaptável a qualquer PME** — Tudo configurável, templates por setor.
- **Bidirecionalidade** — Integrações leem e escrevem em ferramentas externas.

---


---

# CENTRO DE COMANDO — Sistema Transversal

## Maestro AI — Agente Central

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O Maestro é o agente AI central do Centro de Comando. É o único ponto de contacto visível para o utilizador — por trás, orquestra agentes especializados que tratam de tarefas específicas (GitHub, emails, conteúdo, etc.), mas o utilizador só fala com o Maestro.

**Analogia:** Um assistente pessoal que tem uma equipa por trás. Tu falas com o assistente, ele delega internamente, e apresenta-te os resultados.

**Princípio fundamental:** Nenhuma informação entra ou sai do Centro de Comando sem passar pelo Maestro. Garante qualidade, consistência, e controlo.

---

## 2. Arquitetura

### 2.1 Maestro Visível + Agentes Invisíveis

```
┌─────────────────────────────────────────┐
│  Utilizador                              │
│  (fala, configura, aprova, rejeita)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  MAESTRO (visível)                       │
│  Interpreta, orquestra, apresenta        │
├─────────────────────────────────────────┤
│  Agentes especializados (invisíveis):    │
│  ├── Agente de análise de código         │
│  ├── Agente de processamento de email    │
│  ├── Agente de extração de calls         │
│  ├── Agente de priorização               │
│  ├── Agente de conteúdo (escrita)        │
│  ├── Agente de publicação                │
│  └── Agente de recolha (clientes)        │
└─────────────────────────────────────────┘
```

O utilizador não sabe (nem precisa de saber) que existem múltiplos agentes. Para ele, é um sistema inteligente que faz muitas coisas.

### 2.2 Agentes Externos (via Agent API)

Agentes que vivem fora do Centro de Comando (OpenClaw, Claude Code, agentes custom) comunicam via Agent API. Os dados passam pelo Maestro antes de serem persistidos.

---

## 3. Trust Score — Autonomia Progressiva

### 3.1 Conceito

O trust score determina quanta autonomia o Maestro tem. Começa com validação total (o humano aprova tudo) e evolui gradualmente para autonomia (o sistema age sozinho nas áreas onde já provou estar correto).

### 3.2 Três Camadas de Dados

| Camada | Descrição | Trust Score | Validação |
|--------|-----------|-------------|-----------|
| 1 — Factuais | Calendar, emails, Drive — dados objetivos | 100% (fixo) | Nenhuma — entram automaticamente |
| 2 — Extraídos por AI | Tarefas, decisões, resumos de calls | 0 → 100 (progressivo) | Conforme threshold |
| 3 — Manuais | Notas, ajustes, correções do utilizador | N/A | Nenhuma — dados humanos são verdade por definição |

### 3.3 Thresholds

| Trust Score | Estado | Comportamento |
|-------------|--------|---------------|
| 0-30 | Aprendizagem | Tudo requer confirmação explícita |
| 31-50 | Calibração | Maioria validada, itens de alta confiança individual (>85%) podem auto-confirmar |
| 51-70 | Confiança | Auto-confirmado por defeito, notificação para revisão |
| 71-90 | Autonomia | Auto-confirmado, sem notificação (visível nos logs) |
| 91-100 | Pleno | Igual a dados factuais |

### 3.4 Regras de Segurança

1. Trust score nunca sobe acima de 70 sem pelo menos 50 confirmações — impedir auto-promoção prematura
2. Trust score decai 1 ponto por semana sem interação — se o utilizador para de validar, o sistema volta a pedir validação
3. Trust score é **por tipo de ação, não global** — o Maestro pode ser bom a criar tarefas mas mau a atribuir prioridades. Cada tipo tem score independente.
4. Reset manual disponível — o utilizador pode resetar qualquer trust score para 0 a qualquer momento
5. Dados financeiros nunca passam de trust score 50 — sempre com validação humana

### 3.5 Categorias de Trust Score

| Categoria | O que mede |
|-----------|-----------|
| Tarefa | Criação de tarefas (título, descrição, projeto) |
| Prioridade | Atribuição de prioridade |
| Responsável (Assignee) | Atribuição de pessoa |
| Decisão | Extração de decisões de calls |
| Resumo | Resumo de calls e interações |
| Conteúdo | Geração de conteúdo (rascunhos, posts) |
| Ligação código-tarefa | Matching de commits/PRs a tarefas |

Cada agente externo (via Agent API) tem o seu próprio conjunto de trust scores.

### 3.6 Fluxo de Validação

```
Maestro cria item (tarefa, decisão, etc.)
       │
       ├── Trust Score < threshold?
       │   └── SIM → Item entra como "por confirmar"
       │            Badge amarelo, botões [Confirmar] [Editar] [Rejeitar]
       │            Aparece na secção "A validar" do dashboard
       │            └── Utilizador age:
       │                ├── Confirma → +2 pontos
       │                ├── Edita e confirma → +0 pontos
       │                └── Rejeita → -5 pontos
       │
       └── NÃO (Trust Score ≥ threshold)
            └── Item entra como "auto-confirmado"
                 Ícone subtil de AI
                 └── Utilizador pode:
                     ├── Ignorar (OK) → +0.5 pontos
                     ├── Corrigir → -3 pontos
                     └── Reverter → reset do trust score
```

---

## 4. Padrão de Interação

### 4.1 Interpretar → Mostrar → Clarificar → Confirmar

Em qualquer pedido do utilizador, o Maestro segue sempre o mesmo padrão:

1. **Interpretar** — entende o que o utilizador quer, mesmo com instruções vagas
2. **Mostrar** — apresenta o que vai fazer (regras criadas, tarefas geradas, configuração)
3. **Clarificar** — se há ambiguidade, pergunta com opções concretas (não perguntas abertas)
4. **Confirmar** — o utilizador valida antes de o Maestro executar

**Nunca aplica sem validar primeiro** (nos casos onde o trust score requer validação).

### 4.2 Configuração por Linguagem Natural

Qualquer configuração pode ser feita por linguagem natural:

- "O Bruno faz tudo o que é código, o Miguel trata de UX" → regras de assignee
- "Quando entra cliente novo, mandar email e criar projeto" → workflow template
- "Quero um objetivo de facturar 200k este ano" → OKR criado
- "Liga-me ao Primavera" → integração configurada

O Maestro interpreta, cria a estrutura, e mostra para validar.

### 4.3 Feedback

O utilizador pode dar feedback ao Maestro de várias formas:

- **Aprovar/Rejeitar** — ações específicas (tarefas, decisões, atribuições)
- **Instruir** — "No futuro, estas tarefas devem ter prioridade alta"
- **Corrigir** — editar uma ação do Maestro (ele aprende com a correção)
- **Dar feedback geral** — "Estás a criar demasiadas tarefas de teste, reduz"

---

## 5. Briefing

### 5.1 Briefing Periódico

O Maestro gera briefings automáticos (frequência configurável):

**Conteúdo do briefing:**

- Resumo de atividade recente (o que aconteceu desde o último briefing)
- Tarefas para hoje (priorizadas)
- Tarefas atrasadas (alertas de accountability)
- Ações pendentes de validação (tarefas criadas por AI)
- Estado dos objetivos (progresso, alertas)
- Clientes que precisam de atenção
- Atividade de desenvolvimento (commits, PRs, deploys)
- Sugestões proativas

### 5.2 Formato Adaptável

O briefing adapta-se ao canal:

- **No Centro de Comando** — painel visual com ações rápidas
- **Via Telegram/WhatsApp** — mensagem resumida com links
- **Via email** — email formatado com resumo e links

### 5.3 Horário

Configurável pelo utilizador. Adapta-se ao horário de trabalho. Não é fixo (não é obrigatoriamente matinal).

---

## 6. Presença na Interface

### 6.1 Landing Page (Dashboard)

O Maestro aparece na parte inferior da landing page com:

- Mensagem resumo do estado atual
- Ações pendentes de validação (com botões rápidos)
- Sugestões proativas
- Botões: "Ver tarefas criadas", "Dar feedback", e ações contextuais

### 6.2 Chat Contextual

Disponível em qualquer vista do sistema. O utilizador pode abrir o chat e falar com o Maestro:

- O Maestro sabe em que vista o utilizador está
- Se está num projeto, o contexto é esse projeto
- Se está num cliente, o contexto é esse cliente
- Respostas e ações são contextualizadas

### 6.3 Ações Rápidas

Em qualquer vista, botões de ação rápida ligados ao Maestro:

- "Criar tarefa" (linguagem natural)
- "Dar feedback" (sobre algo que vê)
- "Perguntar" (dúvida sobre dados ou estado)
- "Configurar" (mudar regras ou comportamento)

---

## 7. Modelo de Dados

### Tabelas

- **TrustScore** — id, empresa_id, agente_id (null para Maestro interno), categoria, score (0-100), confirmações, rejeições, última_atualização
- **MaestroAction** — id, tipo, dados, estado (pendente/confirmado/rejeitado/editado), trust_score_usado, feedback_texto, created_at
- **MaestroInstruction** — id, empresa_id, instrução (texto), tipo (assignee/prioridade/workflow/geral), ativa, created_at
- **BriefingConfig** — id, empresa_id, frequência, hora, canais[], conteúdo_incluído[], timezone

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 1: Projetos & Tarefas

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O módulo de Projetos & Tarefas é o coração do Centro de Comando. Centraliza toda a gestão de trabalho — desde a criação de um projeto até à conclusão da última tarefa. É o módulo que mais interage com todos os outros: as tarefas podem vir de workflows, de clientes, de agentes AI, do Dev Hub, ou ser criadas manualmente.

**Filosofia:** O Maestro AI faz a maior parte das atualizações automaticamente (cria tarefas, atribui, prioriza, move no kanban), mas o utilizador tem sempre controlo total para criar, editar, apagar e configurar manualmente.

**Adaptabilidade:** Tudo é configurável para diferentes empresas e setores — colunas do kanban, tipos de projeto, campos extra, fases, labels. Uma empresa de software terá configurações diferentes de uma empresa de contabilidade.

---

## 2. Vistas

O módulo oferece três vistas complementares. O utilizador navega entre elas dentro de cada projeto.

### 2.1 Kanban

**Colunas por defeito (configuráveis por empresa):**

| Coluna | Descrição |
|--------|-----------|
| Backlog | Tarefas identificadas mas não planeadas para execução imediata |
| A Fazer | Planeadas para execução, prontas para serem iniciadas |
| Em Curso | Alguém está ativamente a trabalhar nela |
| Em Revisão | Trabalho feito, aguarda revisão ou validação |
| Feito | Concluída e validada |

**Funcionalidades:**

- Drag & drop entre colunas (atualiza status automaticamente)
- Filtros por: pessoa, prioridade, origem, tags, workflow associado
- Criar tarefa manual (botão +)
- Criar tarefa por linguagem natural ("Cria uma tarefa para testar o login, prioridade alta, para o Bruno")
- Clicar num cartão abre modal com detalhe completo
- Indicador visual de "parada há X dias" (se > 2 dias sem movimento)
- Badge de workflow quando a tarefa pertence a uma instância de workflow
- Badge de origem quando a tarefa foi criada pelo Maestro ou por agente externo

**Cada cartão mostra:**

- Título (máximo 2 linhas)
- Badge de prioridade (Crítica = vermelho, Alta = laranja, Média = amarelo, Baixa = verde)
- Avatar do responsável (iniciais com cor)
- Origem (manual, AI, workflow, agente externo, integração) + data
- Dev status (se ligado ao GitHub: em desenvolvimento, em review, merged, deployed)
- Indicador de trust score (se criada por AI e pendente de validação — aparece no kanban normal com badge amarelo, não numa secção separada)

### 2.2 Timeline (Gantt)

**Visualização horizontal de tempo:**

- Fases do projeto em barras horizontais
- Fase atual destacada
- Marcos (milestones) como diamantes
- Linha vertical indica a data atual
- Progresso dentro de cada fase (barra preenchida parcialmente)
- Tarefas posicionadas dentro da fase a que pertencem
- Deadlines de tarefas como marcadores dentro das barras

**Interação:**

- Clicar numa fase expande para ver as tarefas dentro dela
- Arrastar extremidades das barras para ajustar datas
- Zoom in/out para ver semanas, meses, ou trimestres

### 2.3 Mapa Relacional

**Vista visual de ligações (conceito híbrido):**

Esta é a vista que distingue o Centro de Comando de ferramentas tradicionais. Mostra visualmente como um projeto se liga a outros elementos do sistema:

- Projeto no centro
- Nós ligados: cliente associado, objetivos que serve, workflows ativos, repos GitHub, membros da equipa
- Cada nó mostra informação resumida (progresso, estado, última interação)
- Clicar num nó navega diretamente para o detalhe desse elemento (não apenas resumo — navegação real)
- Linhas entre nós mostram a natureza da relação (contribui para, pertence a, depende de)

**Exemplo:** O projeto "AURA PMS" no centro, ligado ao objetivo "Facturar 1M€" (contribui 30%), ao cliente "Piloto X" (projeto para), ao repo "aura-pms" (código em), ao workflow "Deploy semanal" (processo ativo), e às pessoas Bruno (dev) e Miguel (gestão).

---

## 3. Anatomia da Tarefa

### 3.1 Campos Base

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Título | Texto (500 chars) | Sim | Descrição curta da tarefa |
| Descrição | Texto longo (Markdown) | Não | Detalhes, contexto, instruções |
| Projeto | Referência | Sim | Projeto a que pertence |
| Status | Enum | Sim | Posição no kanban (backlog, a_fazer, em_curso, em_revisao, feito) |
| Prioridade | Enum | Sim | Crítica, Alta, Média, Baixa |
| Responsável | Referência a Person | Não | Quem está atribuído |
| Deadline | Data | Não | Prazo para conclusão |
| Tags | Lista de strings | Não | Labels personalizáveis |
| Checklist | JSON | Não | Sub-itens dentro da tarefa |

### 3.2 Campos de Origem e Rastreabilidade

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Origem | Enum | manual, maestro, workflow, agente_externo, integracao |
| Criado por | Referência | Pessoa ou agente que criou |
| Agente ID | String | Identificação do agente (se criada por AI) |
| Confiança AI | Decimal (0-100) | Nível de confiança do Maestro na tarefa (se criada por AI) |
| Estado de validação | Enum | pendente, confirmada, editada, rejeitada |
| Workflow Instance | Referência | Se pertence a uma instância de workflow |
| Cliente associado | Referência | Se é uma ação pendente para um cliente |
| Objetivo associado | Referência | Objetivo/KR a que contribui |

### 3.3 Campos de Desenvolvimento (Dev Hub)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Dev status | Enum | sem_codigo, em_desenvolvimento, em_review, merged, deployed |
| Branch | String | Nome do branch no GitHub |
| PR número | Integer | Número do Pull Request |
| PR status | Enum | open, draft, approved, merged, closed |
| PR URL | URL | Link direto para o PR |
| Último commit | Timestamp | Data do último commit associado |
| Método de ligação | Enum | referencia_explicita, branch_match, ai_match |
| Confiança da ligação | Decimal | Se ligada por AI, nível de confiança |

### 3.4 Campos Configuráveis (por empresa)

O sistema permite adicionar campos customizados por tipo de projeto ou por empresa. Exemplos:

- Empresa de construção: "Fase da obra", "Material necessário", "Licença requerida"
- Agência de marketing: "Cliente final", "Campanha", "Canal de publicação"
- Empresa de contabilidade: "Período fiscal", "Tipo de declaração", "NIF do cliente"

Os campos customizados são definidos na configuração da empresa e aparecem no modal de detalhe da tarefa.

---

## 4. Anatomia do Projeto

### 4.1 Campos Base

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Nome | Texto | Sim | Nome do projeto |
| Slug | String (auto) | Sim | Identificador URL-friendly |
| Tipo | Enum (configurável) | Sim | Totalmente configurável pela empresa. Defaults: interno, cliente. Exemplos custom: pessoal, R&D, manutenção, exploratório |
| Descrição | Texto longo | Não | Contexto e objetivos do projeto |
| Estado | Enum | Sim | planeamento, em_curso, pausado, concluido, cancelado |
| Cor | Hex | Sim | Cor identificativa no sistema |
| Health | Enum (auto/manual) | Sim | Verde (on track), Amarelo (atenção), Vermelho (em risco) |
| Progresso | Integer (0-100) | Auto | Calculado a partir das fases e tarefas |

### 4.2 Fases do Projeto

Cada projeto tem fases ordenadas com datas de início e fim. As fases aparecem no Gantt e servem para organizar o trabalho.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Texto | Nome da fase |
| Ordem | Integer | Posição na sequência |
| Data início | Data | Quando começa |
| Data fim | Data | Quando deveria terminar |
| Progresso | Integer (0-100) | Calculado pelas tarefas dentro da fase |

### 4.3 Ligações

Cada projeto pode estar ligado a:

- **Cliente** — empresa cliente para quem o projeto é desenvolvido (ver Módulo 2)
- **Objetivos** — OKRs ou goals a que o projeto contribui (ver Módulo 5)
- **Workflows** — instâncias de workflow ativas dentro do projeto (ver Módulo 3)
- **Repos GitHub** — repositórios de código associados (ver Módulo 4)
- **Equipa** — pessoas com acesso ao projeto, com permissões configuráveis
- **Área operacional** — se o projeto pertence a uma área contínua da empresa

### 4.4 Health Score

O health score de um projeto é calculado automaticamente pelo Maestro com base em:

- Percentagem de tarefas atrasadas (peso: 40%)
- Progresso real vs. progresso esperado pela timeline (peso: 30%)
- Tempo desde a última atividade (peso: 15%)
- Alertas não resolvidos (peso: 15%)

O utilizador pode sobrepor manualmente o health score com justificação. O Maestro respeita o override até nova alteração.

---

## 5. Maestro AI no Módulo

### 5.1 Criação Automática de Tarefas

O Maestro cria tarefas automaticamente a partir de múltiplas fontes:

| Fonte | Como | Trust Score |
|-------|------|-------------|
| Sessões de código (Claude Code, etc.) | Analisa commits e ficheiros alterados, gera tarefas de teste e review | Por categoria (tarefa, prioridade, assignee) |
| Calls com clientes | Extrai tarefas, decisões e compromissos da transcrição | Por tipo de extração |
| Emails (Gmail) | Identifica ações necessárias em emails de clientes | Começa baixo, sobe com validação |
| Agentes externos (OpenClaw, etc.) | Recebe via Agent API, valida e enriquece | Por agente individual |
| Workflows | Gera tarefas quando um passo de workflow é ativado | Automático (sem validação, regra fixa) |

Cada tarefa criada automaticamente segue o fluxo de trust score: se o trust é baixo, aparece como "pendente de validação"; se é alto, entra diretamente no kanban.

### 5.2 Priorização Inteligente

O Maestro recalcula prioridades com base em pesos configuráveis por empresa:

| Fator | Peso por defeito | Descrição |
|-------|-----------------|-----------|
| Deadline próximo | 40% | Quanto mais perto do prazo, maior a prioridade |
| Alinhamento com objetivos | 25% | Tarefas que contribuem para OKRs principais sobem |
| Bloqueador de outros | 20% | Se esta tarefa bloqueia outras, sobe de prioridade |
| Quem pediu | 15% | Cliente > gestor > AI (configurável) |

**Nota:** Estes são os pesos por defeito. Cada empresa pode ajustar os pesos e os fatores conforme a sua realidade. O Maestro pode ajudar na configuração: "Nós priorizamos sempre pelo cliente primeiro" → Maestro ajusta os pesos.

**Re-priorização automática:**

- Diária (hora configurável) — recalcular todas as prioridades antes do briefing
- Quando tarefa nova é adicionada — verificar impacto nas existentes
- Quando deadline passa — escalar para "atrasada" com alerta

### 5.3 Accountability

O Maestro monitoriza e alerta sobre tarefas paradas:

| Condição | Ação | Tom |
|----------|------|-----|
| Tarefa pendente há 2 dias | Menção no briefing | Informativo |
| Tarefa pendente há 3+ dias | Alerta direto: "O que te está a travar?" | Direto, respeitoso |
| Tarefa atrasada (passou deadline) | Alerta diário até resolver | Urgente |
| Tarefa sem prazo há 5+ dias | Sugerir prazo ou arquivar | Suave |
| Pessoa com 10+ tarefas ativas | Alerta de sobrecarga e sugestão de rebalanceamento | Proativo |

**Regra:** Nunca repetir o mesmo alerta mais que 1x/dia. Tom sempre direto mas respeitoso.

### 5.4 Sugestões Proativas

O Maestro sugere ações quando deteta padrões:

- "Esta tarefa não contribui para nenhum objetivo. Está alinhada com a estratégia?"
- "Bruno tem 12 tarefas, Miguel tem 3. Queres rebalancear?"
- "A fase 2 do projeto não tem tarefas. Falta planear?"
- "O objetivo está a 25% do ano e a 5% do progresso. Ajustar?"
- "Há 3 tarefas paradas que dependem da mesma coisa. Resolver o bloqueio desbloqueia tudo."

### 5.5 Regras de Atribuição (Assignees)

O Maestro atribui tarefas seguindo regras configuráveis pelo utilizador. As regras podem ser definidas de três formas:

1. **Linguagem natural** — "O Bruno faz tudo o que é código, o Miguel trata de UX e gestão"
2. **Regras manuais** — tabela de tipo de tarefa → pessoa
3. **Aprendizagem automática** — o Maestro observa padrões de aprovação e aprende

O trust score de atribuição é independente do trust score de criação de tarefas. Auto-sequência disponível: quando uma tarefa de código é concluída com componente frontend, criar automaticamente tarefa de UX review.

---

## 6. Interação Humana

### 6.1 CRUD Completo

O utilizador tem sempre acesso a operações manuais:

- **Criar** tarefa ou projeto (formulário, linguagem natural, ou importação)
- **Editar** qualquer campo de tarefa ou projeto
- **Apagar** / arquivar tarefas e projetos
- **Configurar** colunas do kanban, campos customizados, regras de priorização

### 6.2 Feedback ao Maestro

Em qualquer ação do Maestro, o utilizador pode:

- **Aprovar** — confirma que o Maestro acertou (trust score sobe)
- **Editar** — corrige parcialmente (trust score neutro, Maestro aprende)
- **Rejeitar** — a ação estava errada (trust score desce)
- **Instruir** — dar feedback em linguagem natural ("No futuro, estas tarefas devem ter prioridade alta")

### 6.3 Configuração

Dois modos de configuração, sempre disponíveis:

- **Via Maestro** — "Quero adicionar uma coluna 'Em teste' ao kanban" → Maestro interpreta, mostra preview, confirma
- **Tradicional** — painel de configurações com formulários e opções visuais

---

## 7. Ligações com Outros Módulos

| Módulo | Relação com Projetos & Tarefas |
|--------|-------------------------------|
| Clientes & CRM | Tarefas ligadas a clientes aparecem na ficha do cliente. Projetos tipo "cliente" têm client hub associado. |
| Workflows | Workflows geram tarefas que aparecem no kanban com badge. Conclusão de tarefa pode avançar passo do workflow. |
| Dev Hub | Commits e PRs atualizam dev_status das tarefas. Code sessions geram tarefas de teste/review. |
| Objetivos & Roadmap | Tarefas podem contribuir para Key Results. Progresso de tarefas alimenta progresso de objetivos. |
| Integrações | Emails, eventos de calendar, e dados de ferramentas externas podem gerar tarefas via Maestro. |

---

## 8. Adaptabilidade Multi-Empresa

### 8.1 O que é configurável

| Elemento | Configurável | Como |
|----------|-------------|------|
| Colunas do kanban | Sim | Adicionar, remover, renomear, reordenar |
| Tipos de projeto | Sim | Interno, cliente, ou tipos custom |
| Campos da tarefa | Sim | Campos extra por tipo de projeto ou empresa |
| Fases do projeto | Sim | Cada projeto define as suas fases |
| Labels/Tags | Sim | Cada empresa define as suas |
| Regras de priorização | Sim | Pesos ajustáveis |
| Regras de atribuição | Sim | Por linguagem natural, manual, ou aprendizagem |
| Alertas de accountability | Sim | Thresholds e frequência |

### 8.2 Setup inicial

Duas opções para configuração inicial:

1. **Guiado pelo Maestro** (recomendado) — "Diz-me o que a tua empresa faz e como organizam o trabalho. Eu configuro o sistema." O Maestro pergunta sobre o setor, tamanho da equipa, tipos de projetos, e configura automaticamente. O utilizador revê e ajusta.

2. **Setup tradicional** — Wizard passo a passo com formulários visuais para configurar cada elemento manualmente.

### 8.3 Templates de setor

O sistema vem com templates pré-configurados para setores comuns:

- **Software/Tech** — Kanban com coluna "Em Review", integração GitHub, dev status
- **Agência/Marketing** — Kanban com coluna "Aprovação cliente", campos de campanha
- **Contabilidade** — Kanban simplificado, campos fiscais, deadlines legais
- **Serviços gerais** — Configuração mínima, fácil de adaptar

O Maestro sugere o template com base na descrição da empresa.

---

## 9. API

### 9.1 Endpoints de Projetos

```
GET    /api/projects                              → Lista todos os projetos
GET    /api/projects/{slug}                        → Detalhe de um projeto
POST   /api/projects                               → Criar projeto
PATCH  /api/projects/{slug}                        → Editar projeto
DELETE /api/projects/{slug}                        → Arquivar projeto

GET    /api/projects/{slug}/tasks                  → Tarefas do projeto (filtráveis)
       ?status=a_fazer,em_curso
       &assignee=miguel
       &priority=alta
       &origin=maestro

GET    /api/projects/{slug}/phases                 → Fases do projeto
POST   /api/projects/{slug}/phases                 → Criar fase
PATCH  /api/projects/{slug}/phases/{id}            → Editar fase

GET    /api/projects/{slug}/relationships          → Mapa relacional do projeto
```

### 9.2 Endpoints de Tarefas

```
GET    /api/tasks                                  → Tarefas globais (cross-project)
       ?project=aura-pms
       &assignee=miguel
       &status=em_curso
       &origin=maestro
       &validated=false

POST   /api/tasks                                  → Criar tarefa
PATCH  /api/tasks/{id}                             → Atualizar tarefa
DELETE /api/tasks/{id}                             → Arquivar tarefa

POST   /api/tasks/{id}/validate                    → Validar tarefa AI (confirmar/editar/rejeitar)
POST   /api/tasks/{id}/link-github                 → Ligar tarefa a PR/branch
POST   /api/tasks/{id}/feedback                    → Feedback ao Maestro sobre a tarefa
```

### 9.3 Agent API (para agentes externos)

```
GET    /api/agent/projects                         → Lista projetos (simplificada)
GET    /api/agent/tasks                            → Busca tarefas (filtráveis)
POST   /api/agent/tasks                            → Criar tarefa (via Maestro, com trust score)
PATCH  /api/agent/tasks/{id}                       → Atualizar tarefa
```

Autenticação: Bearer token por agente. Header `X-Agent-Id` identifica o agente. Todos os dados passam pelo Maestro antes de serem persistidos.

---

## 10. Modelo de Dados (Resumo)

### Tabelas principais

- **Project** — id, nome, slug, tipo, estado, health, progresso, cor, descrição
- **ProjectPhase** — id, project_id, nome, ordem, data_inicio, data_fim, progresso
- **Task** — id, título, descrição, project_id, status, prioridade, assignee_id, deadline, origem, confiança_ai, estado_validacao, dev_status, github_branch, github_pr_number, workflow_instance_id, cliente_id, objetivo_id, tags, checklist, campos_custom
- **ProjectMember** — id, project_id, person_id, role, permissões

### Relações

- Project 1:N ProjectPhase
- Project 1:N Task
- Project N:1 Client (opcional)
- Project N:M Objective (via tabela de ligação)
- Project 1:N GithubRepo
- Project N:M Person (via ProjectMember)
- Task N:1 Person (assignee)
- Task N:1 WorkflowInstance (opcional)
- Task N:1 Client (opcional)
- Task N:1 Objective/KeyResult (opcional)

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 2: Clientes & CRM

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O módulo de Clientes & CRM centraliza toda a relação com clientes — desde o primeiro contacto até à gestão contínua. O coração do módulo é o **feed de interações**: um historial cronológico, editável e pesquisável de tudo o que aconteceu com cada cliente.

**Filosofia:** Toda a informação trocada com um cliente deve estar num único sítio, facilmente consultável e editável. O Maestro alimenta o feed automaticamente (calls, emails, agentes), o utilizador complementa e corrige.

**Adaptabilidade:** Pipeline de fases configurável por empresa. Campos customizados por setor. O agente de recolha adapta-se ao canal que o cliente preferir.

---

## 2. Vistas

### 2.1 Lista de Clientes

Vista principal do módulo com todos os clientes, filtrável e ordenável.

**Cada cartão de cliente mostra:**

- Nome da empresa
- Contacto principal
- Fase no pipeline (badge colorido)
- Última interação (tipo + há quanto tempo)
- Health (verde/amarelo/vermelho, baseado em frequência de contacto e tarefas pendentes)
- Projetos associados (badges)
- Valor do pipeline (se aplicável)

**Filtros:** Por fase do pipeline, por health, por responsável, por projeto, por última interação (> 7 dias, > 14 dias, etc.)

**Ordenação:** Por nome, por última interação, por health, por valor.

### 2.2 Ficha de Cliente

Vista detalhada de um cliente individual com toda a informação e o feed de interações.

**Layout:**

A ficha divide-se em três áreas:

1. **Barra de informação** (topo) — empresa, contacto principal, fase no pipeline, última interação, health, projetos associados
2. **Próximos passos** — lista de tarefas pendentes ligadas a este cliente (são tarefas normais do kanban, filtradas por cliente)
3. **Feed de interações** — historial cronológico completo (ver secção 3)

### 2.3 Pipeline

Vista kanban horizontal das fases comerciais.

**Colunas por defeito (configuráveis por empresa):**

| Fase | Descrição |
|------|-----------|
| Lead | Contacto identificado, ainda sem interação significativa |
| Contacto | Primeira conversa realizada, interesse confirmado |
| Proposta | Proposta enviada, aguarda resposta |
| Negociação | Em discussão de termos, preço, âmbito |
| Cliente ativo | Contrato fechado, projeto em curso |

**Funcionalidades:**

- Drag & drop de clientes entre fases
- Valor acumulado por fase (se configurado)
- Filtro por responsável
- Cada empresa pode adicionar, remover ou renomear fases

---

## 3. Feed de Interações (Coração do Módulo)

### 3.1 Conceito

O feed é um historial cronológico de tudo o que aconteceu com o cliente. Mais recente no topo. Cada entrada tem tipo, data, participantes, e conteúdo. O feed é alimentado automaticamente pelo Maestro e complementado manualmente pelo utilizador.

### 3.2 Tipos de Entrada

| Tipo | Descrição | Fonte automática |
|------|-----------|-----------------|
| Call | Chamada ou reunião | Transcrições de calls (Google Meet, etc.) → extração AI |
| Email | Email trocado | Gmail sync — emails de/para contactos do cliente |
| Decisão | Algo que foi decidido | Extraído de calls ou reuniões pela AI |
| Documento | Ficheiro partilhado | Google Drive — ficheiros na pasta do projeto |
| Nota | Observação livre | Entrada manual pelo utilizador |
| Tarefa | Ação criada a partir da relação | Tarefas do kanban ligadas ao cliente |
| Agente | Interação via agente de recolha | Discovery Agent ou agente interno do Centro de Comando |

### 3.3 Cada Entrada Contém

| Campo | Descrição |
|-------|-----------|
| Tipo | Um dos tipos acima (ícone + cor distintos) |
| Data | Quando aconteceu |
| Título | Descrição curta (ex: "Call de requisitos — módulos contabilidade") |
| Corpo | Conteúdo detalhado (resumo da call, texto do email, nota livre) |
| Participantes | Quem esteve envolvido (tags clicáveis) |
| Anexos | Ficheiros associados (link para Drive, documento, etc.) |
| Origem | Manual, AI, sync, agente |
| Estado de validação | Se criada por AI: pendente, confirmada, editada, rejeitada |

### 3.4 Funcionalidades do Feed

- **Filtrar** por tipo (calls, emails, decisões, etc.)
- **Filtrar** por pessoa/participante
- **Filtrar** por data (período)
- **Pesquisar** semântica (entende o sentido, não só palavras exatas — "problemas com prazos" encontra "o timeline está apertado")
- **Pesquisar por voz** — perguntar ao Maestro em linguagem natural: "O que é que o Sérgio disse sobre faturação?"
- **Editar** qualquer entrada (corrigir informação, adicionar contexto)
- **Adicionar nota** manual a qualquer momento (botão + sempre visível)
- **Expandir/colapsar** entradas longas (ex: resumo de call completo)

### 3.5 Alimentação Automática

| Fonte | Frequência | O que faz |
|-------|-----------|-----------|
| Calls (transcrição AI) | Após cada call | Transcreve, extrai resumo, tarefas, decisões, compromissos. Cada item é uma entrada no feed. |
| Gmail | A cada 30 min | Emails onde remetente/destinatário é contacto do cliente. Insere como tipo "email". |
| Calendar | A cada 15 min | Reuniões com contactos do cliente. Cria entrada tipo "call" agendada. |
| Google Drive | A cada hora | Ficheiros novos/modificados em pastas do projeto. Entrada tipo "documento". |
| Agentes externos | Tempo real (via Agent API) | Discovery Agent ou outros agentes registam interações via Maestro. |
| Agente de recolha interno | Tempo real | Conversas do agente de recolha (Opção C) entram diretamente no feed. |

Tudo o que entra automaticamente passa pelo Maestro e respeita o trust score.

---

## 4. Contactos

### 4.1 Estrutura

Cada cliente (empresa) tem um ou mais contactos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Texto | Nome completo |
| Email | Email | Email de contacto |
| Telefone | Texto | Número de telefone |
| Cargo | Texto | Função na empresa |
| É principal | Boolean | Contacto principal (um por cliente) |
| Notas | Texto | Observações sobre este contacto |

### 4.2 Mapeamento Automático

O Maestro mapeia automaticamente contactos a interações:

- Email de sergio@fiscomelres.pt → associa ao contacto "Sérgio" do cliente "Fiscomelres"
- Participante "Sérgio" numa call → associa ao mesmo contacto
- Mensagem de agente de recolha → identifica o contacto pelo canal

Se o Maestro não consegue mapear com certeza, marca como "participante desconhecido" e sugere associação.

---

## 5. Agente de Recolha (Opção C — Híbrido)

### 5.1 Conceito

O agente de recolha é um agente AI que vive dentro do Centro de Comando mas comunica com o cliente pelo canal que o cliente preferir. O objetivo é recolher informação (requisitos, feedback, dados) de forma conversacional, sem que o cliente precise de aprender uma nova ferramenta.

### 5.2 Canais de Comunicação

| Canal | Como funciona |
|-------|--------------|
| Link direto | O cliente recebe um link, abre no browser, e conversa com o agente num chat integrado. **Página branded** com o logo e cores da empresa que usa o Centro de Comando. |
| Email | O agente envia e recebe emails. O cliente responde normalmente ao email. Sem branding do Centro de Comando — transparente. |
| WhatsApp | Via WhatsApp Business API. O cliente fala no WhatsApp, o agente responde. O cliente não sabe que existe um sistema por trás. |
| Telegram | Via Telegram Bot API. O cliente fala no Telegram, o agente responde. Transparente como o WhatsApp. |

**Princípio:** O canal é apenas transporte. A conversa, os dados recolhidos, e todo o contexto vivem dentro do Centro de Comando. O cliente pode mudar de canal a meio sem perder contexto.

### 5.3 Configuração do Agente

O utilizador configura o agente de recolha para cada caso:

- **O que recolher** — requisitos de software, feedback sobre funcionalidade, dados de onboarding, etc.
- **Estrutura** — perguntas guiadas, conversa livre, ou misto
- **Tom** — formal, informal, técnico, acessível
- **Idioma** — português, inglês, ou deteção automática

A configuração pode ser feita por linguagem natural: "Quero um agente que pergunte ao cliente sobre os módulos de contabilidade que precisa, em tom profissional, em português."

### 5.4 Fluxo de Dados

```
Cliente fala (qualquer canal)
       │
       ▼
Agente de recolha (Centro de Comando)
       │
       ▼
Maestro processa
       │
       ├── Cria entrada no feed do cliente (tipo "agente")
       ├── Extrai requisitos/dados estruturados
       ├── Cria tarefas se necessário
       └── Atualiza documento de requisitos (se configurado)
```

### 5.5 Edição de Documento pelo Cliente

Quando o agente de recolha gera um documento de requisitos a partir das conversas, o cliente tem acesso direto para editar:

- O cliente recebe link para o documento (na página branded ou via email)
- Pode editar, corrigir, complementar qualquer campo
- As edições do cliente são registadas no feed de interações
- O Maestro deteta as alterações e pode gerar tarefas ou alertas com base nelas
- O documento mantém histórico de versões (quem alterou, quando, o quê)

### 5.5 Para Outras Empresas

Quando o produto é vendido a outras empresas, cada uma configura os seus agentes de recolha:

- Uma agência de marketing pode ter um agente que recolhe briefings de campanhas
- Uma empresa de contabilidade pode ter um agente que recolhe dados fiscais dos clientes
- Uma empresa de construção pode ter um agente que recolhe especificações de obra

O framework é o mesmo — muda o conteúdo e o contexto.

---

## 6. Maestro AI no Módulo

### 6.1 Monitorização de Clientes

| O que monitoriza | Ação |
|------------------|------|
| Cliente sem interação há 5+ dias | Alerta warning no briefing |
| Cliente sem interação há 10+ dias | Alerta crítico + sugestão de contacto |
| Tarefa pendente para cliente há 3+ dias | Menção no briefing |
| Cliente mudou de fase no pipeline | Notificação + sugestão de próximos passos |
| Padrão de comunicação irregular | Alerta: "A frequência de contacto com X diminuiu" |

### 6.2 Extração AI de Calls

Quando uma call com um cliente é transcrita, o Maestro extrai:

| Extração | Descrição | Onde vai |
|----------|-----------|---------|
| Resumo | 3-5 frases com os pontos principais | Entrada tipo "call" no feed |
| Tarefas | Ações identificadas com responsável e prazo | Kanban do projeto + feed |
| Decisões | O que foi decidido, por quem | Entrada tipo "decisão" no feed |
| Compromissos | Reuniões agendadas, follow-ups prometidos | Calendar + feed |
| Próximos passos | Ações pendentes para o cliente | Lista de próximos passos na ficha |

Cada item extraído entra com o trust score da categoria correspondente. O utilizador valida, edita ou rejeita.

### 6.3 Sugestões Proativas

- "O cliente X tem uma proposta pendente há 10 dias. Queres fazer follow-up?"
- "Detectei que o Sérgio mencionou urgência na última call. Sugiro priorizar as tarefas do projeto dele."
- "O cliente Y não tem projeto associado. Queres criar um?"
- "Há 3 clientes na fase 'Proposta' há mais de 2 semanas. Rever?"

---

## 7. Interação Humana

### 7.1 CRUD Completo

- **Criar** cliente, contacto, entrada no feed (manual)
- **Editar** qualquer informação do cliente, contacto, ou entrada do feed
- **Apagar** / arquivar clientes e entradas
- **Mover** clientes entre fases do pipeline (drag & drop ou manual)
- **Configurar** fases do pipeline, campos customizados, canais do agente de recolha

### 7.2 Feedback ao Maestro

O mesmo padrão do Módulo 1: aprovar, editar, rejeitar, instruir. Aplica-se a todas as entradas automáticas no feed e a todas as sugestões do Maestro.

---

## 8. Ligações com Outros Módulos

| Módulo | Relação com Clientes & CRM |
|--------|---------------------------|
| Projetos & Tarefas | Projetos tipo "cliente" ligam ao CRM. Tarefas com cliente associado aparecem nos próximos passos. |
| Workflows | Workflow "Onboarding cliente" gera tarefas e interações no CRM automaticamente. |
| Dev Hub | Feedback de clientes (via SDK de captura) entra no feed e gera tarefas de correção. |
| Objetivos & Roadmap | Clientes ativos podem alimentar progresso de objetivos (ex: "fechar 5 contratos"). |
| Integrações | Gmail, Calendar, e canais de comunicação alimentam o feed automaticamente. |

---

## 9. Adaptabilidade Multi-Empresa

### 9.1 O que é configurável

| Elemento | Configurável | Como |
|----------|-------------|------|
| Fases do pipeline | Sim | Adicionar, remover, renomear, reordenar |
| Campos do cliente | Sim | Campos extra por setor (NIF, setor, faturação anual, etc.) |
| Campos do contacto | Sim | Campos extra (departamento, horário preferido, etc.) |
| Tipos de interação | Sim | Adicionar tipos custom ao feed |
| Canais do agente de recolha | Sim | Ativar/desativar canais por empresa |
| Regras de alerta | Sim | Thresholds de "sem contacto" configuráveis |
| Health score | Sim | Composto: frequência de contacto (40%) + tarefas pendentes para o cliente (30%) + satisfação/feedback (30%). Pesos ajustáveis. |

### 9.2 Templates de Setor

- **Software/Tech** — Pipeline focado em ciclo de venda B2B (lead, demo, proposta, negociação, contrato)
- **Serviços profissionais** — Pipeline focado em relação contínua (prospect, consulta inicial, proposta, projeto ativo, manutenção)
- **Comércio** — Pipeline simplificado (contacto, orçamento, venda, pós-venda)

---

## 10. API

### 10.1 Endpoints de Clientes

```
GET    /api/clients                                → Lista clientes (filtráveis)
       ?pipeline_stage=proposta
       &health=vermelho
       &last_interaction_before=2026-04-01

GET    /api/clients/{id}                           → Detalhe do cliente
POST   /api/clients                                → Criar cliente
PATCH  /api/clients/{id}                           → Editar cliente
DELETE /api/clients/{id}                           → Arquivar cliente

GET    /api/clients/{id}/contacts                  → Contactos do cliente
POST   /api/clients/{id}/contacts                  → Adicionar contacto
PATCH  /api/clients/{id}/contacts/{cid}            → Editar contacto

GET    /api/clients/{id}/interactions               → Feed de interações (paginado, filtrável)
       ?type=call
       &person=sergio
       &search=faturação
       &page=1&limit=20

POST   /api/clients/{id}/interactions               → Adicionar entrada manual
PATCH  /api/clients/{id}/interactions/{iid}         → Editar entrada
POST   /api/clients/{id}/interactions/{iid}/validate → Validar entrada AI

GET    /api/clients/{id}/next-steps                 → Tarefas pendentes para este cliente
GET    /api/clients/{id}/relationships              → Mapa relacional do cliente
```

### 10.2 Endpoints do Pipeline

```
GET    /api/pipeline                               → Fases e clientes por fase
GET    /api/pipeline/config                        → Configuração do pipeline
PATCH  /api/pipeline/config                        → Editar fases
```

### 10.3 Agent API

```
POST   /api/agent/interactions                     → Registar interação (via Maestro)
POST   /api/agent/clients/{id}/collect             → Enviar dados do agente de recolha
GET    /api/agent/clients                          → Lista clientes (simplificada)
```

---

## 11. Modelo de Dados (Resumo)

### Tabelas principais

- **Client** — id, nome, pipeline_stage, health, responsavel_id, ultimo_contacto, valor_pipeline, campos_custom
- **ClientContact** — id, client_id, nome, email, telefone, cargo, is_primary, notas
- **Interaction** — id, client_id, project_id, tipo, titulo, corpo, data, participantes, anexos, origem, confianca_ai, estado_validacao
- **PipelineConfig** — id, empresa_id, fases (JSON ordenado), created_at
- **CollectionAgent** — id, client_id, config (JSON: o que recolher, tom, idioma), canal, estado

### Relações

- Client 1:N ClientContact
- Client 1:N Interaction
- Client N:1 Project (opcional, pode ter vários)
- Client N:1 Person (responsável)
- Interaction N:M Person (participantes)
- Interaction N:1 Project (contexto)
- CollectionAgent N:1 Client

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 3: Workflows

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O módulo de Workflows gere processos recorrentes e reutilizáveis da empresa. Em vez de cada utilizador reinventar os passos de "onboarding de cliente" ou "fecho mensal", esses processos são codificados como templates. Quando é preciso executar, instancia-se o template e o sistema gera tarefas, acompanha progresso, e gere dependências automaticamente.

**Filosofia:** Os workflows são a ponte entre estratégia e execução. Um workflow bem definido garante que processos críticos são seguidos consistentemente, independentemente de quem os executa. O Maestro monitoriza a execução e intervém quando algo fica parado.

**Adaptabilidade:** Cada empresa define os seus próprios workflows. O sistema vem com templates de setor pré-construídos, mas tudo é customizável. A criação pode ser feita por linguagem natural ou por formulário tradicional.

---

## 2. Vistas

### 2.1 Biblioteca de Templates

Lista de todos os templates de workflow disponíveis na empresa.

**Cada template mostra:**

- Nome e descrição
- Área operacional a que pertence (se aplicável)
- Número de passos
- Duração estimada
- Quantas vezes foi usado
- Tipo de trigger (manual, recorrente, evento)
- Última utilização
- Botão "Iniciar" (cria nova instância)
- Botão "Editar" (modificar template)

**Filtros:** Por área, por trigger, por frequência de uso.

### 2.2 Instâncias em Curso

Lista de workflows ativos com progresso.

**Cada instância mostra:**

- Nome (ex: "Onboarding — Ana Silva")
- Template de origem
- Área e/ou projeto associado
- Progresso (X/Y passos, barra percentual)
- Próximo passo pendente
- Quem é responsável pelo próximo passo
- Há quanto tempo está parado (se aplicável)
- Estado (em curso, pausado, cancelado)

**Filtros:** Por estado, por área, por template, por responsável.

### 2.3 Vistas Dedicadas de Workflows Especializados

Qualquer workflow suficientemente importante pode ganhar a sua própria vista visual dedicada — um atalho que apresenta as instâncias desse workflow de forma otimizada, sem precisar de navegar pela biblioteca geral.

**Pipeline de conteúdo (pré-construído):**

Vista kanban específica para criação de conteúdo:

| Coluna | Descrição | Quem |
|--------|-----------|------|
| Ideia | Temas sugeridos pelo Maestro ou criados manualmente | AI / Humano |
| Rascunho | Texto gerado pelo agente de escrita | AI |
| Revisão | Humano revê e edita o conteúdo | Humano |
| Produção | Visual, vídeo ou material de suporte em criação | AI |
| Aprovação | Resultado final aguarda aprovação | Humano |
| Publicado | Conteúdo publicado com data e plataforma | AI |

**Outros workflows especializados (configuráveis pela empresa):**

Qualquer empresa pode promover um workflow a "vista dedicada". Exemplos:

- **Empresa de contabilidade:** vista dedicada para "Fecho mensal" com os passos visuais
- **Agência:** vista dedicada para "Ciclo de campanha" com kanban personalizado
- **Software:** vista dedicada para "Release pipeline" com passos de dev → teste → staging → produção

A vista dedicada é um atalho visual — por baixo são tarefas normais de instâncias de workflow.

### 2.4 Detalhe de Instância

Vista completa de uma instância ativa:

- Todos os passos com estado (concluído, em curso, bloqueado, pendente)
- Dependências visuais (que passo depende de qual)
- Responsável de cada passo
- Prazos relativos (dia 1, dia 3, dia 7...)
- Checklist dentro de cada passo
- Timeline de execução (quando cada passo foi concluído)

---

## 3. Anatomia de um Template

### 3.1 Campos do Template

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Texto | Nome do workflow (ex: "Onboarding novo colaborador") |
| Descrição | Texto | Contexto e objetivo do workflow |
| Área | Referência | Área operacional associada (RH, Operações, etc.) — opcional |
| Projeto | Referência | Projeto associado — opcional |
| Trigger | Enum | manual, recorrente, evento |
| Config do trigger | JSON | Se recorrente: frequência (mensal, semanal). Se evento: qual evento dispara. |
| Duração estimada | Integer (dias) | Duração total estimada |
| Versão | Integer | Versionamento do template (editar cria nova versão) |
| É ativo | Boolean | Templates desativados não aparecem na biblioteca |

### 3.2 Campos de Cada Passo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Título | Texto | Nome do passo (ex: "Criar conta no sistema") |
| Descrição | Texto | Instruções detalhadas |
| Ordem | Integer | Posição na sequência |
| Responsável por defeito | Enum ou Ref | Role ("manager", "rh", "mentor") ou pessoa fixa |
| Prazo relativo | Integer (dias) | Prazo em dias a partir do início da instância |
| Prioridade | Enum | Crítica, Alta, Média, Baixa |
| Dependências | Lista de ordens | Passos que devem estar concluídos antes (ex: [1, 2]) |
| É opcional | Boolean | Pode ser saltado sem bloquear os seguintes |
| Checklist | JSON | Sub-itens dentro do passo |

### 3.3 Tipos de Trigger

| Trigger | Descrição | Exemplo |
|---------|-----------|---------|
| Manual | Alguém clica "Iniciar" na biblioteca | Onboarding de colaborador — inicia quando há contratação |
| Recorrente | Dispara automaticamente em intervalos | Fecho mensal contabilidade — dia 1 de cada mês |
| Evento | Dispara quando algo acontece no sistema | Novo cliente ativo no pipeline — dispara "Setup projeto cliente" |

**Eventos disponíveis para trigger:**

- Novo cliente criado ou muda de fase no pipeline
- Novo projeto criado
- Tarefa concluída (específica)
- PR merged no GitHub
- Deploy concluído (ou falhado)
- Objetivo atinge threshold (ex: 80%)
- Data específica no calendar

**Comportamento do trigger automático (evento):**

O arranque automático depende do trust score do trigger:

- Trust score baixo: o Maestro notifica "O evento X disparou o workflow Y. Queres iniciar?" — aguarda confirmação
- Trust score alto: o workflow arranca automaticamente e o Maestro notifica que arrancou
- O trust score do trigger é independente por workflow — um workflow de onboarding pode ter trust alto (sempre funciona bem) enquanto um de release pode ter trust baixo (precisa de validação)

---

## 4. Como os Workflows Geram Tarefas

Quando uma instância é criada (manual, recorrente, ou por evento):

1. O sistema lê os passos do template
2. Para cada passo, cria uma **tarefa real** na tabela de tarefas do Módulo 1:
   - `título` = título do passo
   - `descrição` = descrição + checklist
   - `assignee_id` = pessoa resolvida (do role ou pessoa fixa)
   - `deadline` = data de início da instância + prazo relativo em dias
   - `project_id` ou `area_id` = conforme o template
   - `status` = "a_fazer" se não tem dependências, "backlog" se tem dependências pendentes
   - `workflow_instance_id` = referência à instância
3. Regista a ligação na tabela `workflow_instance_tasks`
4. Quando uma tarefa do workflow é concluída, o sistema verifica se as dependências dos próximos passos estão satisfeitas → se sim, move-os para "a_fazer"
5. Quando todos os passos obrigatórios estão concluídos → instância marcada como "concluído"
6. **Quando um passo falha ou é rejeitado** → o Maestro pergunta ao utilizador o que fazer: "O passo X do workflow Y foi rejeitado por [pessoa]. Queres: saltar este passo, pausar o workflow, ou cancelar?" O workflow fica em espera até o utilizador decidir.

**As tarefas de workflow aparecem no kanban normal** — com um badge extra que indica o workflow de origem (ex: "Workflow: Onboarding Ana"). Filtros no kanban permitem separar tarefas de workflow das restantes.

**Sistema unificado:** Não existem dois sistemas separados. Tarefas são tarefas, venham de workflows, de projetos, ou de criação manual.

---

## 5. Áreas Operacionais (Conceito Emergente)

### 5.1 O que são

Áreas operacionais representam departamentos ou funções contínuas da empresa que não têm data de fim (ao contrário dos projetos). Exemplos: RH, Financeiro, Operações, Comercial.

### 5.2 Abordagem Emergente

Em vez do utilizador criar áreas manualmente antes de trabalhar, o Maestro **sugere áreas a partir de padrões observados**:

1. O utilizador cria workflows, tarefas e processos normalmente
2. O Maestro deteta agrupamentos (ex: 3 workflows + 12 tarefas recorrentes todas sobre finanças)
3. Sugere: "Estou a ver que tens vários processos financeiros. Queres organizá-los numa área operacional chamada 'Financeiro'?"
4. O utilizador confirma ou ajusta
5. A área é criada e os workflows/tarefas são associados

### 5.3 Criação Manual

O utilizador pode sempre criar áreas manualmente se já sabe o que precisa. As duas abordagens coexistem.

### 5.4 O que uma Área Contém

- Workflows associados (templates e instâncias)
- Tarefas recorrentes
- Pessoas responsáveis
- KPIs/métricas da área (se configurados nos Objetivos)

---

## 6. Criação por Linguagem Natural

### 6.1 Como Funciona

O utilizador descreve o processo em linguagem natural e o Maestro converte em template:

**Exemplo de input:**
"Quando entra um cliente novo, quero mandar email de boas-vindas, criar pasta no Drive, criar projeto no sistema, agendar call de kickoff para a semana seguinte, e depois de 30 dias fazer uma reunião de revisão."

**Maestro interpreta e mostra:**

1. Enviar email de boas-vindas — Responsável: gestor de conta — Dia 1
2. Criar pasta no Drive — Responsável: admin — Dia 1
3. Criar projeto no sistema — Responsável: admin — Dia 1 — Depende de: 2
4. Agendar call de kickoff — Responsável: gestor de conta — Dia 5
5. Reunião de revisão 30 dias — Responsável: gestor de conta — Dia 30 — Depende de: 4

**Trigger sugerido:** Evento — quando cliente muda para fase "Cliente ativo" no pipeline.

O utilizador revê, ajusta, e confirma. O template é guardado na biblioteca.

### 6.2 Padrão de Interação

O mesmo de sempre: interpretar → mostrar → clarificar (se ambíguo) → confirmar. O Maestro pergunta quando não tem certeza ("Quem é o gestor de conta? Pessoa fixa ou role?").

---

## 7. Maestro AI no Módulo

### 7.1 Monitorização de Instâncias

| O que monitoriza | Ação |
|------------------|------|
| Passo parado há 2+ dias | Alerta no briefing |
| Passo parado há 5+ dias | Alerta direto ao responsável |
| Workflow bloqueado por dependência externa | Identificar o bloqueio e sugerir resolução |
| Passo concluído mas não marcado | Sugerir: "Este passo parece concluído, queres marcar?" |
| Todos os passos concluídos | Notificar e fechar instância |
| Prazo de passo próximo | Alerta preventivo ao responsável |

### 7.2 Sugestões Proativas

- "O workflow de onboarding tem 3 passos que são sempre editados. Queres atualizar o template?"
- "Detecto que fazes sempre X antes de Y. Queres adicionar esse passo ao template?"
- "Este workflow nunca foi usado. Queres arquivar ou está planeado?"
- "Há 5 workflows financeiros. Queres organizá-los numa área 'Financeiro'?"

### 7.3 Orquestração de Agentes no Conteúdo

Para o workflow de conteúdo, o Maestro orquestra agentes especializados:

| Passo | Agente | O que faz |
|-------|--------|-----------|
| Ideia | Maestro | Analisa calls, tendências, e sugere temas |
| Rascunho | Agente de escrita | Gera texto adaptado à plataforma |
| Produção | Agente de design | Gera visual ou sugere template (via integrações: Canva, etc.) |
| Publicação | Agente de publicação | Agenda e publica via APIs das plataformas |

Os passos "Revisão" e "Aprovação" são sempre humanos. O trust score dos agentes de conteúdo é independente.

---

## 8. Interação Humana

### 8.1 CRUD Completo

- **Criar** template (linguagem natural ou formulário), instância, passo
- **Editar** template (cria nova versão), instância em curso, passos individuais
- **Apagar** / arquivar templates e instâncias
- **Pausar / retomar** instâncias em curso
- **Cancelar** instância (com registo de motivo)
- **Saltar** passos opcionais

### 8.2 Editor de Template

Interface visual para criar/editar templates:

- Lista de passos (ordenáveis por drag & drop)
- Formulário por passo (título, descrição, responsável, prazo, dependências, checklist)
- Visualização de dependências (diagrama simples)
- Preview: "Se iniciado hoje, a timeline seria..."
- Teste: "Simular execução" (dry run sem criar tarefas reais)

---

## 9. Ligações com Outros Módulos

| Módulo | Relação com Workflows |
|--------|----------------------|
| Projetos & Tarefas | Workflows geram tarefas no kanban. Badge de workflow nas tarefas. Conclusão de tarefa avança passo. |
| Clientes & CRM | Eventos de pipeline podem disparar workflows. Workflow de onboarding cliente. |
| Dev Hub | Deploy falhado pode disparar workflow de hotfix. PR merged pode disparar workflow de release. |
| Objetivos & Roadmap | Workflows podem contribuir para KPIs (ex: "processos de onboarding concluídos/mês"). |
| Integrações | Passos de workflow podem incluir ações em ferramentas externas (enviar email, criar pasta Drive, etc.). |

---

## 10. Adaptabilidade Multi-Empresa

### 10.1 Templates Pré-Construídos

O sistema inclui templates de setor prontos a usar:

**Universais (todos os setores):**
- Onboarding de novo colaborador
- Onboarding de novo cliente
- Fecho mensal financeiro
- Ciclo de feedback trimestral

**Software/Tech:**
- Pipeline de conteúdo (ideia → publicação)
- Setup de novo projeto
- Release/deploy
- Retrospectiva de sprint

**Serviços profissionais:**
- Ciclo de proposta comercial
- Entrega de projeto ao cliente
- Follow-up pós-projeto

### 10.2 O que é configurável

| Elemento | Configurável |
|----------|-------------|
| Templates | Totalmente — criar, editar, versionar |
| Passos | Totalmente — adicionar, remover, reordenar, editar |
| Roles de responsável | Sim — definir roles por empresa ("gestor", "técnico", etc.) |
| Triggers | Sim — adicionar eventos custom |
| Áreas operacionais | Sim — criar manualmente ou aceitar sugestão do Maestro |
| Vista de conteúdo | Sim — colunas e fluxo configuráveis |

---

## 11. API

```
GET    /api/workflows/templates                    → Lista de templates
POST   /api/workflows/templates                    → Criar template
PATCH  /api/workflows/templates/{id}               → Editar (cria nova versão)
DELETE /api/workflows/templates/{id}               → Arquivar template

GET    /api/workflows/instances                    → Instâncias (filtráveis)
       ?status=em_curso
       &area=financeiro
       &template=onboarding

POST   /api/workflows/instances                    → Iniciar workflow
       body: { template_id, name, context: { ... } }

GET    /api/workflows/instances/{id}               → Detalhe com todos os passos
PATCH  /api/workflows/instances/{id}               → Pausar/cancelar/retomar
       body: { status, motivo }

GET    /api/areas                                  → Lista de áreas operacionais
POST   /api/areas                                  → Criar área
GET    /api/areas/{slug}                           → Detalhe (workflows, tarefas, pessoas)
```

---

## 12. Modelo de Dados (Resumo)

### Tabelas principais

- **WorkflowTemplate** — id, nome, descrição, area_id, project_id, trigger_type, trigger_config, duração_estimada, is_active, versão, created_by
- **WorkflowTemplateStep** — id, template_id, ordem, título, descrição, responsável_role, responsável_id, prazo_relativo_dias, prioridade, dependências[], is_opcional, checklist
- **WorkflowInstance** — id, template_id, nome, contexto (JSON), status, progresso, started_at, completed_at, started_by, project_id, area_id
- **WorkflowInstanceTask** — id, instance_id, step_id, task_id (referência à tarefa real no Módulo 1)
- **Area** — id, nome, slug, descrição, responsável_id, is_suggested (se foi sugerida pelo Maestro)

### Relações

- WorkflowTemplate 1:N WorkflowTemplateStep
- WorkflowTemplate 1:N WorkflowInstance
- WorkflowTemplate N:1 Area (opcional)
- WorkflowInstance 1:N WorkflowInstanceTask
- WorkflowInstanceTask 1:1 Task (do Módulo 1)
- WorkflowInstance N:1 Project (opcional)
- WorkflowInstance N:1 Area (opcional)
- Area 1:N WorkflowTemplate
- Area 1:N Task (tarefas recorrentes)

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 4: Dev Hub (Opcional)

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)  
**Disponibilidade:** Módulo opcional — ativado para empresas de tecnologia, desativado para as restantes.

---

## 1. Visão Geral

O Dev Hub integra o ciclo de desenvolvimento de software no Centro de Comando. Fecha o ciclo entre gestão e código: quando alguém programa, o sistema sabe; quando algo precisa de ação (review, bug, deploy falhado), entra automaticamente como tarefa. O grande diferenciador é o ciclo AI-assistido: ferramentas como Claude Code produzem código, o Maestro analisa o que foi feito e gera tarefas de teste e review automaticamente.

**Filosofia:** O gestor não precisa de abrir o GitHub para saber o estado do desenvolvimento. O Centro de Comando dá visibilidade total sobre commits, PRs, deploys e métricas — e o Maestro transforma atividade de código em ações concretas para a equipa.

**Ciclo flexível:** O desenvolvimento pode acontecer a qualquer hora (não é obrigatoriamente noturno). Quando há atividade de código, o Maestro analisa e gera tarefas. O briefing adapta-se ao horário do utilizador.

---

## 2. Componentes

### 2.1 GitHub Sync (Bidirecional)

**GitHub → Centro de Comando (tempo real):**

| Evento GitHub | Ação no Centro de Comando |
|---------------|--------------------------|
| Push (commits) | Regista evento, atualiza dev_status da tarefa, atualiza métricas |
| PR aberto (draft) | Regista, tarefa mantém estado "em desenvolvimento" |
| PR aberto (ready for review) | Tarefa move para "Em Revisão" no kanban |
| PR aprovado | Regista, aguarda merge |
| PR merged | Tarefa move para "Feito" (ou aguarda validação se trust score baixo) |
| PR fechado sem merge | Tarefa volta para "Em Curso" |
| Deploy sucesso | Atualiza dev_status para "deployed" |
| Deploy falha | Cria alerta crítico + tarefa "Fix deploy" atribuída ao autor |
| Issue criada | Cria tarefa no kanban (via Maestro, trust score aplicado) |
| CI/CD falha | Cria alerta warning |

**Centro de Comando → GitHub:**

| Ação no Centro de Comando | Ação no GitHub |
|---------------------------|---------------|
| Criar tarefa técnica no kanban | Criar issue no GitHub |
| Tarefa move para "Em Curso" | Criar branch automaticamente |
| Tarefa move para "Feito" | Fechar issue no GitHub |

**Ligação tarefa ↔ código (3 métodos, por prioridade):**

1. **Referência explícita** — CC-42 no título do PR, commit message, ou descrição
2. **Nome do branch** — feature/CC-42-booking-api ou fix/integrar-booking
3. **Matching por AI** — Maestro compara descrição do PR com tarefas em curso. Se confiança >80%, sugere ligação com validação. Se <80%, regista evento sem ligar.

**Dev status automático:**

| Estado | Significado | Ícone |
|--------|-------------|-------|
| sem_codigo | Tarefa sem atividade de código | — |
| em_desenvolvimento | Branch criado ou commits em curso | Martelo |
| em_review | PR aberto para review | Engrenagem |
| merged | PR merged | Check verde |
| deployed | Deploy concluído com sucesso | Foguete |

**Regras de trust score nos movimentos automáticos:**

- Trust Score < 50: movimentos de kanban ficam "por confirmar"
- Trust Score ≥ 50: movimentos aplicados automaticamente, com possibilidade de reverter
- Nunca mover automaticamente para "Feito" sem pelo menos 1 confirmação anterior do mesmo tipo

### 2.2 Ciclo Code + Maestro

**Fluxo (hora variável):**

```
Sessão de código (Claude Code, developer, ou outro)
       │
       ▼
GitHub recebe commits/PRs
       │
       ▼
Webhook chega ao Centro de Comando
       │
       ▼
Maestro analisa:
├── Que ficheiros foram alterados?
├── Que componentes foram tocados?
├── Há testes necessários?
├── Há impacto visual/UX (ficheiros .tsx, .css)?
├── Liga commits a tarefas existentes
└── Gera novas tarefas
       │
       ▼
Tarefas criadas:
├── Testes (para funcionalidades novas ou alteradas)
├── Reviews (para refactorizações ou código sensível)
├── UX review (se componente frontend, conforme regras de assignee)
└── Documentação (se API nova ou alteração de contrato)
       │
       ▼
Briefing do utilizador inclui resumo:
"Houve X commits no projeto Y. Criei Z tarefas de teste e W de review."
```

**Critérios de geração de tarefas:**

| Tipo de alteração | Tarefa gerada | Prioridade |
|-------------------|--------------|------------|
| Novo endpoint/API | Teste de integração | Alta |
| Alteração de lógica de negócio | Teste funcional | Alta |
| Refactoring sem mudança de comportamento | Review de código | Média |
| Alteração de UI (.tsx, .css, layouts) | UX review (se regra de assignee configurada) | Média |
| Correção de bug | Teste de regressão | Alta |
| Alteração de auth/segurança | Teste de segurança | Crítica |
| Novo ficheiro de migração | Teste de base de dados | Alta |
| Alteração de configuração | Review + teste de ambiente | Média |

### 2.3 Feedback & QA (Sub-módulo)

**Conceito:** SDK embebível em qualquer aplicação web que permite captura de sessão do utilizador e feedback contextualizado. Utilização dupla: interno (equipa a testar) e externo (clientes a reportar).

**SDK de Captura (desktop/web):**

O SDK é um snippet de JavaScript leve que se adiciona a qualquer aplicação web (mobile não incluído nesta fase):

- Grava eventos DOM (cliques, scroll, navegação, erros de consola) — não grava vídeo
- Botão flutuante sempre visível para dar feedback
- **Chat integrado com o Maestro** — abre diretamente na app que está a ser testada, sem precisar de ir ao Centro de Comando. O utilizador fala com o Maestro em contexto.
- Ao clicar no botão de feedback, o utilizador pode:
  - Gravar nota de voz (transcrita automaticamente)
  - Anotar diretamente no ecrã (desenhar seta, marcar zona)
  - Escrever texto
  - Abrir chat com o Maestro para descrever problemas complexos
- No momento do feedback, captura automaticamente: screenshot, URL, browser, resolução, timestamp, último erro de consola

**Processamento pelo Maestro:**

```
Feedback chega via API
       │
       ▼
Maestro processa:
├── Transcreve voz (se aplicável)
├── Analisa screenshot (identifica componente UI)
├── Liga ao commit/PR que gerou a funcionalidade
├── Classifica: bug, sugestão, questão
└── Define prioridade baseada em criticidade
       │
       ▼
Tarefa criada com contexto completo:
├── Descrição (transcrita ou escrita)
├── Screenshot anotado
├── URL e dados técnicos
├── Componente identificado
├── Commit/PR de origem
└── Sessão de replay (link para rever os passos do utilizador)
```

**Formas de dar feedback (todas disponíveis, 3 recomendadas):**

| Forma | Recomendação | Quando usar |
|-------|-------------|-------------|
| Voz (via SDK ou canal externo) | Principal | Enquanto testas, sem parar |
| Chat com Maestro | Complemento | Problemas complexos que precisam de diálogo |
| Direto na tarefa | Complemento | Tarefas de teste estruturadas (passou/falhou) |
| Screenshot/gravação (via SDK) | Disponível | Quando o visual é importante |
| Aprovação rápida | Disponível | Para tarefas simples de validação |

**Feedback via canal externo:** Se o utilizador está a testar no telemóvel, pode enviar voz ou texto ao Maestro via WhatsApp, Telegram, ou outro canal configurado. O Maestro processa da mesma forma.

**Uso para clientes (futuro):**

O SDK é embebido nas aplicações que a empresa desenvolve para os seus clientes. Quando o cliente encontra um problema:

1. Clica no botão de feedback
2. Descreve o problema (voz, texto, ou anotação)
3. O SDK captura contexto técnico automaticamente
4. O feedback chega ao Centro de Comando da empresa
5. O Maestro cria tarefa com contexto completo
6. Na próxima sessão de código, o developer tem toda a informação para corrigir

---

## 3. Vista Dev (dentro de cada projeto)

Separador "Dev" dentro da vista de projeto, com:

### 3.1 Métricas

- Commits esta semana/mês
- PRs abertos, merged, fechados
- Deploys (sucesso vs falha)
- Velocidade de desenvolvimento (commits/semana, trend)
- Contributors ativos

### 3.2 Atividade

- Gráfico de atividade (últimos 28 dias, tipo GitHub contribution graph)
- Lista de PRs abertos com estado e reviewer
- Últimos commits (com ligação a tarefa quando disponível)
- Deploys recentes com estado

### 3.3 Tarefas Geradas pelo Maestro

- Lista de tarefas criadas automaticamente a partir de atividade de código
- Estado de validação (pendente, aprovada, rejeitada)
- Ações rápidas: aprovar, editar, rejeitar

### 3.4 Métricas de QA

Métricas calculadas automaticamente pelo sistema:

| Métrica | Descrição |
|---------|-----------|
| Taxa de bugs por release | Número de bugs reportados por cada deploy/release |
| Tempo médio de resolução | Desde feedback recebido até tarefa concluída |
| Componentes com mais problemas | Ranking de componentes UI/funcionalidades com mais feedbacks negativos |
| Taxa de regressão | Bugs que voltam a aparecer depois de corrigidos |
| Feedback pendente | Feedbacks não tratados e tempo de espera |
| Satisfação do teste | Rácio entre "funciona" vs "tem problemas" nas validações |

Estas métricas podem alimentar KPIs no módulo de Objetivos (ex: "reduzir taxa de bugs para < 2 por release").

---

## 4. Alertas

| Condição | Tipo | Severidade |
|----------|------|-----------|
| PR aberto há 48h+ sem review | pr_sem_review | Warning |
| PR aberto há 5+ dias | pr_sem_review | Crítico |
| Deploy falhado | deploy_falhado | Crítico |
| CI/CD falhado | ci_falhado | Warning |
| Repo sem commits há 3+ dias úteis | repo_inativo | Info |
| Tarefa de teste gerada não validada há 2+ dias | teste_pendente | Warning |
| Feedback de cliente não tratado há 24h | feedback_pendente | Warning |

---

## 5. Maestro AI no Módulo

### 5.1 Análise de Código

- Identifica ficheiros alterados e tipo de alteração
- Classifica por área (backend, frontend, API, base de dados, segurança)
- Deteta padrões: commits monolíticos, código sem testes, alterações de segurança não revistas
- Sugere ações baseadas no tipo de alteração

### 5.2 Geração de Tarefas

Segue as regras de assignee configuradas pelo utilizador (linguagem natural, manual, ou aprendizagem). Auto-sequência disponível (ex: tarefa de código concluída → cria tarefa de UX review para frontend).

### 5.3 Briefing de Desenvolvimento

No briefing periódico do Maestro, inclui secção de dev:

- Resumo da atividade recente (commits, PRs)
- Tarefas geradas e estado de validação
- Alertas ativos (PRs sem review, deploys falhados)
- Feedback de clientes não tratado
- Sugestão de prioridades para o dia

---

## 6. Ligações com Outros Módulos

| Módulo | Relação com Dev Hub |
|--------|--------------------|
| Projetos & Tarefas | Tarefas de teste/review no kanban. Dev status nas tarefas. Bidirecionalidade com GitHub issues. |
| Clientes & CRM | Feedback de clientes (via SDK) entra no feed do CRM e gera tarefas. |
| Workflows | Deploy merged pode disparar workflow de release. Deploy falhado pode disparar workflow de hotfix. |
| Objetivos & Roadmap | Métricas de dev podem alimentar KPIs (velocidade, frequência de deploy, etc.) |
| Integrações | GitHub como integração pré-construída. CI/CD via webhooks. |

---

## 7. Adaptabilidade

### 7.1 Módulo Opcional

O Dev Hub só é ativado para empresas de tecnologia. O resto do sistema funciona perfeitamente sem ele. A ativação é feita na configuração da empresa.

### 7.2 O que é configurável

| Elemento | Configurável |
|----------|-------------|
| Repos monitorizados | Sim — adicionar/remover repos GitHub |
| Regras de geração de tarefas | Sim — que tipos de alteração geram que tipo de tarefa |
| Regras de assignee para dev | Sim — linguagem natural, manual, ou aprendizagem |
| Bidirecionalidade | Sim — ativar/desativar criação automática de issues/branches |
| SDK de feedback | Sim — personalizar botão, canais, campos |
| Alertas de dev | Sim — thresholds configuráveis |

---

## 8. API

### 8.1 Endpoints GitHub

```
POST   /api/webhooks/github                        → Receber eventos GitHub (HMAC SHA-256)
GET    /api/github/repos                           → Lista repos monitorizados
POST   /api/github/repos                           → Adicionar repo
DELETE /api/github/repos/{id}                      → Remover repo

GET    /api/github/events                          → Eventos recentes (filtráveis)
       ?repo=aura-pms&type=push&days=7

GET    /api/github/metrics                         → Métricas agregadas
GET    /api/github/metrics/daily                   → Métricas diárias por repo

POST   /api/tasks/{id}/link-github                 → Ligar tarefa a PR/branch manualmente
```

### 8.2 Endpoints Feedback

```
POST   /api/feedback                               → Receber feedback do SDK
       body: { screenshot, url, browser, description, voice_url, annotations, session_id }

GET    /api/feedback                               → Lista feedback (filtráveis)
       ?status=pendente&project=aura-pms

PATCH  /api/feedback/{id}                          → Atualizar estado do feedback
```

### 8.3 Agent API

```
POST   /api/agent/github/analyze                   → Pedir análise de commits ao Maestro
GET    /api/agent/github/tasks                     → Tarefas geradas por atividade de código
```

---

## 9. Modelo de Dados (Resumo)

### Tabelas principais

- **GithubRepo** — id, project_id, repo_full_name, default_branch, webhook_secret, is_active, last_synced_at
- **GithubEvent** — id, repo_id, event_type, action, título, author, author_mapped_id, branch, pr_number, commit_sha, url, task_id, task_link_method, task_link_confidence, event_at
- **DevMetricsDaily** — id, repo_id, date, commits_count, prs_opened, prs_merged, prs_closed, issues_opened, issues_closed, lines_added, lines_removed, deploys_success, deploys_failed, active_contributors
- **FeedbackEntry** — id, project_id, client_id, session_id, tipo (bug/sugestao/questao), descrição, voice_url, screenshot_url, annotations, url_page, browser, resolution, console_errors, commit_ref, task_id, status, created_at

### Relações

- GithubRepo N:1 Project
- GithubEvent N:1 GithubRepo
- GithubEvent N:1 Task (ligação código-tarefa, opcional)
- GithubEvent N:1 Person (author mapeado)
- DevMetricsDaily N:1 GithubRepo
- FeedbackEntry N:1 Project
- FeedbackEntry N:1 Client (se feedback externo)
- FeedbackEntry N:1 Task (tarefa gerada)

### Campos adicionais na tabela Person

- **github_username** — para mapear commits/PRs a pessoas do sistema

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 5: Objetivos & Roadmap

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O módulo de Objetivos & Roadmap é a camada estratégica do Centro de Comando. Permite definir metas, acompanhar progresso, e garantir que o trabalho diário está alinhado com a estratégia da empresa. O sistema é flexível — suporta desde goals simples até OKRs completos com Key Results ponderados.

**Filosofia:** Cada tarefa, cada projeto, cada workflow deve servir um objetivo. O Maestro verifica este alinhamento continuamente e alerta quando há trabalho desalinhado ou quando os objetivos estão em risco.

**Adaptabilidade:** Cada empresa escolhe o nível de complexidade — goals simples (padaria com 3 metas), OKRs completos (empresa de tech com hierarquia), ou KPIs contínuos (métricas operacionais sem prazo). Os três coexistem.

---

## 2. Vistas

### 2.1 Scorecard

Vista principal com todos os objetivos e o seu estado.

**Para cada objetivo:**

- Barra de progresso (valor atual vs. target)
- Percentagem e valor absoluto
- Projeção: "a este ritmo, atinges X até Y" (cálculo linear a partir de snapshots)
- Health: verde (on track), amarelo (ligeiramente atrasado), vermelho (em risco)
- Mini-gráfico de evolução (últimas 4-8 semanas, baseado em snapshots diários)
- Key Results associados (se OKR) com progresso individual
- Tarefas que contribuem para este objetivo

**Filtros:** Por health, por tipo (goal/OKR/KPI), por área, por prazo.

### 2.2 Roadmap (Timeline)

Vista Gantt simplificada que mostra:

- Fases dos projetos em barras horizontais
- Objetivos como linhas com deadline
- Marcos (milestones) como diamantes
- Linha vertical de "hoje"
- Progresso real vs. esperado
- Dependências entre fases/objetivos (se configuradas)

**Interação:**

- Zoom: semanas, meses, trimestres, ano
- Clicar numa barra expande para detalhes
- Arrastar para ajustar datas

### 2.3 Mapa Relacional

Vista visual que mostra como os objetivos se ligam ao resto do sistema:

- Objetivos como nós centrais
- Ligações a projetos que contribuem
- Ligações a áreas operacionais
- Ligações a Key Results e tarefas
- Peso das contribuições visual (espessura das linhas)
- Health propagado (se um projeto está vermelho, o objetivo reflete)

---

## 3. Níveis de Complexidade

### 3.1 Goals Simples

Para empresas que querem algo direto sem complexidade.

| Campo | Descrição |
|-------|-----------|
| Nome | "Facturar 100k€ em 2026" |
| Target | 100.000 |
| Valor atual | 23.000 |
| Unidade | € |
| Deadline | 31 Dez 2026 |
| Progresso | 23% (auto-calculado) |

Sem Key Results, sem pesos. Apenas meta e progresso.

**Visibilidade:** Cada objetivo (de qualquer nível de complexidade) pode ser público (toda a equipa vê) ou privado (só gestão/admins). Configurável individualmente.

### 3.2 OKRs (Objectives & Key Results)

Para empresas que querem hierarquia e ponderação.

**Objetivo:**

| Campo | Descrição |
|-------|-----------|
| Nome | "Tornar o AURA PMS referência no mercado" |
| Descrição | Contexto estratégico |
| Deadline | Q3 2026 |
| Progresso | Calculado automaticamente (média ponderada dos KRs) |

**Key Results (ligados ao objetivo):**

| KR | Target | Atual | Peso | Progresso |
|----|--------|-------|------|-----------|
| 50 propriedades ativas | 50 | 12 | 40% | 24% |
| NPS > 40 | 40 | 35 | 30% | 87.5% |
| Churn < 3%/mês | 3% | 5% | 30% | 60% |

Progresso do objetivo = (24% × 0.4) + (87.5% × 0.3) + (60% × 0.3) = **53.85%**

Recálculo automático sempre que um KR é atualizado.

**Dependências:** Apenas entre Key Results do mesmo objetivo (ex: KR "Ter 50 propriedades" pode depender de KR "Fechar 5 pilotos"). Objetivos entre si são independentes.

### 3.3 KPIs Contínuos

Para métricas operacionais sem deadline que se monitorizam permanentemente.

| Campo | Descrição |
|-------|-----------|
| Nome | "Tempo médio de resposta ao cliente" |
| Valor atual | 4.2 horas |
| Meta | < 2 horas |
| Tendência | Descendo (positivo) |
| Frequência de medição | Diária |

KPIs não têm deadline — são monitorizados continuamente. O Maestro alerta quando saem da zona aceitável.

---

## 4. Snapshots e Projeções

### 4.1 Snapshots Diários

O sistema captura automaticamente um snapshot de cada objetivo/KR todos os dias:

| Campo | Descrição |
|-------|-----------|
| Objetivo ID | Referência |
| Data | Data do snapshot |
| Valor atual | Valor nesse dia |
| Progresso | Percentagem nesse dia |

Os snapshots alimentam os mini-gráficos de evolução e as projeções.

### 4.2 Projeções

Cálculo de projeção linear simples:

- Velocidade = (valor_atual - valor_inicial) / dias_decorridos
- Projeção = valor_atual + (velocidade × dias_restantes)
- Se projeção ≥ target → "On track: a este ritmo, atinges em DD/MM"
- Se projeção < target → "Em risco: a este ritmo, atinges apenas X até à deadline"

Para projeções mais sofisticadas (tendência, sazonalidade), o Maestro pode usar análise de snapshots históricos quando tem dados suficientes.

---

## 5. Atualização Automática de Progresso

### 5.1 Conceito

Certos objetivos podem ser atualizados automaticamente pelo Maestro a partir de dados que já existem no sistema:

| Objetivo | Fonte de dados | Atualização |
|----------|---------------|-------------|
| "Fechar 5 contratos" | Pipeline CRM → clientes na fase "ativo" | Conta automática |
| "50 propriedades no AURA" | Base de dados do produto | Conta automática |
| "Publicar 12 posts/mês" | Workflow de conteúdo → itens "publicado" | Conta automática |
| "Facturar 100k€" | Sistema financeiro (se integrado) | Sync automático |
| "NPS > 40" | Feedback de clientes (se recolhido) | Cálculo automático |
| "Reduzir tempo de resposta" | Feed de interações → timestamps | Cálculo automático |

### 5.2 Configuração

O utilizador (ou Maestro) liga um objetivo a uma fonte de dados:

- "Este objetivo conta clientes na fase 'ativo'" → o Maestro sabe como contar
- "Este KR mede o tempo médio entre mensagem do cliente e resposta" → o Maestro calcula

Se a fonte não está disponível, o objetivo mantém atualização manual.

---

## 6. Maestro AI no Módulo

### 6.1 Monitorização Proativa

| O que monitoriza | Ação |
|------------------|------|
| Progresso real muito abaixo do esperado | "Estás a 40% do ano e a 12% do objetivo. Queres ajustar o target ou reforçar o esforço?" |
| Objetivo sem progresso há 2+ semanas | "O objetivo X não tem progresso há 15 dias. O que está a acontecer?" |
| KPI fora da zona aceitável | "O tempo de resposta subiu para 6h (meta: <2h). Investigar?" |
| Projeção indica que não vai atingir | "A este ritmo, vais atingir 70k€ dos 100k€ pretendidos. Queres rever?" |
| Objetivo quase concluído | "Faltam 3 unidades para atingir o objetivo. Estás quase!" |

### 6.2 Alinhamento Estratégico

O Maestro verifica continuamente se o trabalho está alinhado com os objetivos:

- Quando uma tarefa é criada sem objetivo associado: "Esta tarefa serve algum objetivo?"
- Quando uma pessoa tem muitas tarefas desalinhadas: "70% das tarefas do Bruno esta semana não contribuem para nenhum objetivo."
- Quando um objetivo tem poucas tarefas: "O objetivo Y tem 0 tarefas em curso. Precisa de planeamento?"
- Quando um projeto inteiro não está ligado a objectivos: "O projeto Z não contribui para nenhum objetivo. É intencional?"

### 6.3 Sugestões de Ajuste

Baseado em dados históricos e padrões:

- "Nos últimos 3 meses, o progresso acelera em março. A projeção pode estar pessimista."
- "O KR 'NPS > 40' está quase atingido. Queres aumentar o target para 50?"
- "Tens 2 objetivos com deadline no mesmo mês. Risco de sobrecarga."

### 6.4 Revisão Periódica

O Maestro sugere ciclos formais de revisão de objetivos:

- **Frequência configurável** (mensal, trimestral, semestral — por defeito trimestral)
- Na data de revisão, o Maestro prepara um relatório: progresso de cada objetivo, projeções, KRs em risco, sugestões de ajuste
- Propõe ações concretas: "Objetivo X está a 15% e devia estar a 40%. Sugestões: ajustar target, reforçar equipa, ou adiar deadline?"
- O utilizador revê, ajusta, e confirma as alterações
- Histórico de revisões guardado para rastreabilidade

---

## 7. Interação Humana

### 7.1 CRUD Completo

- **Criar** objetivo (goal, OKR, ou KPI), key result, ligação a projeto/tarefa
- **Editar** valores, targets, deadlines, pesos, descrições
- **Apagar** / arquivar objetivos e KRs
- **Atualizar** progresso manualmente (quando não há fonte automática)
- **Configurar** fontes de dados para atualização automática

### 7.2 Criação por Linguagem Natural

- "Quero um objetivo de facturar 200k este ano"
- "Adiciona um KR: ter 30 clientes ativos até setembro, peso 50%"
- "Cria um KPI para monitorizar o tempo médio de deploy"

O Maestro interpreta, mostra, e confirma.

---

## 8. Ligações com Outros Módulos

| Módulo | Relação com Objetivos |
|--------|----------------------|
| Projetos & Tarefas | Tarefas contribuem para KRs. Projetos ligam-se a objetivos. Progresso de tarefas alimenta objetivos. |
| Clientes & CRM | Pipeline de clientes pode alimentar objetivos de vendas automaticamente. |
| Workflows | Workflows concluídos podem alimentar KPIs (ex: onboardings/mês). |
| Dev Hub | Métricas de dev podem alimentar KPIs (velocidade, deploys). |
| Integrações | Dados de ferramentas externas podem alimentar objetivos (faturação, analytics). |

---

## 9. Adaptabilidade Multi-Empresa

### 9.1 O que é configurável

| Elemento | Configurável |
|----------|-------------|
| Tipo de objetivo | Sim — goal simples, OKR, KPI, ou custom |
| Períodos | Sim — anual, trimestral, mensal, sem período |
| Unidades | Sim — €, %, número, horas, custom |
| Pesos dos KRs | Sim |
| Fontes de atualização automática | Sim |
| Alinhamento obrigatório | Sim — forçar ou não que tarefas tenham objetivo associado |
| Projeções | Sim — linear, tendência, ou desativada |

### 9.2 Templates de Objetivos

O sistema sugere objetivos comuns por setor:

- **Software/Tech:** Receita, utilizadores ativos, NPS, churn, velocidade de deploy
- **Serviços:** Faturação, clientes ativos, satisfação, tempo de resposta
- **Comércio:** Vendas, margem, stock, clientes novos

---

## 10. API

```
GET    /api/objectives                             → Todos os objetivos com progresso e projeção
       ?type=okr&health=vermelho

POST   /api/objectives                             → Criar objetivo
PATCH  /api/objectives/{id}                        → Editar objetivo
       body: { current_value?, target?, deadline?, description? }
DELETE /api/objectives/{id}                        → Arquivar objetivo

GET    /api/objectives/{id}/key-results            → KRs de um objetivo
POST   /api/objectives/{id}/key-results            → Criar KR
PATCH  /api/key-results/{id}                       → Atualizar KR (cascadeia para objetivo)
       body: { current_value }

GET    /api/objectives/{id}/snapshots              → Histórico de snapshots
       ?from=2026-01-01&to=2026-04-08

GET    /api/objectives/{id}/projection             → Projeção calculada

GET    /api/kpis                                   → Lista KPIs contínuos
POST   /api/kpis                                   → Criar KPI
PATCH  /api/kpis/{id}                              → Atualizar KPI
```

### Agent API

```
GET    /api/agent/objectives                       → Lista OKRs com KRs
PATCH  /api/agent/objectives/{id}                  → Atualizar progresso
PATCH  /api/agent/key-results/{id}                 → Atualizar KR (cascadeia)
```

---

## 11. Modelo de Dados (Resumo)

### Tabelas principais

- **Objective** — id, nome, descrição, tipo (goal/okr/kpi), target, current_value, unidade, deadline, health, progresso, projecao, area_id, created_by
- **KeyResult** — id, objective_id, nome, target, current_value, unidade, peso, deadline, progresso
- **OkrSnapshot** — id, objective_id, key_result_id, date, value, progresso
- **ObjectiveDataSource** — id, objective_id, tipo_fonte, config (JSON: como contar/calcular), última_sync

### Relações

- Objective 1:N KeyResult
- Objective 1:N OkrSnapshot
- KeyResult 1:N OkrSnapshot
- Objective N:M Project (contribuição)
- Objective N:M Task (contribuição direta)
- Objective N:1 Area (opcional)
- Objective 1:1 ObjectiveDataSource (para atualização automática, opcional)

---

# CENTRO DE COMANDO — Especificação de Módulo

## Módulo 6: Integrações

**Versão:** 2.0  
**Data:** 8 Abril 2026  
**Estado:** Aprovado (discussão concluída)

---

## 1. Visão Geral

O módulo de Integrações é a camada que liga o Centro de Comando ao mundo exterior. Qualquer ferramenta com API pode ser ligada ao sistema. Os dados entram e saem bidirecionalmente, sempre passando pelo Maestro que normaliza, enriquece, e decide para onde vai cada informação.

**Filosofia:** O Centro de Comando não substitui ferramentas existentes — complementa-as com uma camada de inteligência e visão unificada. A empresa continua a usar Gmail, Calendar, Slack, ou qualquer outra ferramenta. O Centro de Comando agrega, processa, e dá sentido aos dados de todas elas.

**Adaptabilidade:** Conectores pré-construídos para as ferramentas mais comuns, conector genérico para qualquer API, e marketplace de conectores para o futuro.

---

## 2. Arquitetura

### 2.1 Três Camadas de Conectores

```
┌─────────────────────────────────────────────────────┐
│  Camada 1: Conectores Pré-construídos               │
│  Gmail, Calendar, GitHub, Drive, Slack, WhatsApp,   │
│  Telegram, Discord                                   │
│  → Prontos a usar, OAuth, sem configuração técnica  │
├─────────────────────────────────────────────────────┤
│  Camada 2: Conector Genérico                         │
│  Qualquer API REST/webhook                           │
│  → Configuração manual ou via Maestro               │
├─────────────────────────────────────────────────────┤
│  Camada 3: Marketplace (futuro)                      │
│  Conectores criados pela comunidade ou parceiros     │
│  → Instalar, autenticar, usar                       │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Maestro — Camada de Processamento                   │
│  Normaliza, enriquece, decide destino, trust score  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Módulos do Centro de Comando                        │
│  Projetos, CRM, Workflows, Dev Hub, Objetivos       │
└─────────────────────────────────────────────────────┘
```

### 2.2 Princípio Fundamental

**Tudo passa pelo Maestro.** Nenhuma integração escreve diretamente na base de dados. O Maestro:

1. Recebe os dados do conector
2. Normaliza o formato
3. Enriquece com contexto (associa a projeto, cliente, pessoa)
4. Decide o destino (feed CRM, tarefa kanban, alerta, calendar)
5. Aplica trust score quando relevante
6. Persiste os dados

### 2.3 Bidirecionalidade

Todas as integrações são bidirecionais quando possível:

| Direção | Exemplo |
|---------|---------|
| Entrada | Email chega → cria interação no feed do cliente |
| Saída | Criar reunião no Centro de Comando → cria evento no Google Calendar |
| Entrada | Issue criada no GitHub → cria tarefa no kanban |
| Saída | Tarefa criada no kanban → cria issue no GitHub |
| Entrada | Mensagem no Slack → cria nota ou alerta |
| Saída | Alerta no Centro de Comando → mensagem no Slack |

---

## 3. Conectores Pré-construídos

### 3.1 Gmail

| Aspeto | Detalhe |
|--------|---------|
| Auth | OAuth 2.0 (Google) |
| Entrada | Emails de/para contactos de clientes → interações no feed CRM |
| Saída | Enviar email a partir do Centro de Comando |
| Frequência | Sync a cada 30 min + webhook para tempo real |
| Maestro faz | Identifica cliente pelo email, classifica tipo (comercial, suporte, administrativo), extrai ações se necessário |

### 3.2 Google Calendar

| Aspeto | Detalhe |
|--------|---------|
| Auth | OAuth 2.0 (Google) |
| Entrada | Reuniões e eventos → interações no feed, alertas de agenda |
| Saída | Criar/editar eventos a partir do Centro de Comando |
| Frequência | Sync a cada 15 min + webhook |
| Maestro faz | Liga reuniões a clientes/projetos, cria alertas de preparação, registra calls |

### 3.3 Google Drive

| Aspeto | Detalhe |
|--------|---------|
| Auth | OAuth 2.0 (Google) |
| Entrada | Ficheiros novos/modificados em pastas de projeto → entrada no feed |
| Saída | Criar pastas e documentos a partir do Centro de Comando |
| Frequência | Sync a cada hora |
| Maestro faz | Associa documentos a projetos/clientes, deteta calls gravadas para transcrição |

### 3.4 GitHub

| Aspeto | Detalhe |
|--------|---------|
| Auth | Personal Access Token + Webhook Secret |
| Entrada | Commits, PRs, deploys, issues → Dev Hub |
| Saída | Criar issues, branches, fechar issues |
| Frequência | Webhooks (tempo real) + polling a cada 15 min (fallback) |
| Maestro faz | Liga código a tarefas, gera tarefas de teste/review, alerta deploys falhados |

(Detalhado no Módulo 4 — Dev Hub)

### 3.5 Slack

| Aspeto | Detalhe |
|--------|---------|
| Auth | OAuth 2.0 (Slack) |
| Entrada | Mensagens de canais monitorizados → notas, tarefas, alertas |
| Saída | Enviar notificações, alertas, resumos para canais Slack |
| Frequência | Webhooks (tempo real) |
| Maestro faz | Classifica mensagens (decisão, tarefa, informação), associa a projetos |

### 3.6 WhatsApp

| Aspeto | Detalhe |
|--------|---------|
| Auth | WhatsApp Business API |
| Entrada | Mensagens de clientes → feed CRM, agente de recolha |
| Saída | Enviar mensagens a clientes, notificações |
| Frequência | Webhooks (tempo real) |
| Maestro faz | Identifica cliente, direciona para agente de recolha ou regista no feed |

### 3.7 Telegram

| Aspeto | Detalhe |
|--------|---------|
| Auth | Telegram Bot API |
| Entrada | Mensagens de grupos/canais → notas, agente de recolha |
| Saída | Enviar notificações, briefings, alertas via bot |
| Frequência | Webhooks (tempo real) |
| Maestro faz | Identifica remetente, classifica, direciona |

### 3.8 Discord

| Aspeto | Detalhe |
|--------|---------|
| Auth | Discord Bot API + Webhook |
| Entrada | Mensagens estruturadas → tarefas, decisões, alertas |
| Saída | Enviar notificações para canais |
| Frequência | Webhooks (tempo real) |
| Maestro faz | Classifica tipo (agent_update, task, decision), cria entidades correspondentes |

---

## 4. Conector Genérico

### 4.1 Conceito

Para ferramentas sem conector pré-construído, o utilizador pode criar uma ligação personalizada.

### 4.2 Duas Formas de Configurar

**Via Maestro (linguagem natural):**

"Liga-me ao Primavera. Quando chegar uma fatura nova, cria uma tarefa de validação no projeto Contabilidade."

O Maestro:
1. Pergunta detalhes técnicos que precisa (URL da API, tipo de autenticação)
2. Sugere mapeamento de dados
3. Mostra preview da configuração
4. O utilizador confirma

**Via formulário técnico:**

| Campo | Descrição |
|-------|-----------|
| Nome | Nome da integração (ex: "Primavera ERP") |
| URL base | URL da API (ex: https://api.primavera.pt/v1) |
| Autenticação | Tipo (API key, OAuth, Bearer token) + credenciais |
| Direção | Entrada, saída, ou bidirecional |
| Webhook URL | URL que o Centro de Comando disponibiliza para receber dados |
| Mapeamento entrada | Regras: que dados entram e para onde vão (tarefa, interação, alerta) |
| Mapeamento saída | Regras: que ações no CC disparam chamadas à API externa |
| Frequência | Se polling: intervalo. Se webhook: tempo real. |
| Filtros | Condições para processar ou ignorar dados |

### 4.3 Motor de Mapeamento

O conector genérico tem um motor de mapeamento visual:

- Campo de origem (da API externa) → Campo de destino (no Centro de Comando)
- Transformações simples (formato de data, conversão de moeda, concatenação)
- Condições (se campo X = "fatura" então criar tarefa, senão ignorar)
- Testes (enviar dados de teste e ver o resultado antes de ativar)

---

## 5. Agent API

### 5.1 Conceito

A Agent API é uma interface dedicada para agentes AI externos comunicarem com o Centro de Comando. É separada das integrações normais porque os agentes têm comportamento autónomo — criam, modificam e consultam dados ativamente.

### 5.2 Autenticação

- Cada agente tem o seu próprio token (Bearer)
- Header `X-Agent-Id` identifica o agente
- Trust score é individual por agente e por tipo de ação
- **Rate limiting por agente** — limite de chamadas por minuto/hora configurável. Quando um agente se aproxima do limite, o Maestro gera alerta: "O agente X está a usar demasiados recursos (85% do limite). Verificar se há loop ou comportamento anómalo."
- Quando o limite é atingido, chamadas são rejeitadas com código 429 e o Maestro notifica o admin

### 5.3 Endpoints Disponíveis

```
GET    /api/agent/projects                         → Lista projetos
GET    /api/agent/tasks                            → Busca tarefas (filtráveis)
POST   /api/agent/tasks                            → Criar tarefa
PATCH  /api/agent/tasks/{id}                       → Atualizar tarefa

GET    /api/agent/clients                          → Lista clientes
POST   /api/agent/interactions                     → Registar interação

POST   /api/agent/alerts                           → Criar alerta

GET    /api/agent/objectives                       → Lista OKRs com KRs
PATCH  /api/agent/objectives/{id}                  → Atualizar progresso
PATCH  /api/agent/key-results/{id}                 → Atualizar KR (cascadeia)

POST   /api/agent/content                          → Criar item de conteúdo
PATCH  /api/agent/content/{id}                     → Atualizar estado

POST   /api/agent/feedback                         → Registar feedback de cliente
```

### 5.4 Registo de Agentes

Para registar um novo agente:

```
POST   /api/agent/register
body: {
  name: "Discovery Agent",
  description: "Recolhe requisitos de clientes via Telegram",
  capabilities: ["create_tasks", "create_interactions", "read_projects"],
  owner: "miguel"
}
→ Retorna: { agent_id, api_token }
```

O Maestro cria um trust score separado para o novo agente. Começa em 0 (validação total).

---

## 6. Marketplace de Conectores (Futuro)

### 6.1 Conceito

Um marketplace onde conectores pré-construídos são disponibilizados para instalação fácil. Três fontes:

| Fonte | Descrição | Custo |
|-------|-----------|-------|
| Oficiais | Construídos e mantidos pela equipa do Centro de Comando | Incluídos |
| Comunidade | Criados por developers externos | Gratuitos ou pagos |
| Parceiros | Criados por empresas parceiras (ERPs, faturação, etc.) | Pagos (comissão) |

### 6.2 Estrutura de um Conector do Marketplace

Cada conector no marketplace inclui:

- Nome e descrição
- Ferramenta que liga (com logo)
- O que faz (entradas e saídas)
- Requisitos (tipo de conta, API key, etc.)
- Rating e reviews
- Botão "Instalar" → OAuth ou configuração de credenciais → ativo

### 6.3 Modelo de Negócio

- Conectores essenciais (Gmail, Calendar, GitHub) são gratuitos
- Conectores especializados (ERPs, faturação, contabilidade) podem ser pagos
- Parceiros que criam conectores ganham percentagem das vendas
- Conector genérico é sempre gratuito (fallback universal)

---

## 7. Sync Engine

### 7.1 Arquitetura

```
┌─────────────────────────────────────┐
│         SYNC ENGINE                  │
│                                     │
│  ┌──────────┐  ┌──────────────┐    │
│  │ Scheduler │  │ Task Queue   │    │
│  │ (cron)   │→ │ (processamento│   │
│  └──────────┘  │  assíncrono)  │    │
│                └──────┬───────┘    │
│                       │            │
│    ┌──────────────────┼────────┐   │
│    │         │        │        │   │
│  ┌─┴──┐  ┌──┴──┐  ┌──┴──┐  ┌─┴─┐ │
│  │Gmail│  │Cal  │  │Drive│  │...│ │
│  │Sync │  │Sync │  │Sync │  │   │ │
│  └─────┘  └─────┘  └─────┘  └───┘ │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 Jobs de Sincronização

| Job | Frequência | Fonte | Ação |
|-----|-----------|-------|------|
| sync-gmail | 30 min | Gmail API | Emails de/para contactos → feed CRM |
| sync-calendar | 15 min | Calendar API | Reuniões → interações, alertas |
| sync-drive | 1 hora | Drive API | Documentos novos/modificados → feed |
| sync-github | 15 min (fallback) | GitHub API | Commits, PRs, deploys → Dev Hub |
| extract-ai-calls | Após transcrição | Transcrição (Whisper) | Resumo, tarefas, decisões das calls |
| calculate-alerts | 1 hora | Base de dados | Alertas (tarefas atrasadas, clientes sem contacto) |
| calculate-projections | Diário | Base de dados | Projeções de objetivos |
| snapshot-okrs | Diário | Base de dados | Capturar progresso dos objetivos |
| sync-generic-{id} | Configurável | API externa | Conforme mapeamento do conector genérico |

### 7.3 Webhooks (Tempo Real)

Endpoints para receber dados em tempo real:

```
POST /api/webhooks/github       → Push, PRs, deploys (HMAC SHA-256)
POST /api/webhooks/slack        → Mensagens de canais
POST /api/webhooks/generic/{id} → Dados de conectores genéricos
```

### 7.4 Auditoria

Toda a sincronização é registada na tabela `SyncLog`:

| Campo | Descrição |
|-------|-----------|
| Job | Nome do job |
| Fonte | De onde vieram os dados |
| Estado | Sucesso, falha, parcial |
| Itens processados | Quantos itens foram processados |
| Itens criados | Quantos itens novos no sistema |
| Erros | Detalhes de erros (se houver) |
| Duração | Quanto tempo demorou |
| Timestamp | Quando executou |

---

## 8. Painel de Gestão

### 8.1 Vista de Integrações

O utilizador tem um painel para gerir todas as integrações:

**Para cada integração:**

- Nome e ícone da ferramenta
- Estado (ativo, inativo, erro)
- Última sincronização (quando e estado)
- Itens processados (últimas 24h, última semana)
- Erros recentes
- Botões: configurar, desativar, testar, ver logs

### 8.2 Adicionar Nova Integração

- Lista de conectores pré-construídos disponíveis (com botão "Ligar")
- Opção "Conector genérico" (com formulário ou assistente Maestro)
- Marketplace (quando disponível)

### 8.3 Logs e Diagnóstico

- Historial de sincronizações por integração
- Filtro por estado (sucesso, falha, parcial)
- Detalhes de erros com sugestão de resolução
- Botão "Sincronizar agora" para forçar sync manual

---

## 9. Maestro AI no Módulo

### 9.1 Normalização e Routing

O Maestro decide automaticamente para onde vão os dados de cada integração:

| Dados que entram | Decisão do Maestro |
|------------------|-------------------|
| Email de cliente X | → Feed de interações do cliente X |
| Evento de calendar com cliente Y | → Interação tipo "call" + alerta de preparação |
| Commit no repo Z | → Dev Hub + ligar a tarefa se encontrar referência |
| Mensagem do Slack com "decidimos que..." | → Decisão no feed do projeto |
| Webhook genérico com dados de fatura | → Tarefa de validação no projeto configurado |

### 9.2 Deteção de Problemas

- Integração sem dados há 24h+ → alerta (pode estar desligada ou com erro)
- Muitos erros consecutivos → sugerir reconfiguração
- Dados duplicados → detetar e alertar
- Token expirado → alerta e instruções de renovação

### 9.3 Sugestões

- "Tens Gmail e Calendar ligados mas não tens Drive. Queres ligar para capturar documentos?"
- "Há um conector para [ferramenta que deteta nas interações]. Queres instalar?"
- "O conector X tem muitos erros. Queres que tente reconfigurar?"

### 9.4 Notificações de Saída

Quando o Maestro gera alertas, pode enviar notificações por canais externos. **Totalmente configurável:**

- Cada utilizador escolhe se quer receber notificações externas ou não
- Se sim, escolhe o canal: Telegram, WhatsApp, email, Slack, ou outro configurado
- Pode configurar por tipo de alerta: "deploy falhado → Telegram imediato", "cliente sem contacto → email diário", "tarefa atrasada → não notificar"
- Por defeito, notificações externas estão desativadas — o utilizador ativa se quiser
- Horário de não-perturbar configurável (ex: sem notificações entre 22h e 8h)

---

## 10. Adaptabilidade Multi-Empresa

### 10.1 O que é configurável

| Elemento | Configurável |
|----------|-------------|
| Conectores ativos | Sim — cada empresa ativa os que precisa |
| Permissões | Cada utilizador pode ligar as suas próprias contas (ex: o seu Gmail, o seu Calendar). Integrações globais (conector genérico, Agent API) são geridas pelo admin. |
| Credenciais | Sim — cada utilizador configura as suas contas pessoais, admin configura as globais |
| Mapeamento de dados | Sim — conector genérico permite mapping custom |
| Frequência de sync | Sim — por integração |
| Filtros | Sim — que dados processar/ignorar |
| Agentes registados | Sim — cada empresa regista os seus agentes |
| Webhooks | Sim — URLs únicos por empresa por integração |

### 10.2 Cenários por Setor

- **Software/Tech:** Gmail, Calendar, GitHub, Slack — integrações de desenvolvimento e comunicação
- **Serviços profissionais:** Gmail, Calendar, Drive — comunicação e documentos com clientes
- **Contabilidade:** Gmail, Calendar, Primavera/PHC (genérico) — email e ERP
- **Comércio:** Gmail, Calendar, loja online (genérico) — email e vendas

---

## 11. API do Módulo

### 11.1 Gestão de Integrações

```
GET    /api/integrations                           → Lista integrações ativas
GET    /api/integrations/available                 → Conectores disponíveis para ativar
POST   /api/integrations                           → Ativar integração
       body: { connector_type, credentials, config }
PATCH  /api/integrations/{id}                      → Editar configuração
DELETE /api/integrations/{id}                      → Desativar integração

GET    /api/integrations/{id}/logs                 → Logs de sincronização
POST   /api/integrations/{id}/sync                 → Forçar sincronização manual
POST   /api/integrations/{id}/test                 → Testar conexão

GET    /api/integrations/generic/{id}/mapping       → Ver mapeamento
PATCH  /api/integrations/generic/{id}/mapping       → Editar mapeamento
```

### 11.2 Marketplace (futuro)

```
GET    /api/marketplace                            → Lista conectores disponíveis
GET    /api/marketplace/{id}                       → Detalhe do conector
POST   /api/marketplace/{id}/install               → Instalar conector
```

---

## 12. Modelo de Dados (Resumo)

### Tabelas principais

- **Integration** — id, empresa_id, connector_type (prebuilt/generic), nome, config (JSON: credenciais, mapeamento), estado (ativo/inativo/erro), última_sync, created_at
- **IntegrationMapping** — id, integration_id, campo_origem, campo_destino, transformação, condição
- **SyncLog** — id, integration_id, job_name, estado, itens_processados, itens_criados, erros, duração, timestamp
- **AgentRegistration** — id, empresa_id, nome, descrição, capabilities[], api_token_hash, trust_score_id, is_active, created_at
- **WebhookEndpoint** — id, integration_id, url_path, secret_hash, is_active

### Relações

- Integration N:1 Empresa
- Integration 1:N IntegrationMapping (para genéricos)
- Integration 1:N SyncLog
- Integration 1:N WebhookEndpoint
- AgentRegistration N:1 Empresa
- AgentRegistration 1:1 TrustScore

---

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
