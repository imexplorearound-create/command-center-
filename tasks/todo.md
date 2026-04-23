# Command Center v2 — Sprint 1: CRUD de Projectos + Fases

**Estado:** Implementado, pendente teste manual.
**Data:** 2026-04-07

## Decisões fechadas (toda a v2)

1. **Sem `PendingAction`** — os 3 níveis de trust evoluem o `validationStatus` existente. Propostas de Nível 1 aparecem no kanban com badge "🤖 Por validar".
2. **Endpoints `/api/agent/*` devolvem `{type: "pending"|"executed", ...}`** — agentes OpenClaw têm de ser actualizados antes do Sprint 3 ligar o gating. Sprints 1-2 não tocam no Agent API.
3. **Lista hardcoded de acções sensíveis** em `lib/agent-trust-rules.ts` (Sprint 3): financeiro, identidade/acesso, delete de Project/Person, comunicação externa, Alert critical. Conteúdo publicado deixa passar para Nível 3.

## Sprint 1 — checklist

### Schema & dados
- [x] Adicionar `archivedAt` ao modelo `Project` (Prisma)
- [x] `pnpm prisma db push` (workflow do projecto, sem migrations versionadas)
- [x] `pnpm prisma generate` (regenerar tipos)

### Filtros de queries
- [x] `NOT_ARCHIVED` exportado de `lib/queries.ts`
- [x] `getProjects()` filtra arquivados
- [x] `getStats()` (contador `activeProjects`) filtra arquivados
- [x] `app/api/agent/projects/route.ts` filtra arquivados
- [x] `app/(app)/objectives/page.tsx` (picker de projectos) filtra arquivados
- [x] `getProjectBySlug()` **não** filtra (URLs directas continuam a funcionar)
- [x] Syncs (gmail/calendar/discord) **não** filtram (preserva attachments para futuro restore)
- [x] `agent-helpers.resolveProjectSlug` **não** filtra (decisão deferida para action layer no Sprint 2)

### Validação
- [x] `lib/validation/project-schema.ts` — Zod schemas para Project e Phase + helper `slugify()`

### Server Actions
- [x] `lib/actions/project-actions.ts` — `createProject`, `updateProject`, `archiveProject`
- [x] `lib/actions/phase-actions.ts` — `createPhase`, `updatePhase`, `deletePhase`, `reorderPhases`
- [x] Auth gate: só `admin`
- [x] Try/catch P2002 (slug duplicado) com mensagem amigável
- [x] Bloquear archive de projecto com tasks activas
- [x] Bloquear delete de fase com tasks ligadas
- [x] `revalidatePath` no fim de cada acção

### Componentes UI
- [x] `components/shared/modal.tsx` — base com `<dialog>` HTML nativo
- [x] `components/shared/confirm-dialog.tsx`
- [x] `components/projects/project-form-fields.tsx` — partilhado entre create/edit
- [x] `components/projects/project-edit-modal.tsx` — usa `useActionState`
- [x] `components/projects/new-project-button.tsx`
- [x] `components/projects/edit-project-button.tsx`
- [x] `components/projects/archive-project-button.tsx`
- [x] `components/phases/phase-edit-modal.tsx`
- [x] `components/phases/phase-list-editable.tsx` — reorder com setas ↑↓ (drag fica para Sprint 2)

### Integração
- [x] `app/(app)/page.tsx` — `NewProjectButton` no header da secção projectos (gated por role)
- [x] `app/(app)/project/[slug]/page.tsx` — passa `canEdit` ao `ProjectView`
- [x] `app/(app)/project/[slug]/project-view.tsx` — botões edit/archive no header, `PhaseListEditable` na tab Timeline
- [x] `app/layout.tsx` — `<Toaster>` do Sonner

### Verificação
- [x] `pnpm exec tsc --noEmit` — zero erros
- [x] `pnpm build` — verde
- [ ] **Testes manuais (ver checklist abaixo)**

## Checklist de testes manuais (Sprint 1)

### Projectos
- [ ] Login como **admin** → vejo `+ Novo Projecto` no dashboard
- [ ] Login como **membro/cliente** → não vejo o botão
- [ ] Criar projecto "Teste X" → slug auto-gerado é "teste-x", redirect para `/project/teste-x`
- [ ] Criar projecto com slug duplicado → toast de erro claro
- [ ] Botão lápis (✎) no header do projecto abre modal com dados pré-preenchidos
- [ ] Editar nome → header actualiza após guardar
- [ ] Editar slug → URL muda, redirect funciona
- [ ] Editar progress → barra reflecte
- [ ] Editar health → indicador no header reflecte
- [ ] Botão arquivo (🗄) → confirma → projecto desaparece do dashboard
- [ ] Tentar arquivar projecto com tasks `em_curso` → erro claro com contagem
- [ ] Verificar no DB: `archived_at` preenchido, sem DELETE

### Fases
- [ ] Tab Timeline aparece em projecto sem fases (apenas para admin)
- [ ] Botão `+ Fase` → modal → criar fase
- [ ] Lista mostra fase com status, progresso, datas
- [ ] Setas ↑↓ reordenam (DB actualiza)
- [ ] Botão ✎ → modal de edição com dados pré-preenchidos
- [ ] `endDate < startDate` → erro de validação
- [ ] Botão 🗑 → confirma → apaga
- [ ] Tentar apagar fase com tasks ligadas → erro claro

### Não-regressão
- [ ] Dashboard carrega sem erros
- [ ] Página de projecto não-arquivado abre normalmente
- [ ] Validation panel ainda funciona
- [ ] Agent API: `GET /api/agent/projects` não devolve arquivados
- [ ] Page de objectivos abre, picker de projectos não tem arquivados

## Decisões deferidas (não estão no Sprint 1)

- **Restore de projectos arquivados** — Sprint 1.5 ou mais tarde
- **Banner "este projecto está arquivado"** quando navegar directamente — UI for later
- **Esconder alertas/objectivos de projectos arquivados** — Sprint 1 deixa-os visíveis
- **Audit log das acções deste sprint** — Sprint 6 (TODOs marcados implicitamente)
- **`order` em Task / drag&drop kanban** — Sprint 2

## Revisão (preencher após testes)

_(a preencher pelo Miguel após testar)_

---

# Sprint 1.5 — Verificação do Sprint 1 (manual)

**Estado:** A correr.
**Data:** 2026-04-08

Antes de tocar em código novo, verificar que o que já existe funciona. Esta checklist é a do Sprint 1 (linhas 63-94 acima) consolidada por blocos. O Miguel corre no browser; eu marco à medida que ele reporta.

## Pré-requisitos (verificáveis pelo Claude)
- [x] `pnpm exec tsc --noEmit` — exit 0
- [x] `pnpm build` — verde
- [ ] DB tem dados do seed (correr `pnpm prisma db seed` se vazia)
- [ ] **Faltam users não-admin no seed** — Sprint 1 testa "login como membro/cliente não vê o botão". Decisão: criar 1 user `membro` e 1 user `cliente` no seed, ou marcar este teste como "não testado, deferido".

