import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import { updateTestCaseSchema } from "@/lib/validation/test-sheet-schema";
import { parseJsonBody } from "@/lib/api/dev-route-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:write"] });
  if (ctx instanceof NextResponse) return ctx;

  const body = await parseJsonBody(request, updateTestCaseSchema);
  if (body instanceof NextResponse) return body;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description ?? null;
  if (body.expectedResult !== undefined) data.expectedResult = body.expectedResult ?? null;
  if (body.module !== undefined) data.module = body.module ?? null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await db.testCase.updateMany({
    where: { id, archivedAt: null },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found or archived" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, { scopes: ["testsheets:write"] });
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);
  const result = await db.testCase.updateMany({
    where: { id, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found or already archived" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
