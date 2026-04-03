"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
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
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
