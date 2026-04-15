import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

const GLOBAL_MODELS = new Set(["Tenant", "ModuleCatalog"]);

const READ_OPS = new Set([
  "findMany", "findFirst", "findUnique",
  "findFirstOrThrow", "findUniqueOrThrow",
  "count", "aggregate", "groupBy",
  "deleteMany", "updateMany",
]);

const tenantPrismaCache = new Map<string, ReturnType<typeof createTenantPrisma>>();

/**
 * Guarda contra escritas cross-tenant.
 * Convenção do projecto: callers passam `tenantId: ""` em data e a extension substitui.
 * Se um caller passa `tenantId: "X"` diferente do tenant da instance → erro (write cross-tenant).
 */
function assertDataTenantIdSafe(data: unknown, tenantId: string, op: string) {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, unknown>;
  const t = d.tenantId;
  if (typeof t === "string" && t.length > 0 && t !== tenantId) {
    throw new Error(
      `[tenantPrisma] ${op}: tentativa de escrita cross-tenant (data.tenantId="${t}", instance tenantId="${tenantId}")`
    );
  }
}

function createTenantPrisma(tenantId: string) {
  if (!tenantId || typeof tenantId !== "string" || tenantId.length === 0) {
    throw new Error("[tenantPrisma] tenantId é obrigatório e não pode ser vazio");
  }
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (GLOBAL_MODELS.has(model!)) return query(args);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = args as any;

          if (READ_OPS.has(operation)) {
            a.where = { ...a.where, tenantId };
          }

          if (operation === "create") {
            assertDataTenantIdSafe(a.data, tenantId, "create");
            a.data = { ...a.data, tenantId };
          }
          if (operation === "createMany" || operation === "createManyAndReturn") {
            if (Array.isArray(a.data)) {
              for (const d of a.data) assertDataTenantIdSafe(d, tenantId, operation);
              a.data = a.data.map((d: Record<string, unknown>) => ({ ...d, tenantId }));
            } else {
              assertDataTenantIdSafe(a.data, tenantId, operation);
              a.data = { ...a.data, tenantId };
            }
          }

          if (operation === "upsert") {
            assertDataTenantIdSafe(a.create, tenantId, "upsert.create");
            assertDataTenantIdSafe(a.update, tenantId, "upsert.update");
            a.where = { ...a.where, tenantId };
            a.create = { ...a.create, tenantId };
          }

          if (operation === "update") {
            assertDataTenantIdSafe(a.data, tenantId, "update");
            a.where = { ...a.where, tenantId };
          }

          if (operation === "delete") {
            a.where = { ...a.where, tenantId };
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Returns a cached Prisma client with automatic tenant filtering.
 * Same tenantId always returns the same extended client instance.
 * Rejeita tenantId vazio (crash fast em vez de "tenant órfão" silencioso).
 */
export function tenantPrisma(tenantId: string) {
  if (!tenantId || tenantId.length === 0) {
    throw new Error("[tenantPrisma] tenantId é obrigatório");
  }
  let client = tenantPrismaCache.get(tenantId);
  if (!client) {
    client = createTenantPrisma(tenantId);
    tenantPrismaCache.set(tenantId, client);
  }
  return client;
}

export type TenantPrisma = ReturnType<typeof createTenantPrisma>;

export type Tx = Parameters<Parameters<typeof basePrisma.$transaction>[0]>[0];
