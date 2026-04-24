import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import { createTestSheetSchema } from "@/lib/validation/test-sheet-schema";
import { parseJsonBody, handleUniqueViolation } from "@/lib/api/dev-route-helpers";

export async function GET(request: NextRequest) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:read"] });
  if (ctx instanceof NextResponse) return ctx;

  const db = tenantPrisma(ctx.tenantId);
  const params = request.nextUrl.searchParams;
  const projectSlug = params.get("projectSlug");
  const includeArchived = params.get("includeArchived") === "true";

  const sheets = await db.testSheet.findMany({
    where: {
      ...(projectSlug ? { project: { slug: projectSlug } } : {}),
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { slug: true, name: true } },
      _count: { select: { cases: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    count: sheets.length,
    sheets: sheets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      project: { slug: s.project.slug, name: s.project.name },
      casesCount: s._count.cases,
      archivedAt: s.archivedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:write"] });
  if (ctx instanceof NextResponse) return ctx;

  const body = await parseJsonBody(request, createTestSheetSchema);
  if (body instanceof NextResponse) return body;
  const { projectSlug, title, description, cases } = body;

  const db = tenantPrisma(ctx.tenantId);
  const project = await db.project.findFirst({
    where: { slug: projectSlug, archivedAt: null },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const sheet = await db.testSheet.create({
      data: {
        tenantId: "",
        projectId: project.id,
        title,
        description: description ?? null,
        createdByApiKeyId: ctx.keyId,
        cases: {
          create: cases.map((c) => ({
            tenantId: "",
            code: c.code,
            title: c.title,
            description: c.description ?? null,
            expectedResult: c.expectedResult ?? null,
            module: c.module ?? null,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        cases: { select: { id: true, code: true, title: true } },
      },
    });
    return NextResponse.json({ sheet }, { status: 201 });
  } catch (e) {
    return handleUniqueViolation(e, "Código de TestCase duplicado dentro da sheet");
  }
}
