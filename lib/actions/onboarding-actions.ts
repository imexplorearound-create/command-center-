"use server";

import { getTenantDb, getTenantId } from "@/lib/tenant";
import { basePrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
} from "@/lib/validation/onboarding-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";
import bcrypt from "bcryptjs";

// ─── Step 1 — Company Info ─────────────────────────────────

export async function saveOnboardingStep1(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    tenantName: formData.get("tenantName") as string ?? "",
    logoUrl: (formData.get("logoUrl") as string) || undefined,
  };

  const parsed = onboardingStep1Schema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const tenantId = await getTenantId();
  await basePrisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: parsed.data.tenantName,
      logoUrl: parsed.data.logoUrl ?? null,
    },
  });

  return { success: true };
}

// ─── Step 2 — Invite Team Members ──────────────────────────

export async function saveOnboardingStep2(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const usersJson = formData.get("users") as string;
  if (!usersJson) return { error: "Dados de equipa obrigatórios" };

  let usersRaw: unknown;
  try {
    usersRaw = JSON.parse(usersJson);
  } catch {
    return { error: "Formato inválido" };
  }

  const parsed = onboardingStep2Schema.safeParse({ users: usersRaw });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const defaultPassword = await bcrypt.hash("welcome2026", 10);

  // Batch: check existing emails in one query
  const emails = parsed.data.users.map((u) => u.email);
  const existing = await db.person.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email));

  const newUsers = parsed.data.users.filter((u) => !existingEmails.has(u.email));

  for (const u of newUsers) {
    const person = await db.person.create({
      data: {
        tenantId: "",
        name: u.name,
        email: u.email,
        type: "equipa",
      },
    });

    await db.user.create({
      data: {
        tenantId: "",
        email: u.email,
        passwordHash: defaultPassword,
        role: u.role as "admin" | "manager" | "membro",
        personId: person.id,
      },
    });
  }

  return { success: true };
}

// ─── Step 3 — Create Areas ─────────────────────────────────

export async function saveOnboardingStep3(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const areasJson = formData.get("areas") as string;
  if (!areasJson) return { error: "Dados de áreas obrigatórios" };

  let areasRaw: unknown;
  try {
    areasRaw = JSON.parse(areasJson);
  } catch {
    return { error: "Formato inválido" };
  }

  const parsed = onboardingStep3Schema.safeParse({ areas: areasRaw });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  // Batch: check existing slugs in one query
  const slugs = parsed.data.areas.map((a) => a.slug);
  const existing = await db.area.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((e) => e.slug));

  const newAreas = parsed.data.areas
    .filter((a) => !existingSlugs.has(a.slug))
    .map((a) => ({
      tenantId: "",
      name: a.name,
      slug: a.slug,
    }));

  if (newAreas.length > 0) {
    await db.area.createMany({ data: newAreas });
  }

  return { success: true };
}

// ─── Step 4 — Import People ────────────────────────────────

export async function saveOnboardingStep4(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const peopleJson = formData.get("people") as string;
  if (!peopleJson) return { error: "Dados de pessoas obrigatórios" };

  let peopleRaw: unknown;
  try {
    peopleRaw = JSON.parse(peopleJson);
  } catch {
    return { error: "Formato inválido" };
  }

  const parsed = onboardingStep4Schema.safeParse({ people: peopleRaw });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  // Batch: check existing emails in one query
  const emailsToCheck = parsed.data.people
    .map((p) => p.email)
    .filter((e): e is string => !!e);
  const existing = await db.person.findMany({
    where: { email: { in: emailsToCheck } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email));

  const newPeople = parsed.data.people
    .filter((p) => !p.email || !existingEmails.has(p.email))
    .map((p) => ({
      tenantId: "",
      name: p.name,
      email: p.email ?? null,
      role: p.role ?? null,
      type: p.type,
    }));

  if (newPeople.length > 0) {
    await db.person.createMany({ data: newPeople });
  }

  return { success: true };
}

// ─── Step 4b — CSV Import ──────────────────────────────────

export async function importPeopleFromCsv(
  _prev: ActionResult<{ imported: number }> | undefined,
  formData: FormData
): Promise<ActionResult<{ imported: number }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const file = formData.get("csv") as File | null;
  if (!file) return { error: "Ficheiro CSV obrigatório" };

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { error: "CSV vazio ou sem dados" };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "nome" || h === "name");
  const emailIdx = headers.findIndex((h) => h === "email");
  const roleIdx = headers.findIndex((h) => h === "papel" || h === "role");

  if (nameIdx === -1) return { error: "Coluna 'nome' ou 'name' não encontrada no CSV" };

  // Parse all rows first
  const rows: { name: string; email: string | null; role: string | null }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    if (!name) continue;
    rows.push({
      name,
      email: emailIdx >= 0 ? cols[emailIdx] || null : null,
      role: roleIdx >= 0 ? cols[roleIdx] || null : null,
    });
  }

  const db = await getTenantDb();

  // Batch: check existing emails
  const emailsToCheck = rows.map((r) => r.email).filter((e): e is string => !!e);
  const existing = await db.person.findMany({
    where: { email: { in: emailsToCheck } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email));

  const newPeople = rows
    .filter((r) => !r.email || !existingEmails.has(r.email))
    .map((r) => ({
      tenantId: "",
      name: r.name,
      email: r.email,
      role: r.role,
      type: "equipa",
    }));

  if (newPeople.length > 0) {
    await db.person.createMany({ data: newPeople });
  }

  revalidatePath("/people");
  return { success: true, data: { imported: newPeople.length } };
}

