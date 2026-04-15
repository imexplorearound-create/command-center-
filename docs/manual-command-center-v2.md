# Command Center — Manual de Funcionalidades v2.0

**Para:** Bruno  
**Data:** 12 Abril 2026  
**Versão:** SaaS Multi-Tenant

---

## O que é

O Command Center é o cockpit de gestão da empresa. Uma aplicação web que centraliza projectos, tarefas, equipa, clientes, pipeline comercial, horas, emails e investimentos — tudo num único sítio, em tempo real. Substitui a dispersão entre Excel, ClickUp, Gmail e Drive.

**Acesso:** `http://[subdominio].commandcenter.pt` ou via IP directo (dev)  
**Login:** Email + password. Cada organização (tenant) tem o seu espaço isolado.

---

## Arquitectura

- **Multi-tenant:** Cada empresa/organização tem dados completamente isolados. Um tenant = uma instância lógica.
- **Módulos plugáveis:** O admin activa/desactiva funcionalidades por tenant. O sidebar adapta-se automaticamente.
- **Roles:** Admin (acesso total), Manager (gere departamentos), Membro (projectos atribuídos), Cliente (só vê o seu Client Hub).
- **Idiomas:** Português (PT-PT) e Inglês. Configurável por tenant.

---

## Módulos e Funcionalidades

### 1. Dashboard

Visão geral com:
- Cards de projectos (saúde, progresso, tarefas)
- Objectivos activos (barra horizontal)
- Fontes de dados (Gmail, Calendar, GitHub, Discord)
- Painel de alertas por severidade
- Painel de validação humana (confirmar/editar/rejeitar dados extraídos por AI)

### 2. Projectos e Tarefas

- CRUD de projectos com fases ordenadas
- **Kanban board** com drag-drop (5 colunas: Backlog → Feito)
- Filtros por status, prioridade, responsável
- Cada tarefa tem: título, descrição, deadline, assignee, prioridade, origem (manual/AI/GitHub/email)
- **Client Hub:** vista dedicada para clientes verem o progresso do seu projecto + feed de interacções

### 3. OKRs (Objectivos)

- 3 vistas: Lista, Roadmap (timeline), Mapa (árvore)
- Objectivos com Key Results e progresso percentual
- Snapshots periódicos para histórico

### 4. Pipeline Comercial (CRM)

- **Kanban de oportunidades** com 6 fases: Contacto Inicial → Qualificação → Proposta → Negociação → Ganho/Perdido
- Ficha de oportunidade: empresa, NIF, valor, probabilidade, contacto, responsável, data prevista de fecho
- Timeline de actividades (chamadas, reuniões, emails, notas)
- **Conversão automática:** oportunidade ganha → cria projecto + cliente + contacto
- Métricas no header: total de deals, valor total, taxa de conversão
- **Campanhas de Email:** criar campanhas, definir audiência por filtros (áreas, roles, projectos), enviar via SMTP, métricas de envio/abertura
- **Botão Exportar:** PDF do pipeline ou Excel com todos os dados

### 5. Registo de Horas (Timetracking)

- **Vista semanal** (segunda a domingo) com grid visual
- Registo manual: projecto, tarefa, duração (horas + minutos), facturável/não facturável
- **Timer:** iniciar/parar cronómetro na tarefa
- **Submissão semanal:** colaborador submete, manager aprova/rejeita
- Vista de aprovação para managers (agrupar por pessoa, aprovar em bulk)
- Resumo: horas totais vs. contratadas
- **Botão Exportar:** Excel/PDF das horas por período

### 6. Email Integrado

- Sincronização automática com Gmail (polling via API)
- **Categorização:** cada email é associado a projecto/cliente/pessoa
  - Auto-match: se o remetente já é contacto → categorização automática
  - Manual: emails desconhecidos ficam "por categorizar" para o utilizador classificar
- Filtros por projecto, cliente, estado
- Trust Score na categorização (confiança da AI)

