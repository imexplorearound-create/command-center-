# Command Center — Manual de Utilização
**Versão:** 1.0 (Sprint 1)
**Data:** 2 Abril 2026

---

## O que é

O Command Center é o cockpit de gestão da empresa. Uma aplicação web que mostra todos os projectos, tarefas, objectivos, relação com clientes e pipelines de trabalho — tudo num único sítio.

Neste momento funciona com **dados de exemplo** (mock). Quando o Bruno criar a base de dados, passa a ter dados reais.

---

## Como aceder

### 1. Ligar o tunnel SSH

No terminal do Mac, corre:

```
ssh -L 3100:127.0.0.1:3100 miguel@89.167.39.10
```

Insere a password quando pedida.

### 2. Abrir no browser

Vai a: **http://127.0.0.1:3100**

### 3. Se a página não carrega

- Confirma que o tunnel está activo (o terminal com SSH deve estar aberto)
- Faz Cmd+Shift+R para limpar o cache
- Se der "recusou ligação", fecha o SSH e repete o passo 1

---

## Páginas disponíveis

### Dashboard (`/`)

A página principal. Abre e num segundo percebes o estado de tudo.

**O que mostra:**
- **Estatísticas** — tarefas activas, atrasadas, concluídas, nº de projectos
- **Blocos de projecto** — AURA PMS, iPME Digital, Operações, Conteúdo. Cada um com progresso, saúde (verde/amarelo/vermelho) e fase actual. Clica para ir ao detalhe
- **Objectivos 2026** — barras de progresso (1M€, 50 propriedades, contrato iPME)
- **Fontes de dados** — contadores de Calls, Conteúdo, Discord, Calendário, GitHub
- **A Validar (Trust Score)** — itens extraídos por AI que precisam de confirmação. Cada item tem confiança (%) e botões ✓ ✎ ✗. Em baixo, o Trust Score por tipo de extracção
- **Alertas** — tarefas atrasadas, sem prazo, pendentes de aprovação

---

### Mapa Estratégico (`/objectives`)

Diagrama visual que mostra como os objectivos se ligam.

**Estrutura:**
```
       ┌──────────────────────┐
       │  Facturar 1M€ (12%)  │   ← objectivo principal
       └──────────┬───────────┘
                  │
        ┌─────────┴────────┐
        │                  │
  ┌─────┴─────┐     ┌─────┴──────┐
  │ AURA PMS  │     │   iPME     │   ← sub-objectivos
  │ 0/50 prop │     │  0/1 contr │
  └─────┬─────┘     └─────┬──────┘
        │                 │
   tarefas...         tarefas...      ← tarefas relacionadas
```

Cada nó mostra: progresso, badge de saúde, prazo. As tarefas em baixo têm ponto de cor por estado e responsável.

---

### Vista de Projecto (`/project/aura-pms` ou `/project/ipme-digital`)

Detalhe completo de um projecto. Tem separadores:

**📋 Kanban** — tarefas organizadas em 5 colunas:
- Backlog → A Fazer → Em Curso → Em Revisão → Feito
- Cada cartão mostra: prioridade (cor), título, responsável (avatar), origem (call/manual), prazo
- Cartões com borda laranja = parados há 2+ dias
- Cartões com borda tracejada amarela = extraídos por AI (com badge 🤖 e %)
- Cartões com indicador GitHub: 🔨 branch, ⚙️ PR em review, ✅ merged, 🚀 deployed

**📅 Timeline** — fases do projecto em linha:
- Círculos: ✓ concluído (verde), % em curso (amarelo), número pendente (cinza)
- Datas de cada fase
- Marcador "Hoje"

**💻 Dev** (se o projecto tem repo GitHub) — métricas de desenvolvimento:
- Commits do mês, PRs abertos/merged, deploys, velocidade
- Gráfico de actividade por semana
- Lista de PRs abertos (com link para GitHub)
- Últimos commits
- Deploys recentes (✅ sucesso / ❌ falha)

**👥 Cliente** (só iPME Digital) — link para o Client Hub

---

### Client Hub (`/project/ipme-digital/client`)

Historial completo da relação com o cliente Fiscomelres/iPME.

**Barra de info:** empresa, contacto principal, estado (Negociação), último contacto

**Contactos:** Sérgio, Nuno, Márcia — clica num para filtrar o feed por essa pessoa

**Próximos passos:** acções pendentes com prioridade e responsável

**Feed de interacções:** lista cronológica (mais recente em cima)
- 📞 Calls — resumo, participantes
- ✅ Decisões — o que foi decidido
- 📧 Emails
- 📄 Documentos
- 📝 Notas pessoais

**Filtros:** botões de tipo (Tudo / Calls / Emails / Decisões / Docs / Notas) + filtro por pessoa. Combinam entre si.

---

### Workflows (`/workflows`)

Processos reutilizáveis da empresa.

**Tab "Em curso"** — instâncias activas:
- Exemplo: "Fecho mensal — Março 2026" (Financeiro, 33%, 2/6 passos)
- Clica para expandir e ver todos os passos com estado (✓ concluído, ● em curso, 🔒 bloqueado, ○ pendente)

**Tab "Templates"** — biblioteca de processos:
- Onboarding novo colaborador (8 passos, ~30 dias)
- Setup novo projeto cliente (5 passos, ~5 dias)
- Fecho mensal contabilidade (6 passos, recorrente)
- Processo de contratação (6 passos, ~21 dias)
- Clica para expandir e ver os passos com prioridade, role, prazo relativo e dependências

---

### Pipeline de Conteúdo (`/content`)

Vista Kanban do content engine em 5 colunas:
- 💡 Proposta → 👍 Aprovado → 🎬 Produção → ✅ Pronto → 📢 Publicado

Cada cartão mostra: título, formato (Call + B-roll, Avatar AI, Mixed), plataforma (LinkedIn, Instagram, TikTok), data.

---

## Modo claro / escuro

No fundo da sidebar há um botão:
- ☀ **Modo claro** — fundo branco, texto escuro
- 🌙 **Modo escuro** — fundo escuro (default)

A escolha fica guardada no browser.

---

## O que ainda falta (próximos sprints)

| Funcionalidade | Depende de |
|---|---|
| Dados reais (PostgreSQL) | Bruno criar database |
| Drag & drop no Kanban | Base de dados |
| Sync Google Drive/Gmail/Calendar | APIs configuradas |
| Sync Discord | Bot Discord |
| Webhooks GitHub (dados reais) | Token + Bruno configurar repos |
| Extracção AI de calls | Anthropic API key |
| Auth Google OAuth | Google OAuth credentials |
| Notificações Telegram | Já funciona via OpenClaw |
| Deploy com Docker + Nginx + SSL | Bruno |

---

## Ficheiros do projecto

```
/home/miguel/command-center/
├── app/                    ← páginas e API
├── components/             ← componentes reutilizáveis
├── lib/                    ← tipos, utilitários, dados mock
├── prisma/                 ← schema da base de dados + seed
├── docs/                   ← specs e documentação
│   ├── command-center-spec-v1.2.md
│   ├── addendum-github-v1.0.md
│   ├── setup-database-bruno.md
│   └── manual-command-center.md  ← este ficheiro
└── server.log              ← logs do servidor
```

**Servidor:** corre na porta 3100 do VPS (89.167.39.10)

**Para reiniciar o servidor** (se necessário):
```bash
cd /home/miguel/command-center
fuser -k 3100/tcp
PORT=3100 nohup pnpm start -p 3100 > server.log 2>&1 &
```

---

*Gerado a 2 de Abril de 2026.*
