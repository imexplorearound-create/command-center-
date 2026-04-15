import { NextResponse } from "next/server";
import { requireWriter } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireWriter();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const db = await getTenantDb();

  const conversations = await db.maestroConversation.findMany({
    where: { ownerId: auth.user.personId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    })),
  });
}
