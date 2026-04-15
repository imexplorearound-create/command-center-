import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { tenantPrisma, basePrisma, type TenantPrisma } from "@/lib/db";

export const DEFAULT_TENANT_SLUG = "imexplorearound";

/**
 * Devolve um Prisma client com filtro automático de tenant,
 * baseado na sessão do utilizador actual.
 */
export const getTenantDb = cache(async (): Promise<TenantPrisma> => {
  const session = await getSession();
  if (!session?.tenantId) throw new Error("No tenant in session");
  return tenantPrisma(session.tenantId);
});

/**
 * Devolve o tenantId da sessão actual.
 */
export const getTenantId = cache(async (): Promise<string> => {
  const session = await getSession();
  if (!session?.tenantId) throw new Error("No tenant in session");
  return session.tenantId;
});

/**
 * Resolve o tenant a partir do slug (usado no login, antes de haver sessão).
 */
export async function resolveTenantBySlug(slug: string) {
  return basePrisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, locale: true, isActive: true },
  });
}

/**
 * Devolve o locale do tenant actual (do JWT, sem query DB).
 */
export const getTenantLocale = cache(async (): Promise<string> => {
  const session = await getSession();
  return session?.locale ?? "pt-PT";
});

/**
 * Resolve um tenant-scoped Prisma client a partir de um tenantId header.
 * Fallback para o tenant default. Usado em API routes de agentes/sync.
 */
export async function resolveHeaderTenant(tenantIdHeader: string | null): Promise<TenantPrisma> {
  if (tenantIdHeader) return tenantPrisma(tenantIdHeader);
  const tenant = await resolveTenantBySlug(DEFAULT_TENANT_SLUG);
  if (!tenant) throw new Error("Default tenant not found");
  return tenantPrisma(tenant.id);
}
