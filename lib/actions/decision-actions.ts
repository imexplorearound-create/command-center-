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
import type { ActionResult } from "./types";

export async function createDecision(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: formData.get("title") as string,
    context: (formData.get("context") as string) || null,
    kind: formData.get("kind") as string,
    severity: formData.get("severity") as string,
    crewRoleId: (formData.get("crewRoleId") as string) || null,
    dueAt: (formData.get("dueAt") as string) || null,
    projectId: (formData.get("projectId") as string) || null,
    opportunityId: (formData.get("opportunityId") as string) || null,
    taskId: (formData.get("taskId") as string) || null,
    sourceMaestroActionId:
      (formData.get("sourceMaestroActionId") as string) || null,
    feedbackItemId: (formData.get("feedbackItemId") as string) || null,
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
      resolvedById: user?.personId ?? null,
      resolutionNote: parsed.data.resolutionNote ?? null,
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

export async function reopenDecision(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = reopenDecisionSchema.safeParse({
    decisionId: formData.get("decisionId"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  await db.decision.update({
    where: { id: parsed.data.decisionId },
    data: { resolvedAt: null, resolvedById: null, resolutionNote: null },
  });

  revalidatePath("/");
  return { success: true };
}

// ─── Recompute ────────────────────────────────────────────────────
//
// Varre sinais e faz upsert idempotente por chave natural
// (tenantId + kind + naturalKey). Para a F2 basta o esqueleto +
// 4 regras básicas. F3 vai preencher com priority + auto-resolve
// inteligente via Maestro.

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

  const openKeys = new Set(
    generated.map((g) => `${g.kind}::${g.naturalKey}`),
  );

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

  const byKey = new Map(
    existing.map((d) => {
      const key =
        d.kind === "pipeline_stall"
          ? `pipeline_stall::opp:${d.opportunityId}`
          : d.kind === "feedback_triage"
            ? `feedback_triage::feedback:${d.feedbackItemId}`
            : d.kind === "bruno_block"
              ? `bruno_block::project-block:${d.projectId}`
              : `${d.kind}::unknown:${d.id}`;
      return [key, d.id];
    }),
  );

  let newCount = 0;
  for (const g of generated) {
    const key = `${g.kind}::${g.naturalKey}`;
    if (byKey.has(key)) {
      byKey.delete(key);
      continue;
    }
    await db.decision.create({
      data: {
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
      },
    });
    newCount += 1;
  }

  const toAutoResolve = [...byKey.values()];
  if (toAutoResolve.length > 0) {
    await db.decision.updateMany({
      where: { id: { in: toAutoResolve } },
      data: {
        resolvedAt: new Date(),
        resolutionNote: "Auto-resolvido: condição já não se verifica.",
      },
    });
  }

  // Silence unused var lint — useful for future stall kinds
  void openKeys;

  revalidatePath("/");
  return {
    success: true,
    data: { generated: newCount, resolved: toAutoResolve.length },
  };
}