### 7. Investimento / Cross-Departamento

- **Mapa de investimento** por projecto: orçamento total, fonte de financiamento (PRR, PT2030, próprio), % a fundo perdido
- **Rubricas orçamentais:** nome, valor alocado, valor executado, departamento responsável
- Barras de progresso de execução
- **Gerar tarefas:** a partir de rubricas → cria Tasks no kanban automaticamente
- **Dashboard cross-departamento:** agregado por área, desvios orçamentais
- **Botão Exportar:** Excel com overview + rubricas detalhadas

### 8. Pessoas e Contactos

- Equipa interna + contactos externos
- Nome, email, papel, custo/hora, horas semanais
- Associação a projectos e áreas
- **Botão Exportar:** Excel de contactos

### 9. Áreas Operacionais

- Departamentos da empresa (Multimédia, Consultoria, Financeiro, etc.)
- Cada área tem owner, projectos associados, membros

### 10. Workflows

- Templates de processos reutilizáveis (ex: Onboarding Cliente, Kick-off Projecto)
- Passos com ordem, responsável por defeito, duração estimada
- Instanciar workflow → cria tarefas automaticamente
- Trigger manual ou automático

### 11. Content Pipeline

- Gestão de conteúdo: vídeos, artigos, posts, reels, carrosséis
- Estados configuráveis por tenant (default: Proposta → Aprovado → Em Produção → Pronto → Publicado)
- Plataformas: LinkedIn, Instagram, TikTok, YouTube, Twitter
- Kanban de conteúdo com drag-drop

### 12. Feedback (Chrome Extension)

- Plugin Chrome para clientes/testers
- Gravar notas de voz + captura de ecrã enquanto testam o projecto
- Classificação automática por AI (bug, sugestão, elogio)
- Painel interno para revisão e criação de tarefas a partir do feedback

### 13. GitHub Integration

- Webhook: PRs, commits, issues sincronizados automaticamente
- Métricas de desenvolvimento (commits/dia, PRs abertos)
- Tab "Dev" no detalhe do projecto

### 14. Maestro (AI Assistant)

- Chat integrado com Claude (Anthropic)
- Ferramentas: listar projectos, criar tarefas, resumir horas, consultar pipeline
- Trust Score: acções sensíveis (financeiro, delete, comunicação) requerem validação humana

---

## Funcionalidades Transversais

| Funcionalidade | Descrição |
|---|---|
| **Exportação** | Botão "Exportar" em todas as vistas de lista. PDF para relatórios, Excel para dados crus. |
| **Onboarding** | Wizard de 5 passos para novos tenants: empresa, equipa, áreas, pessoas (manual + CSV), módulos. |
| **i18n** | Interface em PT-PT ou EN. Configurável por tenant. |
| **Alertas** | Sistema de notificações por severidade (email, in-app). |
| **Validação Humana** | Dados extraídos por AI passam por 3 estados: Por Confirmar → Auto-confirmado → Confirmado. |

---

## API de Integração

Para sistemas externos (contabilidade, ERP) comunicarem com o Command Center:

| Endpoint | Descrição |
|---|---|
| `POST /api/integration/ingest/clients` | Importar/actualizar clientes |
| `POST /api/integration/ingest/contacts` | Importar contactos em batch |
| `POST /api/integration/ingest/financials` | Actualizar execução orçamental |
| `GET /api/integration/export/projects` | Exportar projectos com métricas |
| `GET /api/integration/export/timeentries` | Exportar horas para processamento salarial |

**Auth:** Bearer token (SYNC_SECRET) + header X-Tenant-Id.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes + Server Actions |
| Base de Dados | PostgreSQL 16 + Prisma 7 |
| Auth | JWT + bcrypt + cookies httpOnly |
| AI | Claude (Anthropic) + MiniMax |
| Drag-drop | @dnd-kit |
| PDF/Excel | pdfkit + xlsx |

---

*Command Center v2.0 — Iniciativa PME / imexplorearound*
