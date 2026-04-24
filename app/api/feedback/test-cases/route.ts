import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateFeedbackOrAgent } from "@/lib/feedback-auth";
import { tenantPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const ctx = await authenticateFeedbackOrAgent(request);
  if (ctx instanceof NextResponse) return ctx;

  const params = request.nextUrl.searchParams;
  const projectSlug = params.get("projectSlug");
  if (!projectSlug) {
    return NextResponse.json({ error: "projectSlug required" }, { status: 400 });
  }

  const db = tenantPrisma(ctx.tenantId);
  const project = await db.project.findFirst({
    where: { slug: projectSlug, archivedAt: null },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const cases = await db.testCase.findMany({
    where: {
      archivedAt: null,
      sheet: { projectId: project.id, archivedAt: null },
    },
    orderBy: [{ sheet: { createdAt: "desc" } }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      title: true,
      module: true,
      sheet: { select: { id: true, title: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    count: cases.length,
    testCases: cases.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      module: c.module,
      sheetId: c.sheet.id,
      sheetTitle: c.sheet.title,
    })),
  });
}
