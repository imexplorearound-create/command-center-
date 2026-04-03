import "server-only";
import { prisma } from "@/lib/db";
import { getSession } from "./session";
import type { Role } from "@prisma/client";

export interface AuthUser {
  userId: string;
  personId: string;
  email: string;
  role: Role;
  name: string;
  projectIds: string[];
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  // For admin, JWT has everything we need — skip DB query
  if (session.role === "admin") {
    return {
      userId: session.userId,
      personId: session.personId,
      email: session.email,
      role: session.role,
      name: session.email,
      projectIds: [],
    };
  }

  // For membro/cliente, fetch project assignments from DB
  const user = await prisma.user.findUnique({
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
    name: user.person.name,
    projectIds: user.projectAssignments.map((a) => a.projectId),
  };
}
