/**
 * Cria um tester (User com role=cliente) para login no plugin Chrome.
 *
 * Run:
 *   pnpm tsx scripts/create-tester.ts <email> <name> --password=<pwd> [--project=<slug>]
 *
 * Exemplo:
 *   pnpm tsx scripts/create-tester.ts cliente@empresa.pt "João Silva" --password=teste123 --project=aura-pms
 *
 * Para evitar a password no histórico da shell, usa `HISTIGNORE='*password*'`
 * ou prefixa o comando com um espaço.
 */

import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface Args {
  email: string;
  name: string;
  password: string;
  projectSlug?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const positional: string[] = [];
  let password: string | undefined;
  let projectSlug: string | undefined;

  for (const a of argv) {
    if (a.startsWith("--password=")) password = a.slice("--password=".length);
    else if (a.startsWith("--project=")) projectSlug = a.slice("--project=".length);
    else positional.push(a);
  }

  if (positional.length < 2 || !password) {
    console.error(
      "Uso: pnpm tsx scripts/create-tester.ts <email> <name> --password=<pwd> [--project=<slug>]"
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Password tem de ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  return {
    email: positional[0]!.toLowerCase().trim(),
    name: positional[1]!.trim(),
    password,
    projectSlug,
  };
}

async function main() {
  const args = parseArgs();

  // Resolve tenant (use first active tenant)
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!tenant) {
    console.error("❌ Nenhum tenant activo encontrado. Corre o seed primeiro.");
    process.exit(1);
  }
  const tenantId = tenant.id;

  const [project, passwordHash] = await Promise.all([
    args.projectSlug
      ? prisma.project.findFirst({
          where: { slug: args.projectSlug, tenantId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    bcrypt.hash(args.password, 10),
  ]);

  if (args.projectSlug && !project) {
    console.error(`❌ Projecto "${args.projectSlug}" não encontrado.`);
    process.exit(1);
  }
  if (project) {
    console.log(`📁 Projecto atribuído: ${project.name} (${args.projectSlug})`);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          tenantId,
          name: args.name,
          email: args.email,
          type: "cliente",
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId,
          email: args.email,
          passwordHash,
          role: Role.cliente,
          isActive: true,
          personId: person.id,
        },
      });

      if (project) {
        await tx.userProjectAccess.create({
          data: { tenantId, userId: user.id, projectId: project.id },
        });
      }

      return { user, person };
    });

    console.log("✅ Tester criado:");
    console.log(`   Email:   ${result.user.email}`);
    console.log(`   Nome:    ${result.person.name}`);
    console.log(`   User ID: ${result.user.id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      console.error(`❌ Já existe um user com email ${args.email}.`);
      process.exit(1);
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("❌ Erro:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
