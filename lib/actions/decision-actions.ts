"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { requireWriter, getAuthUser } from "@/lib/auth/dal";
import { firstZodError } from "@/lib/validation/project-schema";
import {
  createDecisionSchema,
  resolveDecisionSchema,
  snoozeDecisionSchema,
  reopenDecisionSchema,
  type DecisionKindInput,
} from "@/lib/validation/decision-schema";
import { field, emptyToNull } from "./form-helpers";
import type { ActionResult } from "./types";

export async function createDecision(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: field(formData, "title"),
    context: emptyToNull(field(formData, "context")),
    kind: field(formData, "kind"),
    severity: field(formData, "severity"),
    crewRoleId: emptyToNull(field(formData, "crewRoleId")),
    dueAt: emptyToNull(field(formData, "dueAt")),
    projectId: emptyToNull(field(formData, "projectId")),
    opportunityId: emptyToNull(field(formData, "opportunityId")),
    taskId: emptyToNull(field(formData, "taskId")),
    sourceMaestroActionId: emptyToNull(field(formData, "sourceMaestroActionId")),
    feedbackItemId: emptyToNull(field(formData, "feedbackItemId")),
  };

  const parsed = createDecisionSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const decision = await db.decision.create({
    data: {
      tenantId: "",
      title: parsed.data.title,
      context: parsed.data.context ?? null,
      kind: parsed.data.kind,
      severity: parsed.data.severity,
      crewRoleId: parsed.data.crewRoleId ?? null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      projectId: parsed.data.projectId ?? null,
      opportunityId: parsed.data.opportunityId ?? null,
      taskId: parsed.data.taskId ?? null,
      sourceMaestroActionId: parsed.data.sourceMaestroActionId ?? null,
      feedbackItemId: parsed.data.feedbackItemId ?? null,
    },
    select: { id: true },
  });

  revalidatePath("/");
  return { success: true, data: { id: decision.id } };
}

