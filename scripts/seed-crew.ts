/**
 * Seed CrewRole + Executor for an existing tenant.
 *
 * Idempotent — safe to re-run. Does NOT touch any other tables.
 * Runs after `prisma/migrations/.../crew_role_and_executor` is applied.
 *
 * Usage: `pnpm tsx scripts/seed-crew.ts [tenant-slug]`
 *   default tenant slug: imexplorearound
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const tenantSlug = process.argv[2] ?? "imexplorearound";

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    console.error(`Tenant "${tenantSlug}" not found. Aborting.`);
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log(`Seeding crew for tenant ${tenantSlug} (${tenantId})`);

  // Find Miguel + Bruno as Person records for human executors.
  const [miguel, bruno] = await Promise.all([
    prisma.person.findFirst({
      where: { tenantId, email: "miguel@example.com" },
      select: { id: true, name: true },
    }),
    prisma.person.findFirst({
      where: { tenantId, email: "brunojtfontes@gmail.com" },
      select: { id: true, name: true },
    }),
  ]);
  if (!miguel || !bruno) {
    console.error(
      "Could not find Miguel/Bruno person records. Seed the rest of the database first."
    );
    process.exit(1);
  }

  const crewRoles = [
    { slug: "pipeline", name: "Pipeline", description: "Leads, opportunities, outbound", color: "#D4A843", glyphKey: "pipeline", order: 1 },
    { slug: "comms",    name: "Comms",    description: "Conversas pós-venda e updates",  color: "#7C5CBF", glyphKey: "comms",    order: 2 },
    { slug: "ops",      name: "Ops",      description: "Código, PRs, CI/CD",              color: "#3B7DD8", glyphKey: "ops",      order: 3 },
    { slug: "qa",       name: "QA",       description: "Triagem de feedback + validação", color: "#2D8A5E", glyphKey: "qa",       order: 4 },
  ];

  const createdRoles = await Promise.all(
    crewRoles.map((r) =>
      prisma.crewRole.upsert({
        where: { tenantId_slug: { tenantId, slug: r.slug } },
        update: { name: r.name, description: r.description, color: r.color, glyphKey: r.glyphKey, order: r.order },
        create: { tenantId, ...r },
      })
    )
  );
  console.log("  CrewRoles:", createdRoles.map((r) => r.slug).join(", "));

  const bySlug = Object.fromEntries(createdRoles.map((r) => [r.slug, r]));

  const executors = [
    { crewRoleId: bySlug.pipeline!.id, kind: "clawbot",     name: "Clawbot",                   note: "via Clawbot · crm-skill",      isPrimary: true,  personId: null as string | null, apiClientId: "clawbot-pipeline" as string | null },
    { crewRoleId: bySlug.pipeline!.id, kind: "humano",      name: miguel.name,                 note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
    { crewRoleId: bySlug.comms!.id,    kind: "claude-code", name: "Claude Code · comms-skill", note: "resposta a emails de cliente", isPrimary: true,  personId: null, apiClientId: "claude-comms" },
    { crewRoleId: bySlug.comms!.id,    kind: "humano",      name: miguel.name,                 note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
    { crewRoleId: bySlug.ops!.id,      kind: "claude-code", name: "Claude Code · build-skill", note: "código, PRs, deploys",         isPrimary: true,  personId: null, apiClientId: "claude-ops" },
    { crewRoleId: bySlug.ops!.id,      kind: "humano",      name: bruno.name,                  note: "via handoff",                  isPrimary: false, personId: bruno.id, apiClientId: null },
    { crewRoleId: bySlug.qa!.id,       kind: "claude-code", name: "Claude Code · triage",      note: "triage-feedback",              isPrimary: true,  personId: null, apiClientId: "claude-qa" },
    { crewRoleId: bySlug.qa!.id,       kind: "humano",      name: miguel.name,                 note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
  ];

  for (const e of executors) {
    if (e.apiClientId) {
      await prisma.executor.upsert({
        where: { tenantId_apiClientId: { tenantId, apiClientId: e.apiClientId } },
        update: {
          crewRoleId: e.crewRoleId,
          kind: e.kind,
          name: e.name,
          note: e.note,
          isPrimary: e.isPrimary,
          personId: e.personId,
        },
        create: {
          tenantId,
          crewRoleId: e.crewRoleId,
          kind: e.kind,
          name: e.name,
          note: e.note,
          isPrimary: e.isPrimary,
          personId: e.personId,
          apiClientId: e.apiClientId,
        },
      });
    } else {
      const existing = await prisma.executor.findFirst({
        where: { tenantId, crewRoleId: e.crewRoleId, personId: e.personId, apiClientId: null },
      });
      if (!existing) {
        await prisma.executor.create({
          data: {
            tenantId,
            crewRoleId: e.crewRoleId,
            kind: e.kind,
            name: e.name,
            note: e.note,
            isPrimary: e.isPrimary,
            personId: e.personId,
            apiClientId: null,
          },
        });
      }
    }
  }
  console.log(`  Executors: ${executors.length} processed`);
  console.log("Crew seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
