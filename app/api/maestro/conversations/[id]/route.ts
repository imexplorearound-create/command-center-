import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireWriter } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireWriter();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const db = await getTenantDb();
  const { id } = await params;

  const conv = await db.maestroConversation.findFirst({
    where: { id, ownerId: auth.user.personId, archivedAt: null },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          toolCalls: true,
          toolResults: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conv) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: conv.id,
    title: conv.title,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      toolResults: m.toolResults,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireWriter();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const db = await getTenantDb();
  const { id } = await params;

  const result = await db.maestroConversation.updateMany({
    where: { id, ownerId: auth.user.personId },
    data: { archivedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
