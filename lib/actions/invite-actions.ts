"use server";

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { basePrisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { getSecretKey } from "@/lib/auth/secret";
import { getSmtpTransporter, SMTP_FROM } from "@/lib/notifications/smtp";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./types";
import { field } from "./form-helpers";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

// ─── Invite User ───────────────────────────────────────────

export async function inviteUser(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const name = field(formData, "name") ?? "";
  const email = field(formData, "email") ?? "";
  const role = field(formData, "role") ?? "membro";

  if (!name || !email) return { error: "Nome e email obrigatórios" };

  const tenantId = await getTenantId();

  // Check if user already exists
  const existing = await basePrisma.user.findFirst({
    where: { tenantId, email },
  });
  if (existing) return { error: "Utilizador com este email já existe" };

  // Generate invite token (48h)
  const token = await new SignJWT({ email, tenantId, name, role, type: "invite" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("48h")
    .sign(getSecretKey());

  // Send invite email
  const transporter = getSmtpTransporter();
  if (transporter) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Convite — Command Center",
      text: `Olá ${name},\n\nFoste convidado para o Command Center.\n\nClica aqui para activar a tua conta:\n${inviteUrl}\n\nO link expira em 48 horas.`,
      html: `<p>Olá <strong>${name}</strong>,</p><p>Foste convidado para o Command Center.</p><p><a href="${inviteUrl}">Activar conta</a></p><p>O link expira em 48 horas.</p>`,
    });
  }

  revalidatePath("/people");
  return { success: true };
}

// ─── Accept Invite ─────────────────────────────────────────

export async function acceptInvite(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const token = field(formData, "token") ?? "";
  const password = field(formData, "password") ?? "";

  if (!token || !password) return { error: "Token e password obrigatórios" };
  if (password.length < 6) return { error: "Password deve ter pelo menos 6 caracteres" };

  let payload: { email: string; tenantId: string; name: string; role: string; type: string };
  try {
    const { payload: p } = await jwtVerify(token, getSecretKey());
    payload = p as typeof payload;
    if (payload.type !== "invite") return { error: "Token inválido" };
  } catch {
    return { error: "Convite expirado ou inválido" };
  }

  // Check not already accepted
  const existing = await basePrisma.user.findFirst({
    where: { tenantId: payload.tenantId, email: payload.email },
  });
  if (existing) return { error: "Conta já activada" };

  const passwordHash = await bcrypt.hash(password, 10);

  // Create Person + User in transaction
  await basePrisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        email: payload.email,
        type: "equipa",
      },
    });

    await tx.user.create({
      data: {
        tenantId: payload.tenantId,
        email: payload.email,
        passwordHash,
        role: payload.role as "admin" | "manager" | "membro",
        personId: person.id,
      },
    });
  });

  // Auto-login
  const user = await basePrisma.user.findFirst({
    where: { tenantId: payload.tenantId, email: payload.email },
    include: { tenant: { select: { locale: true } } },
  });

  if (user) {
    await createSession({
      userId: user.id,
      personId: user.personId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      locale: user.tenant.locale,
    });
  }

  redirect("/");
}

// ─── Request Password Reset ────────────────────────────────

export async function requestPasswordReset(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const email = field(formData, "email") ?? "";
  if (!email) return { error: "Email obrigatório" };

  // Always return success to avoid email enumeration
  const user = await basePrisma.user.findFirst({
    where: { email },
    select: { id: true, tenantId: true, email: true },
  });

  if (user) {
    const token = await new SignJWT({ userId: user.id, tenantId: user.tenantId, type: "reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(getSecretKey());

    const transporter = getSmtpTransporter();
    if (transporter) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
      const resetUrl = `${baseUrl}/reset-password/${token}`;

      await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject: "Reset de Password — Command Center",
        text: `Clica aqui para redefinir a tua password:\n${resetUrl}\n\nO link expira em 1 hora.`,
        html: `<p><a href="${resetUrl}">Redefinir password</a></p><p>O link expira em 1 hora.</p>`,
      });
    }
  }

  return { success: true };
}

// ─── Reset Password ────────────────────────────────────────

export async function resetPassword(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const token = field(formData, "token") ?? "";
  const password = field(formData, "password") ?? "";

  if (!token || !password) return { error: "Token e password obrigatórios" };
  if (password.length < 6) return { error: "Password deve ter pelo menos 6 caracteres" };

  let payload: { userId: string; type: string };
  try {
    const { payload: p } = await jwtVerify(token, getSecretKey());
    payload = p as typeof payload;
    if (payload.type !== "reset") return { error: "Token inválido" };
  } catch {
    return { error: "Link expirado ou inválido" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await basePrisma.user.update({
    where: { id: payload.userId },
    data: { passwordHash },
  });

  return { success: true };
}