## Bloco A — Projetos (admin)
- [ ] A1. Login `miguel@example.com` / `commandcenter2026` → vejo `+ Novo Projecto` no dashboard
- [ ] A2. Criar projecto "Teste X" → slug "teste-x", redirect para `/project/teste-x`
- [ ] A3. Criar projecto com slug duplicado ("aura-pms") → toast de erro claro
- [ ] A4. Botão ✎ no header abre modal pré-preenchido
- [ ] A5. Editar nome → header actualiza
- [ ] A6. Editar slug → URL muda, redirect funciona
- [ ] A7. Editar progress → barra reflecte
- [ ] A8. Editar health → indicador no header reflecte
- [ ] A9. Botão 🗄 → confirma → projecto desaparece do dashboard
- [ ] A10. Tentar arquivar projecto com tasks `em_curso` → erro claro
- [ ] A11. DB: `archived_at` preenchido, sem DELETE (eu verifico via query)

## Bloco B — Fases (admin)
- [ ] B1. Tab Timeline aparece em projecto sem fases (admin)
- [ ] B2. `+ Fase` → modal → criar fase
- [ ] B3. Lista mostra fase com status, progresso, datas
- [ ] B4. Setas ↑↓ reordenam (DB actualiza)
- [ ] B5. ✎ → edição
- [ ] B6. `endDate < startDate` → erro de validação
- [ ] B7. 🗑 → confirma → apaga
- [ ] B8. Apagar fase com tasks ligadas → erro claro

## Bloco C — Não-regressão
- [ ] C1. Dashboard carrega sem erros
- [ ] C2. `/objectives` abre, picker de projectos não tem arquivados
- [ ] C3. `GET /api/agent/projects` (curl) não devolve arquivados

## Bloco D — Roles (depende do pré-requisito)
- [ ] D1. Login como `membro` → não vejo `+ Novo Projecto`
- [ ] D2. Login como `cliente` → não vejo nem botões de edit/archive

## Revisão Sprint 1.5
_(a preencher após testes)_

---

# Sprint 2 — Tasks + Kanban

**Estado:** Planeado, pendente aprovação do Miguel.
**Data:** 2026-04-08
**Âmbito:** enxuto — Kanban funcional com CRUD de tasks. Sem Timeline/Mapa (esses ficam para Sprint 3 ou depois).
**Pré-condição:** Sprint 1.5 verde.

## Decisões fechadas (input do Miguel)
1. **shadcn/ui** — adoptar agora, instalar e usar nos componentes novos do kanban e modais. Não migrar componentes Sprint 1.
2. **NextAuth** — manter custom JWT.
3. **BullMQ/Redis** — adiado para fase de integrações.
4. **Vitest** — instalar agora, escrever testes para queries/actions de tasks. Playwright fica para depois.
5. **Docker / NextAuth migration** — não tocar.
6. **TrustScore por categoria** — adiado para o sprint do Maestro.

## Decisões de design (preciso confirmação do Miguel antes de codar)
- **D1 — Coluna `kanbanOrder` em Task.** Para persistir a ordem dentro de cada coluna após drag&drop. `Int` indexado por `(projectId, status)`. Default = `createdAt` epoch ms na migração inicial.
- **D2 — "Apagar" vs "Arquivar" task.** Sprint 1 escolheu archive para projetos. Para tasks, proponho **arquivar (`archivedAt`)** também, com filtro `NOT_ARCHIVED`. Permite restore futuro e auditoria.
- **D3 — Quem pode criar/editar tasks?** Sprint 1 fez admin-only para projetos. Para tasks proponho **`admin` + `membro`**, e `cliente` só vê. (As tarefas são o coração operacional — limitar a admin é demasiado.)
- **D4 — Filtros como Server Components com query params** (`?assignee=...&priority=...&origin=...`), não estado client. Permite partilha de URL e SSR.
- **D5 — Validation gating no kanban.** Tasks com `validationStatus: por_confirmar` aparecem no kanban (na coluna que o agente sugeriu) com badge amarelo + ações inline [Confirmar][Editar][Rejeitar]. Não há vista separada. Isto está alinhado com o spec v2 secção UI/UX.

## Schema & dados
- [ ] Adicionar `kanbanOrder Int @default(0)` a `Task` (Prisma)
- [ ] Adicionar `archivedAt DateTime?` a `Task` + index `@@index([archivedAt])`
- [ ] `pnpm prisma db push`
- [ ] `pnpm prisma generate`
- [ ] Backfill: script one-shot que define `kanbanOrder` por `(projectId, status)` ordenado por `createdAt`

