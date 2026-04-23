# Command Center — Guia de Desenvolvimento

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## O que é

Cockpit de gestão da empresa. Aplicação web que dá visibilidade total sobre projectos, tarefas, OKRs, relação com clientes e pipelines — tudo num único sítio, em tempo real. Consolida informação dispersa (CSV, Drive, Discord, Gmail, GitHub, OpenClaw) numa interface visual única.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Lucide Icons
- **Backend:** Next.js API Routes + Server Actions + Server Components
- **Database:** PostgreSQL 16 + Prisma 7 (PG adapter, migrations versionadas em `prisma/migrations/`)
- **Auth:** JWT (jose) + bcryptjs + httpOnly cookies (7 dias)
- **AI:** Anthropic SDK (Maestro) + MiniMax API
- **Testes:** Vitest + Testing Library
- **Drag-drop:** @dnd-kit (kanban)
- **Toasts:** Sonner
- **Modais:** HTML `<dialog>` nativo

## Convenções de Código

### Server Components vs Client Components
- Server Components por defeito (async/await para data fetching)
- `"use client"` só quando há interactividade (modais, forms, drag-drop)

### Server Actions
- Padrão: `export async function actionName(prev: ActionResult | undefined, formData: FormData): Promise<ActionResult<T>>`
- Sempre validar com Zod antes de operações DB
- Sempre verificar auth: `requireAdmin()` ou `requireWriter()` (de `lib/auth/dal.ts`)
- Sempre chamar `revalidatePath()` após mutations
- Tratar `PrismaClientKnownRequestError` P2002 (slug duplicado) com mensagem amigável
- Retornar `{ success: true, data }` ou `{ error: "mensagem" }`
- Forms usam `useActionState()` hook

### Validação
- Zod schemas em `lib/validation/`
- Enums: TaskStatus, Priority, ValidationStatus (por_confirmar/auto_confirmado/confirmed/edited/rejected)
- Helper `firstZodError()` para mensagens user-friendly

### Base de Dados
- Soft deletes: `archivedAt` em vez de DELETE
- Workflow migrations: desenvolvimento usa `pnpm prisma migrate dev --name <nome>`; produção usa `pnpm prisma migrate deploy`. Baseline inicial em `prisma/migrations/0_init/`.
- `pnpm prisma db seed` para dados iniciais
- DB: `command_center` | User: `cc` | Password: `cc_command_2026`

## Estrutura de Ficheiros

```
app/
├── (app)/              ← Rotas protegidas (auth gate)
│   ├── page.tsx        ← Dashboard principal
│   ├── maestro/        ← Chat AI assistant
│   ├── objectives/     ← OKRs (3 vistas: lista, roadmap, mapa)
│   ├── workflows/      ← Templates + instâncias
│   ├── content/        ← Pipeline de conteúdo
│   ├── areas/          ← Áreas operacionais
│   ├── people/         ← Equipa + contactos
│   ├── project/[slug]/ ← Detalhe projecto (kanban, timeline, dev, client hub)
│   └── api/            ← API routes protegidas
├── (auth)/             ← Login
└── api/                ← API routes públicas
    ├── maestro/        ← Conversas AI
    ├── webhooks/       ← GitHub, Discord
    ├── sync/           ← GitHub, Gmail, Calendar polling
    └── agent/          ← API para agentes OpenClaw (Bearer token)

components/
├── dashboard/          ← Widgets do dashboard
├── kanban/             ← Kanban board (dnd-kit)
├── maestro/            ← Chat AI UI
├── projects/           ← CRUD projectos
├── phases/             ← CRUD fases
├── areas/              ← CRUD áreas
├── people/             ← CRUD pessoas
├── layout/             ← Sidebar + topbar
└── shared/             ← Modal, confirm-dialog, form-field

lib/
├── db.ts               ← Prisma singleton
├── types.ts            ← TypeScript interfaces
├── queries.ts          ← Database queries
├── utils.ts            ← Helpers gerais
├── auth/               ← JWT sessions, login, role guards (requireAdmin, requireWriter, requireReader)
├── actions/            ← Server actions (project, phase, task, area, person, validation)
├── validation/         ← Zod schemas (task, project, area)
├── maestro/            ← AI agent: system prompt, tools, trust, score engine
└── integrations/       ← GitHub, Discord clients

prisma/
├── schema.prisma       ← 20+ modelos (ver abaixo)
└── seed.ts             ← Dados iniciais
```

