import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { tenantPrisma } from "@/lib/db";
import { getSession } from "./session";
import type { Role } from "@prisma/client";

import { isAdmin, isManager, isWriter } from "./role-checks";
export { isAdmin, isManager, isWriter };

export interface AuthUser {
  userId: string;
  personId: string;
  email: string;
  role: Role;
  tenantId: string;
  name: string;
  projectIds: string[];
}

/**
 * Garante que o caller é admin. Devolve `AuthUser` ou um erro estruturado
 * pronto a ser retornado de uma Server Action.
 */
export async function requireAdmin(): Promise<
  { ok: true; user: AuthUser } | { ok: false; error: string }
> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Sem permissão" };
  }
  return { ok: true, user };
}

/**
 * Garante que o caller é manager ou admin.
 */
export async function requireManager(): Promise<
  { ok: true; user: AuthUser } | { ok: false; error: string }
> {
  const user = await getAuthUser();
  if (!user || !isManager(user)) {
    return { ok: false, error: "Sem permissão" };
  }
  return { ok: true, user };
}

/**
 * Garante que o caller pode escrever (admin, manager OU membro).
 * Usado em CRUD operacional (tasks, comentários, etc.) onde
 * limitar a admin é demasiado restritivo.
 */
export async function requireWriter(): Promise<
  { ok: true; user: AuthUser } | { ok: false; error: string }
> {
  const user = await getAuthUser();
  if (!user || !isWriter(user)) {
    return { ok: false, error: "Sem permissão" };
  }
  return { ok: true, user };
}

/**
 * Page-level guard: redirects para `/` se não houver user ou se for cliente.
 * Para usar no top de Server Components que são admin/membro-only.
 */
export async function requireNonClient(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user || user.role === "cliente") redirect("/");
  return user;
}

/** Page-level guard: redirects para `/` se não for admin. */
export async function requireAdminPage(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") redirect("/");
  return user;
}

export const getAuthUser = cache(async function getAuthUserUncached(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  // For admin, JWT has everything we need — skip DB query
  if (session.role === "admin") {
    return {
      userId: session.userId,
      personId: session.personId,
      email: session.email,
      role: session.role,
      tenantId: session.tenantId,
      name: session.email,
      projectIds: [],
    };
  }

  // For manager/membro/cliente, fetch project assignments from DB
  const db = tenantPrisma(session.tenantId);
  const user = await db.user.findFirst({
    where: { id: session.userId },
    include: {
      person: { select: { name: true } },
      projectAssignments: { select: { projectId: true } },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    personId: user.personId,
    email: user.email,
    role: user.role,
    tenantId: session.tenantId,
    name: user.person.name,
    projectIds: user.projectAssignments.map((a) => a.projectId),
  };
});
