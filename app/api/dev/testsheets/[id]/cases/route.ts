import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import { addTestCasesSchema } from "@/lib/validation/test-sheet-schema";
import { parseJsonBody, handleUniqueViolation } from "@/lib/api/dev-route-helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:write"] });
  if (ctx instanceof NextResponse) return ctx;

  const body = await parseJsonBody(request, addTestCasesSchema);
  if (body instanceof NextResponse) return body;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);
  const sheet = await db.testSheet.findFirst({
    where: { id, archivedAt: null },
    select: { id: true },
  });
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });

  try {
    const created = await db.testCase.createManyAndReturn({
      data: body.cases.map((c) => ({
        tenantId: "",
        sheetId: id,
        code: c.code,
        title: c.title,
        description: c.description ?? null,
        expectedResult: c.expectedResult ?? null,
        module: c.module ?? null,
      })),
      select: { id: true, code: true, title: true },
    });
    return NextResponse.json({ cases: created }, { status: 201 });
  } catch (e) {
    return handleUniqueViolation(e, "Código duplicado dentro da sheet");
  }
}