## Trust Score System

3 níveis de validação para dados extraídos por AI:
1. **por_confirmar** — AI extraiu, humano precisa validar (badge "Por validar")
2. **auto_confirmado** — Confiança >80%, entra no kanban com badge "🤖"
3. **confirmed** — Humano validou (trust score sobe)

Acções sensíveis (financeiro, delete, comunicação externa) gated em `lib/maestro/trust-rules.ts`.

## Multi-Tenancy

Arquitectura multi-tenant com isolamento por `tenantId` em todas as tabelas.

- **`basePrisma`** — Prisma client sem filtro, usar APENAS em: login, tenant resolution, migration scripts
- **`tenantPrisma(tenantId)`** — Prisma client com filtro automático. Injeta `tenantId` em todas as queries (where, create, upsert)
- **`getTenantDb()`** — Helper que resolve o tenant da sessão e devolve `tenantPrisma`. Usar em Server Components, Server Actions, e API routes com sessão
- **`basePrisma` NUNCA em queries de dados de negócio** — usar sempre `getTenantDb()` ou `tenantPrisma(tenantId)`
- **Tenant resolution:** middleware.ts resolve subdomínio → header `x-tenant-slug`. Login resolve tenant pelo slug + email
- **Agent API:** header `X-Tenant-Id`, fallback para tenant "imexplorearound"
- **Módulos:** `ModuleCatalog` + `TenantModuleConfig` controlam sidebar e funcionalidades activas por tenant

## i18n

- **Ficheiros:** `lib/i18n/locales/pt-PT.json` e `en.json`
- **Server Components:** `createTranslator(locale)` → `t("chave")`
- **Client Components:** `useT()` hook (requer `<I18nProvider>` no layout)
- **Locale do tenant:** `getTenantLocale()` resolve da sessão/DB

## Auth & Roles

- **admin:** Acesso total (Miguel, Bruno)
- **manager:** Gere departamentos e projectos atribuídos
- **membro:** Projectos atribuídos via UserProjectAccess
- **cliente:** Apenas Client Hub do seu projecto

## Feedback System (plugin Chrome)

Pasta `extension/` é uma Chrome extension MV3 para clientes/testers gravarem notas de voz + eventos DOM enquanto testam projectos. Auth via JWT 30d (`POST /api/feedback/auth/login` com email+password de um User com role=cliente). Workspaces dinâmicos: cliente adiciona o URL no popup → `chrome.permissions.request` + `chrome.scripting.registerContentScripts`. Backend aceita tanto JWT do tester como o `AGENT_API_SECRET` legacy (`lib/feedback-auth.ts:authenticateFeedbackOrAgent`). Criar testers: `pnpm tsx scripts/create-tester.ts <email> <name>`. Ver `docs/feedback-tester-setup.md` e `extension/README.md`.

## Docs de Referência

- **Spec completa:** `docs/command-center-spec-v1.2.md`
- **GitHub integration:** `docs/addendum-github-v1.0.md`
- **Manual utilizador:** `docs/manual-command-center.md`
- **Setup DB:** `docs/setup-database-bruno.md`
- **Feedback tester setup:** `docs/feedback-tester-setup.md`
- **Sprint tracker:** `tasks/todo.md`

## Comandos

```bash
pnpm dev                    # Dev server (port 3100)
pnpm build                  # Production build
pnpm test                   # Vitest
pnpm prisma migrate dev     # Cria + aplica migration (dev)
pnpm prisma migrate deploy  # Aplica migrations pendentes (prod/CI)
pnpm prisma migrate status  # Estado das migrations
pnpm prisma db seed         # Seed data
pnpm prisma generate        # Regenerar tipos
pnpm exec tsc --noEmit      # Type check
```