// ─── Step 5 — Enable Modules ───────────────────────────────

export async function saveOnboardingStep5(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const modulesJson = formData.get("enabledModules") as string;
  if (!modulesJson) return { error: "Dados de módulos obrigatórios" };

  let modulesRaw: unknown;
  try {
    modulesRaw = JSON.parse(modulesJson);
  } catch {
    return { error: "Formato inválido" };
  }

  const parsed = onboardingStep5Schema.safeParse({ enabledModules: modulesRaw });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const tenantId = await getTenantId();

  // Get all module catalog entries. Tier 1 = essenciais (sempre activos).
  const allModules = await basePrisma.moduleCatalog.findMany();

  for (const mod of allModules) {
    const isEnabled = parsed.data.enabledModules.includes(mod.key) || mod.tier === 1;
    await db.tenantModuleConfig.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey: mod.key,
        },
      },
      create: {
        tenantId: "",
        moduleKey: mod.key,
        isEnabled,
      },
      update: { isEnabled },
    });
  }

  return { success: true };
}

// ─── Sample Project ────────────────────────────────────────

/**
 * Cria um projecto-exemplo com 3 fases e 5 tarefas distribuídas por kanban.
 * Ajuda o novo tenant a ter algo visível ao entrar pela primeira vez no dashboard.
 */
async function createSampleProject(): Promise<void> {
  const db = await getTenantDb();

  const existing = await db.project.findFirst({ where: { slug: "exemplo-website-launch" }, select: { id: true } });
  if (existing) return;

  const project = await db.project.create({
    data: {
      tenantId: "",
      name: "Exemplo: Website Launch",
      slug: "exemplo-website-launch",
      type: "interno",
      status: "ativo",
      color: "#6366f1",
      description: "Projecto de exemplo gerado no onboarding. Podes arquivá-lo quando não precisares.",
    },
    select: { id: true },
  });

  const phases = await Promise.all([
    db.projectPhase.create({
      data: { tenantId: "", projectId: project.id, name: "Research", phaseOrder: 0, status: "pendente" },
      select: { id: true },
    }),
    db.projectPhase.create({
      data: { tenantId: "", projectId: project.id, name: "Build", phaseOrder: 1, status: "pendente" },
      select: { id: true },
    }),
    db.projectPhase.create({
      data: { tenantId: "", projectId: project.id, name: "Launch", phaseOrder: 2, status: "pendente" },
      select: { id: true },
    }),
  ]);

  const sampleTasks = [
    { title: "Entrevistar 3 utilizadores-tipo", status: "feito",     phaseId: phases[0].id, kanbanOrder: 0, priority: "media" },
    { title: "Mapear fluxos principais",       status: "feito",     phaseId: phases[0].id, kanbanOrder: 1, priority: "media" },
    { title: "Design do homepage hero",         status: "em_curso",  phaseId: phases[1].id, kanbanOrder: 0, priority: "alta"  },
    { title: "Implementar página de contacto",  status: "backlog",   phaseId: phases[1].id, kanbanOrder: 0, priority: "media" },
    { title: "Configurar domínio + SSL",        status: "backlog",   phaseId: phases[2].id, kanbanOrder: 1, priority: "alta"  },
  ];

  await db.task.createMany({
    data: sampleTasks.map((t) => ({
      tenantId: "",
      title: t.title,
      projectId: project.id,
      phaseId: t.phaseId,
      status: t.status,
      priority: t.priority,
      kanbanOrder: t.kanbanOrder,
      validationStatus: "confirmed",
    })),
  });
}

// ─── Complete Onboarding ───────────────────────────────────

export async function completeOnboarding(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const tenantId = await getTenantId();

  await createSampleProject().catch((err) => {
    console.error("Sample project creation failed:", err);
  });

  await basePrisma.tenant.update({
    where: { id: tenantId },
    data: { onboardingCompletedAt: new Date() },
  });

  revalidatePath("/");
  return { success: true };
}
