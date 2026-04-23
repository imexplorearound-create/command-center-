"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { basePrisma } from "@/lib/db";
import { resolveTenantBySlug, DEFAULT_TENANT_SLUG } from "@/lib/tenant";
import { createSession, deleteSession } from "./session";

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email e password são obrigatórios." };
  }

  // Resolve tenant from subdomain header (set by middleware)
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug") ?? DEFAULT_TENANT_SLUG;
  const tenant = await resolveTenantBySlug(tenantSlug);

  if (!tenant || !tenant.isActive) {
    return { error: "Organização não encontrada." };
  }

  // Find user in this tenant (email is unique per tenant, not globally)
  const user = await basePrisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), tenantId: tenant.id },
    include: { person: { select: { id: true, name: true } } },
  });

  if (!user || !user.isActive) {
    return { error: "Credenciais inválidas." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Credenciais inválidas." };
  }

  await createSession({
    userId: user.id,
    personId: user.personId,
    email: user.email,
    role: user.role,
    tenantId: tenant.id,
    locale: tenant.locale,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
