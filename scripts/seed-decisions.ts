/**
 * Seed `Decision` com 5-8 entradas realistas para o tenant `imexplorearound`.
 *
 * Idempotente — usa `title+tenantId` como chave natural.
 *
 * Usage: `DATABASE_URL=... pnpm tsx scripts/seed-decisions.ts [tenant-slug]`
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED_IN_PROD) {
    console.error(
      "[seed-decisions] Refuso correr em produção. Define ALLOW_SEED_IN_PROD=1 se for mesmo essa a intenção.",
    );
    process.exit(1);
  }

  const tenantSlug = process.argv[2] ?? "imexplorearound";
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    console.error(`Tenant "${tenantSlug}" not found.`);
    process.exit(1);
  }
  const tenantId = tenant.id;

  const roles = await prisma.crewRole.findMany({
    where: { tenantId },
    select: { id: true, slug: true },
  });
  const roleId = (slug: string) =>
    roles.find((r) => r.slug === slug)?.id ?? null;

  const anyProject = await prisma.project.findFirst({
    where: { tenantId, archivedAt: null },
    select: { id: true, name: true },
  });
  const anyOpp = await prisma.opportunity.findFirst({
    where: { tenantId, archivedAt: null },
    select: { id: true, title: true },
  });

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const seeds = [
    {
      title: "Responder ao cliente Andamar sobre scope da v2",
      context:
        "Recebeu email há 2 dias a pedir mudança de âmbito; aguarda direcção.",
      kind: "client_reply",
      severity: "warn",
      crewRoleId: roleId("comms"),
      dueAt: new Date(now + 1 * DAY),
    },
    {
      title: "Bruno bloqueado no PR #142 (build-skill)",
      context: "PR em revisão há 4 dias — aguarda merge ou feedback concreto.",
      kind: "bruno_block",
      severity: "block",
      crewRoleId: roleId("ops"),
      dueAt: new Date(now + 6 * 60 * 60 * 1000),
    },
    {
      title: "Decidir preço da oferta Grupo Pestana",
      context:
        "Pedido de proposta aberto há >7 dias sem resposta pipeline — perdemos timing.",
      kind: "pipeline_stall",
      severity: "warn",
      crewRoleId: roleId("pipeline"),
      dueAt: null,
      opportunityId: anyOpp?.id ?? null,
    },
    {
      title: "Triage de 3 feedbacks do tester Ana",
      context: "Sessões de 21 Abr com bugs classificados como `defeito`.",
      kind: "feedback_triage",
      severity: "pend",
      crewRoleId: roleId("qa"),
      dueAt: null,
    },
    {
      title: "Budget projecto Portiqa em 94%",
      context: "Executado/alocado > 90% — avaliar novo ciclo ou travar scope.",
      kind: "budget",
      severity: "warn",
      crewRoleId: roleId("ops"),
      dueAt: new Date(now + 2 * DAY),
      projectId: anyProject?.id ?? null,
    },
    {
      title: "Preparar demo para novo lead SAP",
      context: "Reunião agendada para 2ª feira — confirmar deck + data room.",
      kind: "other",
      severity: "pend",
      crewRoleId: roleId("pipeline"),
      dueAt: new Date(now + 3 * DAY),
      snoozedUntil: new Date(now + 18 * 60 * 60 * 1000),
    },
    {
      title: "Dúvida: aceitamos pagamento parcial do projecto X?",
      context: "Cliente pediu 50% agora + 50% em 60 dias — decisão financeira.",
      kind: "other",
      severity: "pend",
      crewRoleId: null,
      dueAt: null,
      resolvedAt: new Date(now - 8 * 60 * 60 * 1000),
      resolutionNote: "Aprovado em call — 50/50 com juros zero.",
    },
  ] as const;

  let created = 0;
  let skipped = 0;
  for (const s of seeds) {
    const existing = await prisma.decision.findFirst({
      where: { tenantId, title: s.title },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.decision.create({
      data: {
        tenantId,
        title: s.title,
        context: s.context,
        kind: s.kind,
        severity: s.severity,
        crewRoleId: s.crewRoleId,
        dueAt: "dueAt" in s ? s.dueAt : null,
        snoozedUntil: "snoozedUntil" in s ? s.snoozedUntil : null,
        resolvedAt: "resolvedAt" in s ? s.resolvedAt : null,
        resolutionNote: "resolutionNote" in s ? s.resolutionNote : null,
        projectId: "projectId" in s ? s.projectId : null,
        opportunityId: "opportunityId" in s ? s.opportunityId : null,
      },
    });
    created += 1;
  }

  console.log(
    `Decisions seed · tenant ${tenantSlug}: ${created} criadas, ${skipped} já existiam.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
