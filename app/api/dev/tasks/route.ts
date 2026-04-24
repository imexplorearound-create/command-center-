import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import {
  approvalStatusEnum,
  type ApprovalStatus,
} from "@/lib/validation/feedback-approval";

/**
 * Queue do Bruno. Filtra por approvalStatus dos FeedbackItems ligados à Task
 * — a unidade de trabalho dele é a Task, mas o ciclo vive nos FeedbackItems.
 *
 * ?status=approved|in_dev|ready_for_verification (default: approved + in_dev)
 * ?projectSlug=X
 * ?testCaseId=Y
 */
export async function GET(request: NextRequest) {
  const ctx = await authenticateDev(request, { scopes: ["tasks:read"] });
  if (ctx instanceof NextResponse) return ctx;

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status");
  const projectSlug = params.get("projectSlug");
  const testCaseId = params.get("testCaseId");
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);

  const statuses: ApprovalStatus[] = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter((s) => {
        return approvalStatusEnum.safeParse(s).success;
      }) as ApprovalStatus[]
    : ["approved", "in_dev"];

  if (statuses.length === 0) {
    return NextResponse.json({ error: "No valid status values" }, { status: 400 });
  }

  const db = tenantPrisma(ctx.tenantId);
  const tasks = await db.task.findMany({
    where: {
      archivedAt: null,
      testCaseId: testCaseId ?? { not: null },
      feedbackItems: {
        some: { approvalStatus: { in: statuses } },
      },
      ...(projectSlug ? { project: { slug: projectSlug } } : {}),
    },
    select: {
      id: true,
      title: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { slug: true, name: true } },
      testCase: { select: { id: true, code: true, title: true } },
      feedbackItems: {
        where: { approvalStatus: { in: statuses } },
        select: {
          id: true,
          approvalStatus: true,
          priority: true,
          pageUrl: true,
          verifyRejectionsCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      approvalStatus: t.feedbackItems[0]?.approvalStatus ?? null,
      project: { slug: t.project?.slug ?? null, name: t.project?.name ?? null },
      testCase: t.testCase,
      feedbackCount: t.feedbackItems.length,
      verifyRejectionsMax: Math.max(
        0,
        ...t.feedbackItems.map((f) => f.verifyRejectionsCount),
      ),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}
