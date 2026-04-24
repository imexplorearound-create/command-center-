import type { AuthUser } from "./dal";
import { isWriter } from "./role-checks";

export type FeedbackItemScope = {
  tenantId: string;
  projectId: string;
};

/**
 * admin/manager/membro sem restrição de projecto; cliente apenas se o feedback
 * pertence a um projecto onde tem acesso via `UserProjectAccess`. Tenant é
 * sempre checado — defensive, protege contra callers que usem `basePrisma`
 * em vez do `getTenantDb` (que já filtra por tenant).
 */
export function canApproveFeedback(user: AuthUser, item: FeedbackItemScope): boolean {
  if (user.tenantId !== item.tenantId) return false;
  if (isWriter(user)) return true;
  if (user.role === "cliente") return user.projectIds.includes(item.projectId);
  return false;
}

/**
 * Mesma matriz que `canApproveFeedback` — a verificação é feita pelo tester
 * ou cliente que recebeu o trabalho, não pelo developer.
 */
export function canVerifyFeedback(user: AuthUser, item: FeedbackItemScope): boolean {
  return canApproveFeedback(user, item);
}

/**
 * Read-level: admin/manager/membro veem tudo do tenant; cliente só projectos
 * onde tem acesso via `UserProjectAccess`. Usado em páginas e queries que
 * listam/leem feedback mas não mutam.
 */
export function canReadProject(user: AuthUser, projectId: string): boolean {
  return user.role !== "cliente" || user.projectIds.includes(projectId);
}

/**
 * Prisma where-filter equivalente a `canReadProject`, para aplicar em
 * `findMany` que lista sessões/items por projecto. Devolve `{}` para roles
 * tenant-wide (zero filtragem adicional). Usar spread na where-clause.
 */
export function clienteProjectFilter(
  user: AuthUser,
): { projectId: { in: string[] } } | Record<string, never> {
  return user.role === "cliente" ? { projectId: { in: user.projectIds } } : {};
}
