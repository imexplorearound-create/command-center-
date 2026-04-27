import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWriter } from "@/lib/auth/dal";
import { getBriefingById } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireWriter();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
  const { id } = await params;
  const briefing = await getBriefingById(id, auth.user.userId);
  if (!briefing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(briefing);
}
