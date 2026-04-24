import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:read"] });
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);
  const sheet = await db.testSheet.findFirst({
    where: { id },
    include: {
      project: { select: { slug: true, name: true } },
      cases: {
        where: { archivedAt: null },
        orderBy: { code: "asc" },
        take: 500,
      },
    },
  });
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    sheet: {
      id: sheet.id,
      title: sheet.title,
      description: sheet.description,
      project: { slug: sheet.project.slug, name: sheet.project.name },
      archivedAt: sheet.archivedAt?.toISOString() ?? null,
      createdAt: sheet.createdAt.toISOString(),
      cases: sheet.cases.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        expectedResult: c.expectedResult,
        module: c.module,
        createdAt: c.createdAt.toISOString(),
      })),
    },
  });
}