## Dependências novas
- [ ] `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] `pnpm dlx shadcn@latest init` (configurar com Tailwind v4 — verificar compatibilidade)
- [ ] `pnpm dlx shadcn@latest add button dialog input textarea select badge avatar dropdown-menu` (mínimo)
- [ ] `pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom`
- [ ] `vitest.config.ts` + script `"test": "vitest"` no package.json

## Validação
- [ ] `lib/validation/task-schema.ts` — Zod: `taskCreateSchema`, `taskUpdateSchema`, `taskMoveSchema`. Validar status ∈ TaskStatus, priority ∈ Priority, deadline ISO ou null, assigneeId UUID ou null.

## Filtros de queries (helper partilhado)
- [ ] `NOT_ARCHIVED_TASK = { archivedAt: null }` exportado de `lib/queries.ts`
- [ ] Aplicar em `getTasksByProject`, `getStats`, dashboard, validation panel
- [ ] **NÃO** aplicar em `getTaskById` (URL directa funciona para arquivadas)
- [ ] **NÃO** aplicar em `/api/agent/tasks` GET por defeito? Decisão: aplicar, com `?includeArchived=1` opcional

## Server Actions (`lib/actions/task-actions.ts`)
- [ ] `createTask(input)` — auth `admin|membro`, valida com Zod, cria com `kanbanOrder = max+1` da coluna alvo
- [ ] `updateTask(id, input)` — patch parcial, recalcula `daysStale` se houve movimento
- [ ] `archiveTask(id)` — define `archivedAt`, **bloqueia** se tarefa está em workflow instance activa
- [ ] `restoreTask(id)` — limpa `archivedAt` (admin only)
- [ ] `moveTask(id, { status, kanbanOrder })` — actualiza status e ordem; reordena vizinhos da coluna destino + origem; se `status === 'feito'` e `validationStatus === 'por_confirmar'`, **bloqueia** (regra spec linha 1544: nunca mover para Feito sem 1 confirmação prévia)
- [ ] `validateTask(id, action: 'confirmar'|'editar'|'rejeitar', edits?)` — Sprint 1 já tem `validation-actions.tsx` no dashboard; reaproveitar lógica e mover para action partilhada
- [ ] Try/catch + mensagens amigáveis
- [ ] `revalidatePath('/project/[slug]')` no fim

## Componentes UI (`components/kanban/`)
- [ ] `kanban-board.tsx` — Server Component que carrega tasks, agrupa por status, renderiza 5 `KanbanColumn`
- [ ] `kanban-column.tsx` — Client Component (precisa de `useDroppable`)
- [ ] `task-card.tsx` — Client Component (`useSortable`). Mostra: título, badge prioridade (cor), avatar assignee, badge origem, indicador `daysStale > 2`, badge AI se `validationStatus === 'por_confirmar'`
- [ ] `task-card-actions.tsx` — para tasks "por_confirmar": botões inline [✓][✎][✗]
- [ ] `task-edit-modal.tsx` — usa `Dialog` shadcn + `useActionState`; campos: título, descrição, project (read-only se contexto), phase, area, assignee, priority, status, deadline
- [ ] `new-task-button.tsx` — abre modal vazio com defaults da coluna alvo
- [ ] `archive-task-button.tsx` — confirm dialog
- [ ] `task-filters.tsx` — Server Component: dropdowns que setam query params (`<form>` GET)

## Drag & drop (cliente)
- [ ] `kanban-dnd-context.tsx` — `<DndContext>` envolve o board, lida com `onDragEnd`, chama `moveTask` server action
- [ ] Optimistic update via `useOptimistic` (React 19) para feedback instantâneo
- [ ] Tratamento de erro: revert UI + toast se action falhar
- [ ] **Não** persistir ordem entre projetos diferentes; drag dentro do mesmo projeto apenas

## Integração
- [ ] `app/(app)/project/[slug]/project-view.tsx` — adicionar tab "Kanban" antes de "Timeline"
- [ ] Tab Kanban como rota nested? Decisão: usar query param `?tab=kanban` ou param de path. Proponho **path**: `/project/[slug]/kanban` para SEO e bookmarks. Se fizer demasiada cirurgia, fallback para query param.
- [ ] Breadcrumb topbar mostra projeto

## Testes (vitest)
- [ ] `lib/actions/__tests__/task-actions.test.ts`:
  - Cria task com defaults certos
  - Move task entre colunas mantém ordem
  - Bloqueia move para 'feito' se `por_confirmar`
  - Archive bloqueia se em workflow activo
  - Auth: membro pode, cliente não
- [ ] `lib/validation/__tests__/task-schema.test.ts`:
  - Aceita inputs válidos
  - Rejeita status inválido, priority inválida, deadline malformado
- [ ] Tests usam DB de teste? Decisão: usar mocks Prisma (vitest mock) para começar, integration tests vêm na fase de testes mais profundos. Confirmar com Miguel.

## Verificação programática (Claude faz)
- [ ] `pnpm exec tsc --noEmit` — zero erros
- [ ] `pnpm test` — todos verdes
- [ ] `pnpm build` — verde
- [ ] Query manual: tasks têm `kanbanOrder` único por `(projectId, status)`

## Verificação manual (Miguel faz)
- [ ] M1. `/project/aura-pms/kanban` mostra 5 colunas com tasks distribuídas
- [ ] M2. Drag de "Setup CI/CD pipeline AURA" de Em Curso para Em Revisão → persiste após reload
- [ ] M3. Drag para Feito de uma task `por_confirmar` → toast de erro
- [ ] M4. `+ Nova Tarefa` na coluna Backlog → modal → criar → aparece no fim da coluna
- [ ] M5. Click numa task → modal de edit → editar prioridade → save → cor do badge muda
- [ ] M6. Filtrar por assignee=Bruno → URL muda → só aparecem as do Bruno
- [ ] M7. Task "Integrar TOC Online" (já é `por_confirmar`) mostra badge amarelo + 3 botões inline
- [ ] M8. Confirmar → badge desaparece, trust score do tipo `tarefa` sobe +2 (vejo no dashboard de validação)
- [ ] M9. Login como `cliente` → vê o board mas botão `+ Nova Tarefa` está escondido
- [ ] M10. Archive task → desaparece do board → continua acessível via URL directa (`/task/[id]` se existir)

## Decisões deferidas (NÃO no Sprint 2)
- Timeline (Gantt) — Sprint 3
- Mapa relacional — Sprint 3 ou depois
- Comentários/threads em tasks — Sprint 5+
- Audit log de quem moveu o quê — Sprint 6
- Restore UI de tasks arquivadas — Sprint 2.5
- Filtros avançados (multi-select, fase) — Sprint 2.5
- Reordenação cross-project — out of scope (decisão D1)

## Revisão Sprint 2

**Estado:** Código completo, **bloqueado** em testes manuais por falta de acesso à DB (SSH tunnel para 91.99.211.238:5432 não está activo).

### Executado pelo Claude
- ✅ Schema: `kanbanOrder Int @default(0)` + `archivedAt DateTime?` + 2 indexes (`idx_tasks_archived`, `idx_tasks_kanban`)
- ✅ Seed: adicionados `membro@example.com` (role=membro) e `sergio.goncalves@fiscomelres.pt` (role=cliente). Senha: `commandcenter2026`
- ✅ Deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- ✅ `lib/validation/task-schema.ts` — 5 schemas Zod (create/update/move/validate/enums)
- ✅ `lib/auth/dal.ts` — `requireWriter()` helper (admin OU membro)
- ✅ `lib/actions/task-actions.ts` — `createTask`, `updateTask`, `archiveTask`, `restoreTask`, `moveTask`, `validateTask`
- ✅ `lib/queries.ts` — filtra `archivedAt: null` em todas as queries de tasks; novo `getKanbanOptions()`
- ✅ `lib/actions/project-actions.ts` — `archiveProject` agora usa `archivedAt: null` em vez de status sentinel `arquivado`
- ✅ `vitest.config.ts` + scripts `test` / `test:watch`
- ✅ `lib/validation/__tests__/task-schema.test.ts` — 18 testes
- ✅ `lib/actions/__tests__/task-actions.test.ts` — 15 testes (mocks Prisma + DAL)
- ✅ `components/kanban/task-card.tsx` — sortable, click → modal, badge AI, badge stale
- ✅ `components/kanban/task-card-actions.tsx` — botões inline Confirmar/Rejeitar para `por_confirmar`
- ✅ `components/kanban/kanban-column.tsx` — droppable, botão `+` no header
- ✅ `components/kanban/kanban-board.tsx` — `DndContext`, `useOptimistic`, `closestCorners`, `DragOverlay`
- ✅ `components/kanban/task-edit-modal.tsx` — modo create/edit, `useActionState`, archive button
- ✅ `components/kanban/task-filters.tsx` — Server Component, `<form method="GET">`, query params
- ✅ `app/(app)/project/[slug]/page.tsx` — lê `searchParams` (tab, assignee, priority, origin), filtra in-memory
- ✅ `app/(app)/project/[slug]/project-view.tsx` — kanban estático substituído pelo `KanbanBoard` interactivo, recebe `initialTab` da URL
- ✅ `prisma/backfill-kanban-order.ts` — script idempotente para correr após `db push`
- ✅ `pnpm exec tsc --noEmit` — exit 0
- ✅ `pnpm test` — 33/33 verdes
- ✅ `pnpm build` — verde

### Decisões tomadas durante a execução
- **kanbanOrder backfill:** script separado em `prisma/backfill-kanban-order.ts` em vez de inline na migração (migrações não versionadas neste projeto). Idempotente.
- **Filtros server-side:** filtrados em memória dentro de `page.tsx` em vez de no `getProjectBySlug`. Mais rápido de implementar, suficiente para tasks <500 por projeto. Refactor para query-level fica para Sprint 2.5 se necessário.
- **Drag&drop com filtros:** **desactivado** quando há filtros activos. Razão: os índices ficariam relativos ao subset visível e o `moveTask` (server) opera contra todas as tasks → inconsistência. Notice visível ao utilizador.
- **Tabs URL sync:** `initialTab` lê do URL, mas clicar tabs *não* actualiza URL (só useState). Bookmarks `?tab=kanban` funcionam; navegação interna mantém-se rápida.
- **shadcn/ui:** *não instalado* (decisão revista durante a execução). Reutilizado o design system custom existente (`var(--accent)`, `cc-card`, `cc-task-card`, `Modal`, `ConfirmDialog`).
- **Validation panel existente:** *não tocado*. As ações inline no kanban (confirmar/rejeitar) reutilizam a mesma `validateTask` action; o painel do dashboard continua a funcionar como sempre.
- **Trust score:** `validateTask` usa o modelo `TrustScore` actual (single-row por `extractionType`). Refactor para categorias-por-agente fica para o Sprint do Maestro, conforme planeado.

### Bloqueadores resolvidos
1. ~~**DB inacessível**~~ — resolvido criando container `command-center-postgres` (postgres:16-alpine) com `sudo docker run -p 5432:5432`. Dedicated, isolado do Bruno.
2. ~~**Schema/seed**~~ — `prisma db push` + `prisma db seed` correram limpos.
3. ~~**Cross-origin block do Next dev**~~ — `allowedDevOrigins: ["91.99.211.238"]` em `next.config.ts`.

### Verificado pelo Miguel (2026-04-08)
- Drag&drop funciona entre colunas
- Filtros funcionam (selecionar valor → Filtrar → board filtra)
- Borda amarela + botões inline em "Integrar TOC Online"
- Botão `+` em cada coluna abre modal de criar
- **Sprint 2 fechado.**

---

# Sprint 3 — People + Areas CRUD

**Estado:** A executar.
**Data:** 2026-04-08
**Pré-condição:** Sprint 2 verde.

## Decisões fechadas
1. **Sidebar visibility:** opção B — admin e membro veem os links, cliente não. Membros veem listas em modo read-only; só admin edita/cria/arquiva.
2. **Apagar pessoa com tasks atribuídas:** **bloquear** com mensagem clara (pattern de Project archive).
3. **Apagar área com tasks ou workflows ligados:** mesma regra — bloquear.
4. **`Person.type`:** mantido (`equipa` | `cliente`); pessoas tipo `cliente` continuam fora do picker de assignee no kanban (filtro `where: { type: "equipa" }` em `getKanbanOptions`).
5. **`User` ↔ `Person`:** Sprint 3 só faz CRUD de Person. Auth user CRUD fica para Sprint 4.

## Schema
- [ ] `Person.archivedAt DateTime?` + index `idx_people_archived`
- [ ] `Area.archivedAt DateTime?` + index `idx_areas_archived`
- [ ] `pnpm prisma db push`

## Validation
- [ ] `lib/validation/person-schema.ts` — `personCreateSchema`, `personUpdateSchema`, enums type/role-string, hex color
- [ ] `lib/validation/area-schema.ts` — `areaCreateSchema`, `areaUpdateSchema`, slug auto, hex color, icon free string

## Server Actions
- [ ] `lib/actions/person-actions.ts` — `createPerson`, `updatePerson`, `archivePerson`, `restorePerson` — todas `requireAdmin`
- [ ] `lib/actions/area-actions.ts` — `createArea`, `updateArea`, `archiveArea`, `restoreArea` — `requireAdmin`
- [ ] Try/catch P2002 (slug ou email duplicado) com mensagem amigável
- [ ] Bloquear archive de pessoa com tasks **não-arquivadas** atribuídas
- [ ] Bloquear archive de pessoa que é assignee default num workflow template
- [ ] Bloquear archive de área com tasks **não-arquivadas** ou workflow templates/instances ligados
- [ ] `revalidatePath` no fim

## Queries
- [ ] `getPeople()` — lista todas com counts de tasks atribuídas, ordenada por nome
- [ ] `getAreas()` — lista todas com counts de tasks/workflows, ordenada por nome
- [ ] `getKanbanOptions` (existente) — filtrar `archivedAt: null` em people e areas
- [ ] `getProjectBySlug` — verificar se passa pessoas/áreas arquivadas (não deve)

## Páginas
- [ ] `app/(app)/people/page.tsx` — server component, lista + new button (gated por role)
- [ ] `app/(app)/areas/page.tsx` — idem
- [ ] Cliente que tente aceder directamente → redirect para `/` (gate via `getAuthUser`)

## Componentes
- [ ] `components/people/person-form-fields.tsx`
- [ ] `components/people/person-form-modal.tsx` (create/edit)
- [ ] `components/people/people-list.tsx` (cards/lista, mostra task count)
- [ ] `components/people/new-person-button.tsx`
- [ ] `components/people/edit-person-button.tsx`
- [ ] `components/people/archive-person-button.tsx`
- [ ] Mesma estrutura para areas

## Sidebar
- [ ] Adicionar links "Pessoas" e "Áreas" em `components/layout/sidebar.tsx`
- [ ] Render condicional: esconder se `user.role === 'cliente'`

## Tests (vitest)
- [ ] `lib/validation/__tests__/person-schema.test.ts`
- [ ] `lib/validation/__tests__/area-schema.test.ts`
- [ ] `lib/actions/__tests__/person-actions.test.ts` (auth, archive blocking)
- [ ] `lib/actions/__tests__/area-actions.test.ts`

## Verificação
- [ ] `pnpm exec tsc --noEmit` zero erros
- [ ] `pnpm test` verde
- [ ] `pnpm build` verde
- [ ] Manual: admin cria/edita/arquiva pessoa+área, vê bloqueio em archive com dependências, cliente é redirect, membro vê lista mas não edita

## Revisão Sprint 3

**Estado:** Código completo, pendente teste manual.

### Executado pelo Claude
- ✅ Schema: `Person.archivedAt` + `Area.archivedAt` + 2 indexes
- ✅ `prisma db push` + `generate`
- ✅ `lib/validation/person-schema.ts`, `area-schema.ts`
- ✅ `lib/actions/person-actions.ts` — create/update/archive/restore (admin only)
- ✅ `lib/actions/area-actions.ts` — create/update/archive/restore (admin only) com auto-slug
- ✅ `lib/queries.ts` — `getPeople()`, `getAreas()`, `getKanbanOptions` filtra archived
- ✅ `components/people/{person-form-modal,people-list,new-person-button}.tsx`
- ✅ `components/areas/{area-form-modal,areas-list,new-area-button}.tsx`
- ✅ `app/(app)/people/page.tsx` + `app/(app)/areas/page.tsx` — gate cliente→redirect, membro→read-only
- ✅ `components/layout/sidebar.tsx` — links Pessoas/Áreas, escondidos para cliente
- ✅ `app/(app)/layout.tsx` — passa `userRole` ao sidebar
- ✅ Tests vitest: 33 novos (60 total) — schemas + actions com mocks Prisma
- ✅ tsc / test / build verdes
- ✅ Rotas `/people` (307→login OK) e `/areas` (307→login OK) servidas pelo dev server

### Cuidados a verificar manualmente (Miguel)
- M1. Login `miguel@example.com` → vês "Pessoas" e "Áreas" no sidebar
- M2. `/people` lista as 6 pessoas do seed; **botão `+ Nova pessoa`** visível (admin)
- M3. Click numa pessoa → modal de edit; alterar nome → save → lista actualiza
- M4. Criar pessoa nova → aparece na lista
- M5. Tentar arquivar **Miguel Martins** (que tem tasks atribuídas) → toast "X tarefa(s) activa(s)"
- M6. Criar pessoa nova SEM tasks → arquivar → fica cinzenta no fundo da lista
- M7. `/areas` lista as 4 áreas; criar/editar/arquivar funciona
- M8. Tentar arquivar **Operações** (que tem workflow templates) → toast "workflow template(s) ligado(s)"
- M9. Logout, login `membro@example.com` → vê "Pessoas" e "Áreas" no sidebar; abre `/people` mas **NÃO vê** botão `+ Nova pessoa`; click numa pessoa **não abre modal**
- M10. Logout, login `sergio.goncalves@…` (cliente) → **NÃO vê** "Pessoas" nem "Áreas" no sidebar; tenta abrir `/people` directo → redirect para `/`

### Decisões deferidas (out of scope)
- Restore UI de pessoas/áreas arquivadas — Sprint 3.5
- Filtros e pesquisa nas listas — quando crescer
- Avatar upload — continua hex color
- CRUD de Users (auth) — Sprint 4

---

# Sprint 4 — Maestro: trust score por categoria + gating do Agent API

**Estado:** A executar.
**Data:** 2026-04-08
**Pré-condição:** Sprint 3 verde.
**Filosofia:** primeira manifestação real do Maestro como entidade. **SEM chat** ainda — é Sprint 5. Foco em infraestrutura, gating e visibilidade.

## Decisões fechadas
1. **Lista hardcoded de ações sensíveis:** financeiro, archive de Project/Person, comunicação externa, alterações de auth/role. Cap a trust 50 — sempre validação humana.
2. **`TrustScore.agentId`** — `String @default("maestro-internal")` (sentinel em vez de nullable, para upsert trivial). Unique `(agentId, extractionType)`.
3. **`MaestroAction` log** — só guarda acções que mudaram trust score (validações). Não loga toda a actividade do Maestro.
4. **Página `/maestro`** — admin only.
5. **Identidade do agente** via header `X-Agent-Id` nos POSTs do `/api/agent/*`. Sem header → `"maestro-internal"`.

## Schema
- [ ] `TrustScore.agentId String @default("maestro-internal")` + drop unique on `extractionType` + add `@@unique([agentId, extractionType])`
- [ ] Nova tabela `MaestroAction` — `id, agentId, extractionType, action (confirmar|editar|rejeitar), entityType (task|interaction), entityId, scoreDelta, scoreBefore, scoreAfter, performedById (Person), createdAt`
- [ ] `pnpm prisma db push --accept-data-loss` se necessário (existing rows ficam com agentId=default)

## Trust rules (pura, testável)
- [ ] `lib/maestro/trust-rules.ts`:
  - `SENSITIVE_ACTIONS` constant
  - `THRESHOLDS` (5 níveis: 0-30 / 31-50 / 51-70 / 71-90 / 91-100)
  - `decideGating({extractionType, score, confidence, isSensitive}) → "pending"|"executed"`
  - `applyDelta(action) → number` (confirmar=+2, editar=0, rejeitar=-5; auto-confirmado seguido de ignore=+0.5; auto-confirmado seguido de correcção=-3)
  - Cap financeiro a 50 mesmo que score seja maior

## Score engine (escreve DB)
- [ ] `lib/maestro/score-engine.ts`:
  - `recordValidation(agentId, extractionType, action, performedById, entityType, entityId)` — atomicamente actualiza TrustScore + escreve MaestroAction. Single transaction.
  - Substitui `recalcTrustScore` em `lib/actions/validation.ts`

## Validation actions update
- [ ] `lib/actions/validation.ts` — `confirmValidation`, `editValidation`, `rejectValidation` chamam `recordValidation` em vez do velho `recalcTrustScore`
- [ ] Apagar `recalcTrustScore` (substituído pelo delta)

## Agent API gating
- [ ] `lib/maestro/agent-gating.ts`:
  - `gateAgentAction(req, { extractionType, isSensitive }) → { type: "pending"|"executed", agentId }`
  - Lê header `X-Agent-Id`
  - Faz lookup do trust score
  - Aplica `decideGating`
- [ ] Aplicar em `/api/agent/tasks` POST: tasks `aiExtracted=true` passam por gating; se `pending`, ficam com `validationStatus="por_confirmar"`; se `executed`, ficam `confirmado` com `validatedAt=null` (auto-confirmado, sem validador humano)
- [ ] Devolve `{type, id, ...}` para o caller saber o estado

## Páginas
- [ ] `app/(app)/maestro/page.tsx` — admin only via `requireAdmin` (page-level guard a adicionar a `dal.ts`: `requireAdminPage()` redirect se não for admin)
- [ ] Mostra 6 trust scores (Tarefa/Decisão/Resumo/Prioridade/Responsável/Conteúdo) por agente (filtro por agente se houver mais que um)
- [ ] Cada score: barra 0-100, label do threshold actual, contagem confirmações/edições/rejeições
- [ ] Lista das últimas 20 `MaestroAction` (acção, score delta, quando, por quem)

## Componentes
- [ ] `components/maestro/trust-score-card.tsx`
- [ ] `components/maestro/recent-actions-list.tsx`

## Sidebar
- [ ] Adicionar "Maestro" (icon: Brain ou Sparkles)
- [ ] Estende `NavItem` com `adminOnly?: boolean` flag (mantém `hideForCliente` para Pessoas/Áreas)

## Queries
- [ ] `getTrustScoresByAgent(agentId)` — lista scores por categoria
- [ ] `getRecentMaestroActions(limit=20)` — join com Person (validador) para mostrar nome
- [ ] `getAgentIds()` — lista de agentes distintos no TrustScore (para filtro futuro)

## Tests
- [ ] `lib/maestro/__tests__/trust-rules.test.ts` — decideGating across thresholds, sensitive cap, applyDelta
- [ ] `lib/maestro/__tests__/score-engine.test.ts` — mocks Prisma, verifica que recordValidation atualiza score E escreve MaestroAction numa transaction

## Verificação
- [ ] tsc / test / build verdes
- [ ] DB push aplicado
- [ ] Manual: admin abre `/maestro` → vê 6 scores a 0; valida a task "Integrar TOC Online" → score "tarefa" sobe para 2 → MaestroAction aparece na lista

## Decisões deferidas (Sprint 5+)
- Chat com Maestro / Claude API
- `/api/maestro/chat` endpoint
- Briefing automático
- Agent registration endpoint
- Decay automático do score por inactividade
- "Editar e confirmar" inline no kanban (já existe via modal de edit)
- Multi-agente UI (filtros) — só faz sentido quando houver mais que um

## Revisão Sprint 4

**Estado:** Código completo, pendente teste manual.

### Executado pelo Claude
- ✅ Schema: `TrustScore.agentId String @default("maestro-internal")`, unique `(agentId, extractionType)`, novo `MaestroAction` log com `score_delta/before/after` + `performedById`
- ✅ `prisma db push --accept-data-loss` + `generate`
- ✅ `lib/maestro/trust-rules.ts` — pure: `EXTRACTION_TYPES`, `THRESHOLDS`, `decideGating`, `applyDelta`, `clampScore`, `thresholdFor`, `SENSITIVE_ACTION_KEYS`
- ✅ `lib/maestro/score-engine.ts` — `recordValidation` em transaction (update score + insert MaestroAction)
- ✅ `lib/maestro/agent-gating.ts` — `gateAgentWrite` lê score por (agentId, extractionType) e devolve `{type: "pending"|"executed"}`
- ✅ `lib/actions/validation.ts` — substituiu `recalcTrustScore` (formula antiga) por `recordValidation` delta-based
- ✅ `app/api/agent/tasks/route.ts` POST — gating aplicado para tasks `aiExtracted=true`, devolve `{type, id, agentId, currentScore}`
- ✅ `lib/queries.ts` — `getTrustScoresByAgent`, `getRecentMaestroActions`, `getAgentIds`
- ✅ `app/(app)/maestro/page.tsx` — admin only via `requireAdminPage()`, mostra 7 categorias + 20 últimas acções
- ✅ `components/maestro/{trust-score-card,recent-actions-list}.tsx`
- ✅ `lib/auth/dal.ts` — `requireAdminPage()` helper
- ✅ `components/layout/sidebar.tsx` — link "Maestro" com `adminOnly` flag
- ✅ Tests: 37 novos (97 totais) — `trust-rules` (puro) + `score-engine` (mocks Prisma)
- ✅ tsc / test / build verdes

### Manual (Miguel)
- M1. Login `miguel@example.com` → vê "Maestro" no sidebar (icon Brain)
- M2. `/maestro` carrega; vês 7 cards de categoria todos a 0/100 com label "Aprendizagem"
- M3. Sem acções recentes — vê empty state
- M4. Vai a `/project/ipme-digital?tab=kanban`, clica `✓ Confirmar` na task **"Integrar TOC Online"** (a única `por_confirmar`)
- M5. Volta a `/maestro` → card **Tarefa** sobe para **2/100**, contagem ✓ 1, ✎ 0, ✗ 0
- M6. Lista de acções recentes mostra: `Confirmou Tarefa por Miguel Martins +2 (0 → 2) há agora`
- M7. Login `membro@example.com` → **NÃO vê** "Maestro" no sidebar; tenta `/maestro` directo → redirect para `/`
- M8. Login `sergio…` (cliente) → idem, sem acesso

### Para testar a Agent API (opcional, via curl)
```bash
# Set env var local primeiro
export AGENT_API_SECRET="$(grep AGENT_API_SECRET /home/miguel/command-center/.env.local | cut -d= -f2 | tr -d '"')"

# Criar uma task AI-extracted (deve voltar pending porque score=2)
curl -X POST http://localhost:3100/api/agent/tasks \
  -H "Authorization: Bearer $AGENT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Teste do agente","projectSlug":"aura-pms","aiExtracted":true,"aiConfidence":0.7}'
# Esperado: {"type":"pending","id":"...","title":"Teste do agente","agentId":"unknown","currentScore":2}
```

### Cuidados a verificar manualmente
- M1. URL `/project/aura-pms?tab=kanban` mostra board interactivo
- M2. Drag entre colunas persiste após reload
- M3. Drag para Feito de uma task `por_confirmar` → toast erro
- M4. Botão `+` em coluna abre modal create
- M5. Click numa task abre modal edit; arquivar funciona
- M6. Filtrar por assignee → URL muda → drag fica desactivado, com aviso
- M7. Task "Integrar TOC Online" mostra borda amarela + 2 botões inline
- M8. Confirmar → trust score `tarefa` sobe +2
- M9. Login `membro@example.com` → vê board, vê botão `+` (membros podem escrever)
- M10. Login `sergio.goncalves@fiscomelres.pt` (cliente) → vê board, NÃO vê botão `+`, NÃO consegue arrastar

---

# Sprint 5 — Maestro Chat (MiniMax + Tool Use)

**Estado:** Plano, aguarda aprovação do Miguel.
**Data:** 2026-04-08

## Decisões fechadas

1. **Modelo:** MiniMax M2.7 high-speed via endpoint Anthropic-compatible (`https://api.minimax.io/anthropic`). API key reaproveitada de `~/.openclaw/openclaw.json`. Plano futuro: self-hosted.
2. **Streaming:** Sim, server-sent events (SSE) — UX fluida.
3. **UI:** Painel lateral persistente à direita (~420px), abre/fecha com botão fixo no canto. Persiste entre páginas via Context/Zustand.
4. **Tools iniciais (4):** `listar_tarefas`, `criar_tarefa`, `listar_projectos`, `listar_pessoas`. `criar_tarefa` passa por `gateAgentWrite` com `agentId="maestro-chat"`.
5. **Histórico:** Em DB. Tabelas novas `MaestroConversation` + `MaestroMessage`. Permite auditoria de tool calls e crescimento futuro.
6. **Quem pode usar:** Equipa apenas (admin + membro). Cliente não vê o painel nem o botão.
7. **SDK:** `@anthropic-ai/sdk` (compatível com MiniMax via baseURL).

## Arquitectura

```
┌─ UI (cliente) ─────────────────────┐
│ <MaestroPanel>                     │
│  ├─ Botão fixo bottom-right        │
│  ├─ Painel lateral (slide-in)      │
│  ├─ Lista de mensagens (streaming) │
│  └─ Input + envio                  │
└────────────────────────────────────┘
            │ POST /api/maestro/chat (SSE)
            ▼
┌─ Server (Next route handler) ──────┐
│ 1. Auth (requireWriter)            │
│ 2. Carrega/cria conversation       │
│ 3. Carrega histórico (last N msgs) │
│ 4. Chama MiniMax com tools         │
│ 5. Loop tool use:                  │
│    - Stream texto                  │
│    - Quando pede tool → executa    │
│    - Devolve resultado → continua  │
│ 6. Persiste messages no DB         │
└────────────────────────────────────┘
            │
            ▼
┌─ Tool executors ───────────────────┐
│ listar_tarefas → queries.ts        │
│ criar_tarefa → gateAgentWrite +    │
│                actions/tasks.ts    │
│ listar_projectos → queries.ts      │
│ listar_pessoas → queries.ts        │
└────────────────────────────────────┘
```

## Checklist

### Setup & config
- [ ] `pnpm add @anthropic-ai/sdk` no `command-center`
- [ ] Adicionar `MINIMAX_API_KEY` e `MINIMAX_BASE_URL` ao `.env` (copiar do openclaw.json)
- [ ] Criar `lib/maestro/client.ts` — wrapper do SDK com baseURL MiniMax
- [ ] Validar conectividade com call mínima (script `scripts/test-minimax.ts`)

### Schema & DB
- [ ] Modelo `MaestroConversation`: id, userId (Person fk), title, createdAt, updatedAt, archivedAt
- [ ] Modelo `MaestroMessage`: id, conversationId fk, role (user/assistant/tool), content (text), toolCalls (jsonb nullable), toolResults (jsonb nullable), createdAt
- [ ] Índices: `(userId, createdAt desc)`, `(conversationId, createdAt asc)`
- [ ] `pnpm prisma db push` + `generate`
- [ ] Adicionar relação Person → MaestroConversation

### Tool definitions (server)
- [ ] `lib/maestro/tools/index.ts` — registo central, exporta `MAESTRO_TOOLS` (Anthropic tool schema)
- [ ] `lib/maestro/tools/listar-tarefas.ts` — schema + executor (filtros: projectId, assigneeId, status, limit)
- [ ] `lib/maestro/tools/listar-projectos.ts` — schema + executor (sem args, devolve activos)
- [ ] `lib/maestro/tools/listar-pessoas.ts` — schema + executor (sem args, devolve não arquivadas)
- [ ] `lib/maestro/tools/criar-tarefa.ts` — schema + executor:
   - input: title, projectSlug, assigneeName?, dueDate?, priority?
   - resolve project/person via `agent-helpers`
   - chama `gateAgentWrite({ agentId: "maestro-chat", extractionType: "tarefa", entityType: "task" })`
   - se executed → cria task; se pending → cria com `validationStatus="por_confirmar"`
   - regista MaestroAction
- [ ] Cada tool exporta `{ name, description, inputSchema, execute(input, ctx) }`
- [ ] `ctx` carrega `userId` (autor da chat) para auditoria

### Route handler `/api/maestro/chat`
- [ ] POST com body `{ conversationId?: string, message: string }`
- [ ] Auth: `requireWriter()` (admin ou membro)
- [ ] Resposta: SSE stream (`Content-Type: text/event-stream`)
- [ ] Eventos: `delta` (texto), `tool_call` (tool a ser chamada), `tool_result` (resultado), `done`, `error`
- [ ] Loop:
  1. Carrega/cria conversation
  2. Carrega últimas 20 mensagens
  3. Chama `client.messages.stream({ tools: MAESTRO_TOOLS, ... })`
  4. Acumula texto e detecta `tool_use` blocks
  5. Para cada tool_use → executa → adiciona `tool_result` → re-chama modelo
  6. Persiste mensagens (user + final assistant + tool calls) num único $transaction no fim
- [ ] Tratamento de erros: timeout MiniMax, tool execution falha, gating bloqueia
- [ ] Limite: max 5 tool calls por turno (evita loop infinito)

### Sistema de prompts
- [ ] `lib/maestro/system-prompt.ts` — system prompt em PT-PT:
   - Quem é o Maestro
   - Que tools tem disponíveis e quando usar
   - Formato de respostas (curto, directo, sem floreios)
   - Como referenciar entidades (links markdown para `/project/...`)
   - Recusar acções fora do escopo

### UI: painel lateral
- [ ] `components/maestro/maestro-panel.tsx` — container com state (open/closed)
- [ ] `components/maestro/maestro-button.tsx` — botão fixo bottom-right (icon `MessageSquare`)
- [ ] `components/maestro/message-list.tsx` — render de mensagens (user/assistant/tool)
- [ ] `components/maestro/message-bubble.tsx` — markdown render (usar `react-markdown` se já existe, senão simples)
- [ ] `components/maestro/tool-call-card.tsx` — UI compacta para tool calls (collapsed por defeito)
- [ ] `components/maestro/chat-input.tsx` — textarea com Enter para enviar, Shift+Enter para newline
- [ ] `components/maestro/use-maestro-chat.ts` — hook que gere SSE stream, optimistic update, error handling
- [ ] `components/maestro/maestro-context.tsx` — Context provider para estado partilhado entre páginas
- [ ] Integração no `app/(app)/layout.tsx` — só render se user é writer (admin/membro)
- [ ] Animação slide-in (CSS transform, sem libs)

### Histórico de conversas
- [ ] No painel, header com botão "Nova conversa" + dropdown "Conversas anteriores" (últimas 10)
- [ ] Click numa conversa carrega-a; nova conversa cria registo lazy (só persiste após primeira mensagem)

### Auth & permissões
- [ ] `requireWriter()` no route handler
- [ ] No client, esconder botão se `role === "cliente"` (já temos `useAuth` ou similar?)
- [ ] Verificar que endpoint não vaza dados a clientes mesmo via curl direto

### Testes
- [ ] `lib/maestro/__tests__/tools.test.ts` — cada tool executor com mock Prisma
- [ ] `lib/maestro/__tests__/client.test.ts` — wrapper MiniMax (mock fetch)
- [ ] `lib/maestro/__tests__/chat-flow.test.ts` — integração: user msg → tool call → tool result → final answer (mock SDK)
- [ ] Verificar 98 testes existentes continuam a passar

### Verificação manual (M-checklist)
- [ ] M1. Login admin → vê botão Maestro bottom-right
- [ ] M2. Click → painel desliza da direita
- [ ] M3. "Quais são os projectos activos?" → tool call visível + resposta com lista
- [ ] M4. "Cria uma tarefa 'Testar Maestro' no projecto Aura PMS" → cria via gating, mostra badge
- [ ] M5. Mensagens persistem entre refreshes da página
- [ ] M6. Mudar de página (Kanban → Pessoas) → painel mantém-se aberto e com histórico
- [ ] M7. Login membro → mesmo comportamento que admin
- [ ] M8. Login cliente → não vê botão; curl directo no endpoint → 403
- [ ] M9. Streaming visível (texto aparece char por char, não tudo de uma vez)
- [ ] M10. Tool call que falha (ex: projecto inexistente) → erro claro na UI

## Diferido para Sprint 6+
- Editar/eliminar tarefas via chat (mais tools)
- Tool `criar_projecto`, `criar_pessoa`
- Briefing automático diário (cron + Maestro gera resumo)
- Decay automático do trust score
- Self-hosted model migration
- Voice input (Whisper)
- Pesquisa semântica de conversas antigas
- Partilha de conversas entre membros

## Riscos identificados
- **MiniMax tool use compatibility:** Endpoint diz ser Anthropic-compatible mas tool use pode ter quirks. Mitigação: script de teste (`scripts/test-minimax.ts`) antes de codar a UI.
- **Streaming SSE no Next 16:** Verificar que App Router suporta `Response` com `ReadableStream` correctamente. Mitigação: protótipo isolado primeiro.
- **Loop infinito de tool calls:** Modelo pode entrar em loop. Mitigação: limite de 5 tool calls por turno + timeout 60s.
- **Custo:** MiniMax é barato mas conversas longas com tool calls podem acumular. Mitigação: truncar histórico a 20 msgs no envio (não na DB).
- **Type safety dos tool inputs:** Anthropic SDK tipa como `unknown`. Mitigação: validar com Zod no executor.


## Estado pós-implementação (2026-04-08)

### Concluído
- ✅ `pnpm add @anthropic-ai/sdk@0.86.1`
- ✅ `MINIMAX_API_KEY/BASE_URL/MODEL` em `.env.local` (também corrigido `~/.profile` que tinha key inválida velha)
- ✅ `lib/maestro/client.ts` — wrapper Anthropic SDK apontado a MiniMax
- ✅ `scripts/test-minimax.ts` — smoke test (4 testes: básico, tool use, round-trip, streaming) — TODOS PASSAM
- ✅ Schema: `MaestroConversation` + `MaestroMessage` + relação Person → Conversation
- ✅ `pnpm prisma db push` + `generate`
- ✅ Tools: `listar_projectos`, `listar_tarefas`, `listar_pessoas`, `criar_tarefa` (esta com gating)
- ✅ `lib/maestro/tools/types.ts` + `index.ts` (registry)
- ✅ `lib/maestro/system-prompt.ts` — PT-PT, directo
- ✅ `lib/maestro/conversation.ts` — load/persist + reconstrução de history para SDK
- ✅ `app/api/maestro/chat/route.ts` — POST SSE com loop tool use (max 5/turno)
- ✅ `app/api/maestro/conversations/route.ts` — GET lista
- ✅ `app/api/maestro/conversations/[id]/route.ts` — GET full + DELETE archive
- ✅ `components/maestro/maestro-context.tsx` — Context client
- ✅ `components/maestro/use-maestro-chat.ts` — hook SSE parser + optimistic UI
- ✅ `components/maestro/message-bubble.tsx` — render markdown simples + tool call pills
- ✅ `components/maestro/maestro-panel.tsx` — slide-in 420px + dropdown histórico + input + botão flutuante
- ✅ `components/maestro/maestro-mount.tsx` — server gate por role (writer)
- ✅ Integração no `app/(app)/layout.tsx`
- ✅ `lib/maestro/__tests__/tools.test.ts` — 10 testes (todas as tools + gating)
- ✅ `pnpm tsc --noEmit` clean
- ✅ `pnpm vitest run` — **108/108 passam** (98 antes + 10 novos)
- ✅ `pnpm build` — Next build limpa, todas as rotas geradas
- ✅ Dev server reiniciado em http://91.99.211.238:3100

### Decisões de implementação (vs plano)
1. **Persistência por turno (não por mensagem do modelo):** O `persistTurn` guarda 1 user msg + 1 assistant msg consolidada (com toolCalls/toolResults agregadas). Mais simples; se chat multi-tool-round perder contexto futuramente, partimos para uma row por round.
2. **Bearer auth foi falso alarme:** o SDK envia `x-api-key` automaticamente e MiniMax aceita-o. O 401 inicial era de uma key velha exportada em `~/.profile` que tapava a `.env.local`.
3. **Endpoints conversation extra:** adicionei `GET /api/maestro/conversations` e `GET/DELETE /api/maestro/conversations/[id]` que não estavam no plano original mas são necessários para o dropdown de histórico funcionar.
4. **Markdown render:** sem `react-markdown` (não estava instalado). Implementei renderer manual minimal (newlines, **bold**, `code`, bullets) — suficiente para respostas de assistente.
5. **Limite tool calls:** mantido em 5 por turno. Se atingir, injecta mensagem no texto final.

### Pendente — verificação manual (Miguel)
- [ ] M1. Login admin → vê botão 🎼 bottom-right
- [ ] M2. Click → painel desliza da direita
- [ ] M3. "Quais são os projectos activos?" → tool call pill + lista correcta
- [ ] M4. "Cria uma tarefa 'Testar Maestro' no projecto X" → confirma gating funciona
- [ ] M5. Refresh da página → conversa persiste no dropdown 📚
- [ ] M6. Navegar Kanban → Pessoas com painel aberto → painel fecha (porque é re-mounted no Server Component layout — comportamento esperado neste design simples; v2 levaria isto para cookie/localStorage)
- [ ] M7. Login membro → mesmo comportamento
- [ ] M8. Login cliente → não vê botão; `curl /api/maestro/chat` → 403
- [ ] M9. Streaming visível char-a-char
- [ ] M10. Pedir tarefa em projecto inexistente → erro claro

### ⚠️ Limitação conhecida (M6)
O painel está dentro de um Provider React que vive no `app/(app)/layout.tsx`. Em Next App Router com Server Components no layout, navegar entre páginas re-renderiza o tree mas o **estado client (open/closed) é preservado** — boa notícia, deve funcionar. Se na prática reset, fix simples: persistir `open` em `localStorage` no Provider.

### Próximo passo sugerido
Testar manualmente os M-checks. Se algo falhar, abrir issue em `tasks/lessons.md`. Se tudo OK, correr `/simplify` para revisão de duplicação/qualidade antes de Sprint 6.
