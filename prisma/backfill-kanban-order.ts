// One-shot para correr após `pnpm prisma db push` no Sprint 2.
// Uso: `pnpm tsx prisma/backfill-kanban-order.ts`
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("Backfilling kanbanOrder...");

  const tasks = await prisma.task.findMany({
    where: { archivedAt: null },
    select: { id: true, projectId: true, status: true, kanbanOrder: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = `${t.projectId ?? "null"}::${t.status}`;
    const arr = buckets.get(key) ?? [];
    arr.push(t);
    buckets.set(key, arr);
  }

  let updated = 0;
  let skipped = 0;
  for (const [key, items] of buckets) {
    const updates: Promise<unknown>[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kanbanOrder === i) {
        skipped++;
        continue;
      }
      updates.push(
        prisma.task.update({ where: { id: items[i].id }, data: { kanbanOrder: i } })
      );
      updated++;
    }
    if (updates.length > 0) await Promise.all(updates);
    console.log(`  ${key}: ${items.length} tasks (${updates.length} updated)`);
  }

  console.log(`Done. ${updated} updated, ${skipped} already correct, ${buckets.size} columns.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
