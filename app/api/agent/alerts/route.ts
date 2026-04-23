import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { resolveProjectSlug } from "@/lib/agent-helpers";

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const body = await request.json();
  const { title, type, severity, description, projectSlug } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const resolved = projectSlug ? await resolveProjectSlug(db, projectSlug) : null;

  const alert = await db.alert.create({
    data: {
      tenantId: "",
      title,
      type: type ?? `agent:${auth.agentId}`,
      severity: severity ?? "info",
      description: description ?? `Criado por agente ${auth.agentId}`,
      relatedProjectId: resolved?.projectId ?? null,
    },
  });

  return NextResponse.json({ id: alert.id }, { status: 201 });
}
