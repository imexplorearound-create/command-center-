import type { Role } from "@prisma/client";

export const isAdmin = (user: { role: Role } | null | undefined): boolean =>
  user?.role === "admin";

export const isManager = (user: { role: Role } | null | undefined): boolean =>
  user?.role === "admin" || user?.role === "manager";

export const isWriter = (user: { role: Role } | null | undefined): boolean =>
  user?.role === "admin" || user?.role === "manager" || user?.role === "membro";