export async function resolveDecision(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = resolveDecisionSchema.safeParse({
    decisionId: formData.get("decisionId"),
    resolutionNote: (formData.get("resolutionNote") as string) || null,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const user = await getAuthUser();
  await db.decision.update({
    where: { id: parsed.data.decisionId },
    data: {
      resolvedAt: new Date(),
      resolvedBy: user?.personId
        ? { connect: { id: user.personId } }
        : { disconnect: true },
      resolutionNote: parsed.data.resolutionNote ?? null,
      resolutionSource: "human",
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function snoozeDecision(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = snoozeDecisionSchema.safeParse({
    decisionId: formData.get("decisionId"),
    snoozedUntil: formData.get("snoozedUntil"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  await db.decision.update({
    where: { id: parsed.data.decisionId },
    data: { snoozedUntil: new Date(parsed.data.snoozedUntil) },
  });

  revalidatePath("/");
  return { success: true };
}

// DB1 (fechada 23 Abr 2026): reabrir NÃO limpa `resolvedAt` da antiga.
// Em vez disso cria nova row com mesma chave natural e a antiga guarda
// `reopenedById: <newId>`. Preserva histórico do feed "Resolvidas 24h"
// e habilita analytics de ciclo-de-vida.
export async function reopenDecision(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = reopenDecisionSchema.safeParse({
    decisionId: formData.get("decisionId"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const old = await db.decision.findUnique({
    where: { id: parsed.data.decisionId },
    select: {
      id: true,
      title: true,
      context: true,
      kind: true,
      severity: true,
      crewRoleId: true,
      dueAt: true,
      projectId: true,
      opportunityId: true,
      taskId: true,
      sourceMaestroActionId: true,
      feedbackItemId: true,
      reopenedById: true,
    },
  });
  if (!old) return { error: "Decisão não encontrada" };
  // A cadeia é linear: A → B → C. Quando se reabre A cria-se B; se B
  // for resolvida e reaberta cria-se C. O que este guard impede é
  // reabrir A duas vezes (criaria duas sucessoras a competir pelo
  // estado "vivo"). A sucessora pode ser reaberta normalmente.
  if (old.reopenedById) return { error: "Esta decisão já foi reaberta" };

  // Destructure para copiar TODOS os campos herdáveis. Se o schema ganhar
  // novo campo (ex. `assignedToRoleId`) e estiver no `select` acima, é
  // propagado automaticamente para a nova row — fail-safe com schema
  // growth (vs. enumerar à mão e arriscar esquecer). Excluímos
  // `id` (auto) e `reopenedById` (nova começa sem sucessora).
  const { id: _oldId, reopenedById: _oldReopenedBy, ...inheritable } = old;
  void _oldId;
  void _oldReopenedBy;

  const next = await db.decision.create({
    data: { ...inheritable, tenantId: "" },
    select: { id: true },
  });

  await db.decision.update({
    where: { id: old.id },
    data: { reopenedBy: { connect: { id: next.id } } },
  });

  revalidatePath("/");
  return { success: true, data: { id: next.id } };
}

// ─── Recompute ────────────────────────────────────────────────────
//
// Varre sinais e faz upsert idempotente por chave natural
// (tenantId + kind + naturalKey). F3 vai acrescentar priority +
// auto-resolve inteligente via Maestro.

type GeneratedDecision = {
  naturalKey: string;
  title: string;
  context: string;
  kind: DecisionKindInput;
  severity: "block" | "warn" | "pend";
  crewRoleId: string | null;
  dueAt: Date | null;
  projectId?: string | null;
  opportunityId?: string | null;
  feedbackItemId?: string | null;
};

type ExistingRef = {
  id: string;
  kind: string;
  opportunityId: string | null;
  feedbackItemId: string | null;
  projectId: string | null;
};

const EXISTING_KEY_BY_KIND: Record<string, (d: ExistingRef) => string> = {
  pipeline_stall: (d) => `pipeline_stall::opp:${d.opportunityId}`,
  feedback_triage: (d) => `feedback_triage::feedback:${d.feedbackItemId}`,
  bruno_block: (d) => `bruno_block::project-block:${d.projectId}`,
};

function keyForExisting(d: ExistingRef): string {
  return EXISTING_KEY_BY_KIND[d.kind]?.(d) ?? `${d.kind}::unknown:${d.id}`;
}

export async function recomputeDecisions(): Promise<
  ActionResult<{ generated: number; resolved: number }>
> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const [stalledOpps, pendingFeedback, blockedProjects, roles] =
    await Promise.all([
      db.opportunity.findMany({
        where: {
          archivedAt: null,
          closedAt: null,
          stageEnteredAt: { lt: new Date(now - 7 * DAY) },
        },
        select: { id: true, title: true, crewRoleId: true },
      }),
      db.feedbackItem.findMany({
        where: {
          archivedAt: null,
          status: "pending",
          createdAt: { lt: new Date(now - 3 * DAY) },
        },
        select: {
          id: true,
          classification: true,
          attributedCrewRoleId: true,
        },
      }),
      db.project.findMany({
        where: { archivedAt: null, health: "block" },
        select: { id: true, name: true, slug: true },
      }),
      db.crewRole.findMany({ select: { id: true, slug: true } }),
    ]);

  const pipelineRole = roles.find((r) => r.slug === "pipeline")?.id ?? null;
  const qaRole = roles.find((r) => r.slug === "qa")?.id ?? null;
  const opsRole = roles.find((r) => r.slug === "ops")?.id ?? null;

  const generated: GeneratedDecision[] = [
    ...stalledOpps.map((o) => ({
      naturalKey: `opp:${o.id}`,
      title: `Oportunidade parada há >7 dias: ${o.title}`,
      context: "Sem mudança de estado há mais de uma semana.",
      kind: "pipeline_stall" as const,
      severity: "warn" as const,
      crewRoleId: o.crewRoleId ?? pipelineRole,
      dueAt: null,
      opportunityId: o.id,
    })),
    ...pendingFeedback.map((f) => ({
      naturalKey: `feedback:${f.id}`,
      title: `Feedback pendente de triagem há >72h`,
      context: f.classification ?? "Sem classificação atribuída.",
      kind: "feedback_triage" as const,
      severity: "pend" as const,
      crewRoleId: f.attributedCrewRoleId ?? qaRole,
      dueAt: null,
      feedbackItemId: f.id,
    })),
    ...blockedProjects.map((p) => ({
      naturalKey: `project-block:${p.id}`,
      title: `Projecto bloqueado: ${p.name}`,
      context: "Health marcado como `block` — destrancar antes de avançar.",
      kind: "bruno_block" as const,
      severity: "block" as const,
      crewRoleId: opsRole,
      dueAt: null,
      projectId: p.id,
    })),
  ];

  const existing = await db.decision.findMany({
    where: { resolvedAt: null },
    select: {
      id: true,
      kind: true,
      opportunityId: true,
      feedbackItemId: true,
      projectId: true,
    },
  });

  const byKey = new Map(existing.map((d) => [keyForExisting(d), d.id]));

  const toCreate = generated.filter((g) => {
    const key = `${g.kind}::${g.naturalKey}`;
    const hit = byKey.has(key);
    if (hit) byKey.delete(key);
    return !hit;
  });

  if (toCreate.length > 0) {
    await db.decision.createMany({
      data: toCreate.map((g) => ({
        tenantId: "",
        title: g.title,
        context: g.context,
        kind: g.kind,
        severity: g.severity,
        crewRoleId: g.crewRoleId,
        dueAt: g.dueAt,
        projectId: g.projectId ?? null,
        opportunityId: g.opportunityId ?? null,
        feedbackItemId: g.feedbackItemId ?? null,
      })),
    });
  }

  const toAutoResolve = [...byKey.values()];
  if (toAutoResolve.length > 0) {
    await db.decision.updateMany({
      where: { id: { in: toAutoResolve } },
      data: {
        resolvedAt: new Date(),
        resolutionNote: "Auto-resolvido: condição já não se verifica.",
        resolutionSource: "auto",
      },
    });
  }

  revalidatePath("/");
  return {
    success: true,
    data: { generated: toCreate.length, resolved: toAutoResolve.length },
  };
}
