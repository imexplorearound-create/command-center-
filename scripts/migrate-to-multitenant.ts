/**
 * Migração para Multi-Tenant
 *
 * Este script:
 * 1. Cria o tenant "imexplorearound"
 * 2. Popula o ModuleCatalog com os módulos do sistema
 * 3. Activa todos os módulos para o primeiro tenant
 * 4. Backfill tenantId em todas as tabelas existentes
 *
 * Uso: pnpm tsx scripts/migrate-to-multitenant.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Tier: 1=core (sempre on), 2=on por defeito, 3=opcional off, 4=experimental off
const MODULE_CATALOG = [
  { key: "dashboard",      label: { "pt-PT": "Dashboard",    "en": "Dashboard" },    icon: "LayoutDashboard", route: "/",              sortOrder: 0,  isCore: true,  tier: 1 },
  { key: "projects",       label: { "pt-PT": "Projectos",    "en": "Projects" },     icon: "FolderKanban",    route: "/projects",      sortOrder: 1,  isCore: true,  tier: 1 },
  { key: "people",         label: { "pt-PT": "Pessoas",      "en": "People" },       icon: "Users",           route: "/people",        sortOrder: 2,  isCore: true,  tier: 1 },
  { key: "areas",          label: { "pt-PT": "Áreas",        "en": "Areas" },        icon: "Layers",          route: "/areas",         sortOrder: 3,  isCore: true,  tier: 1 },
  { key: "okr",            label: { "pt-PT": "Objectivos",   "en": "Objectives" },   icon: "Target",          route: "/objectives",    sortOrder: 4,  isCore: false, tier: 2 },
  { key: "crm",            label: { "pt-PT": "Pipeline",     "en": "Pipeline" },     icon: "Handshake",       route: "/crm",           sortOrder: 5,  isCore: false, tier: 2 },
  { key: "timetracking",   label: { "pt-PT": "Horas",        "en": "Timetracking" }, icon: "Clock",           route: "/timetracking",  sortOrder: 6,  isCore: false, tier: 3 },
  { key: "email-sync",     label: { "pt-PT": "Email",        "en": "Email" },        icon: "Mail",            route: "/email-sync",    sortOrder: 7,  isCore: false, tier: 3 },
  { key: "cross-projects", label: { "pt-PT": "Investimento", "en": "Investment" },   icon: "Map",             route: "/cross-projects", sortOrder: 8, isCore: false, tier: 3 },
  { key: "workflows",      label: { "pt-PT": "Workflows",    "en": "Workflows" },    icon: "Workflow",        route: "/workflows",     sortOrder: 9,  isCore: false, tier: 3 },
  { key: "content",        label: { "pt-PT": "Conteúdo",     "en": "Content" },      icon: "Video",           route: "/content",       sortOrder: 10, isCore: false, tier: 3 },
  { key: "github",         label: { "pt-PT": "GitHub",       "en": "GitHub" },       icon: "Github",          route: "/github",        sortOrder: 11, isCore: false, tier: 3 },
  { key: "feedback",       label: { "pt-PT": "Feedback",     "en": "Feedback" },     icon: "MessageSquare",   route: "/feedback",      sortOrder: 12, isCore: false, tier: 4 },
  { key: "maestro",        label: { "pt-PT": "Maestro",      "en": "Maestro" },      icon: "Brain",           route: "/maestro",       sortOrder: 13, isCore: false, tier: 4 },
] as const;

// All tables that need tenantId backfill (Prisma table names → SQL table names)
const TABLES_TO_BACKFILL = [
  "users",
  "user_project_access",
  "projects",
  "project_phases",
  "objectives",
  "key_results",
  "people",
  "tasks",
  "clients",
  "client_contacts",
  "interactions",
  "alerts",
  "content_items",
  "trust_scores",
  "maestro_actions",
  "maestro_conversations",
  "maestro_messages",
  "sync_log",
  "areas",
  "workflow_templates",
  "workflow_template_steps",
  "workflow_instances",
  "workflow_instance_tasks",
  "okr_snapshots",
  "github_repos",
  "github_events",
  "dev_metrics_daily",
  "feedback_sessions",
  "feedback_items",
];

async function main() {
  console.log("=== Migração Multi-Tenant ===\n");

  // 1. Create tenant
  console.log("1. Criando tenant 'imexplorearound'...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "imexplorearound" },
    update: {},
    create: {
      slug: "imexplorearound",
      name: "IM Explore Around",
      locale: "pt-PT",
      timezone: "Europe/Lisbon",
    },
  });
  console.log(`   Tenant criado: ${tenant.id}\n`);

  // 2. Seed module catalog
  console.log("2. Populando catálogo de módulos...");
  for (const mod of MODULE_CATALOG) {
    await prisma.moduleCatalog.upsert({
      where: { key: mod.key },
      update: { label: mod.label, icon: mod.icon, route: mod.route, sortOrder: mod.sortOrder, isCore: mod.isCore, tier: mod.tier },
      create: { key: mod.key, label: mod.label, icon: mod.icon, route: mod.route, sortOrder: mod.sortOrder, isCore: mod.isCore, tier: mod.tier },
    });
    console.log(`   ${mod.isCore ? "🔒" : "📦"} ${mod.key}`);
  }
  console.log();

  // 3. Activate all modules for the tenant
  console.log("3. Activando todos os módulos para o tenant...");
  for (const mod of MODULE_CATALOG) {
    await prisma.tenantModuleConfig.upsert({
      where: { tenantId_moduleKey: { tenantId: tenant.id, moduleKey: mod.key } },
      update: { isEnabled: true },
      create: { tenantId: tenant.id, moduleKey: mod.key, isEnabled: true },
    });
  }
  console.log(`   ${MODULE_CATALOG.length} módulos activados\n`);

  // 4. Backfill tenantId in all tables
  console.log("4. Backfill tenantId em todas as tabelas...");
  for (const table of TABLES_TO_BACKFILL) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET tenant_id = $1 WHERE tenant_id IS NULL`,
      tenant.id
    );
    const suffix = result > 0 ? `${result} registos actualizados` : "sem registos";
    console.log(`   ${table}: ${suffix}`);
  }
  console.log();

  // 5. Verify no nulls remain
  console.log("5. Verificando que não restam tenant_id NULL...");
  let hasNulls = false;
  for (const table of TABLES_TO_BACKFILL) {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) as count FROM "${table}" WHERE tenant_id IS NULL`
    );
    const count = Number(result[0].count);
    if (count > 0) {
      console.log(`   ❌ ${table}: ${count} registos sem tenant_id!`);
      hasNulls = true;
    }
  }
  if (!hasNulls) {
    console.log("   ✅ Todos os registos têm tenant_id\n");
  } else {
    console.log("   ⚠️  Existem registos sem tenant_id — corrigir antes de tornar a coluna obrigatória\n");
  }

  // 6. Handle the old unique constraint on trust_scores
  // The old constraint was (agentId, extractionType), now it's (tenantId, agentId, extractionType)
  // Prisma db push will handle this, but we log for awareness
  console.log("6. Nota: O Prisma db push irá actualizar os unique constraints.");
  console.log("   - users: email → (tenantId, email)");
  console.log("   - projects: slug → (tenantId, slug)");
  console.log("   - areas: slug → (tenantId, slug)");
  console.log("   - workflow_templates: slug → (tenantId, slug)");
  console.log("   - trust_scores: (agentId, extractionType) → (tenantId, agentId, extractionType)");
  console.log();

  console.log("=== Migração concluída ===");
  console.log("Próximos passos:");
  console.log("  1. Tornar tenantId obrigatório no schema (remover '?')");
  console.log("  2. Correr: pnpm prisma db push");
  console.log("  3. Correr: pnpm prisma generate");
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
