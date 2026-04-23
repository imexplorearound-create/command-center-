import { basePrisma, tenantPrisma } from "@/lib/db";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant";

/**
 * Discord integration for Command Center.
 *
 * Receives structured messages from a Discord bot or OpenClaw agents.
 * The bot watches relevant channels and forwards messages here.
 *
 * Message types:
 * - "agent_update" — status update from an OpenClaw agent
 * - "task" — task extracted from conversation
 * - "decision" — decision recorded in chat
 * - "alert" — something needs attention
 * - "interaction" — client interaction detected
 */

export interface DiscordMessage {
  type: "agent_update" | "task" | "decision" | "alert" | "interaction";
  channel: string;
  author: string;
  content: string;
  timestamp: string;
  // Optional structured fields
  agentId?: string;
  projectSlug?: string;
  priority?: string;
  assignee?: string;
  severity?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

export async function processDiscordMessage(msg: DiscordMessage) {
  const start = Date.now();
  const projectSlug = msg.projectSlug;

  // Resolve tenant — from project if available, otherwise default tenant
  let tenantId: string | null = null;
  let projectId: string | null = null;

  if (projectSlug) {
    const project = await basePrisma.project.findFirst({
      where: { slug: projectSlug },
      select: { id: true, tenantId: true },
    });
    projectId = project?.id ?? null;
    tenantId = project?.tenantId ?? null;
  }

  if (!tenantId) {
    const tenant = await basePrisma.tenant.findFirst({ where: { slug: DEFAULT_TENANT_SLUG } });
    if (!tenant) throw new Error("Default tenant not found");
    tenantId = tenant.id;
  }

  const db = tenantPrisma(tenantId);

  // Resolve assignee
  let assigneeId: string | null = null;
  if (msg.assignee) {
    const person = await db.person.findFirst({
      where: { name: { contains: msg.assignee, mode: "insensitive" } },
      select: { id: true },
    });
    assigneeId = person?.id ?? null;
  }

  switch (msg.type) {
    case "task": {
      await db.task.create({
        data: {
          title: msg.content.slice(0, 500),
          projectId,
          assigneeId,
          status: "backlog",
          priority: (msg.priority as string) ?? "media",
          origin: "discord",
          originRef: `discord:${msg.channel}`,
          originDate: new Date(msg.timestamp),
          aiExtracted: true,
          aiConfidence: 0.7,
          validationStatus: "por_confirmar",
          tenantId: "",
        },
      });
      break;
    }

    case "decision": {
      if (projectId) {
        // Find client for this project
        const client = await db.client.findFirst({
          where: { projectId },
          select: { id: true },
        });

        await db.interaction.create({
          data: {
            type: "decisao",
            title: msg.content.slice(0, 500),
            body: msg.content,
            source: "discord",
            sourceRef: `discord:${msg.channel}`,
            projectId,
            clientId: client?.id,
            interactionDate: new Date(msg.timestamp),
            aiExtracted: true,
            aiConfidence: 0.7,
            validationStatus: "por_confirmar",
            tenantId: "",
          },
        });
      }
      break;
    }

    case "alert": {
      await db.alert.create({
        data: {
          type: "agent_alerta",
          severity: msg.severity ?? "warning",
          title: msg.content.slice(0, 500),
          description: `Fonte: ${msg.agentId ?? msg.author} via Discord #${msg.channel}`,
          relatedProjectId: projectId,
          tenantId: "",
        },
      });
      break;
    }

    case "interaction": {
      let clientId: string | null = null;
      if (msg.clientId) {
        clientId = msg.clientId;
      } else if (projectId) {
        const client = await db.client.findFirst({
          where: { projectId },
          select: { id: true },
        });
        clientId = client?.id ?? null;
      }

      await db.interaction.create({
        data: {
          type: "nota",
          title: msg.content.slice(0, 500),
          body: msg.content,
          source: "discord",
          sourceRef: `discord:${msg.channel}`,
          projectId,
          clientId,
          interactionDate: new Date(msg.timestamp),
          tenantId: "",
        },
      });
      break;
    }

    case "agent_update": {
      // Agent updates are logged but not stored as tasks/interactions
      // They feed the Discord satellite count
      break;
    }
  }

  await db.syncLog.create({
    data: {
      source: "discord",
      action: `message:${msg.type}`,
      status: "success",
      itemsProcessed: 1,
      durationMs: Date.now() - start,
      tenantId: "",
    },
  });

  return { processed: true, type: msg.type };
}
