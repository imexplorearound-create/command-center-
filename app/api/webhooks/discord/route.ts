import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  processDiscordMessage,
  type DiscordMessage,
} from "@/lib/integrations/discord";

export async function POST(request: NextRequest) {
  // Verify shared secret
  const secret = process.env.DISCORD_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "DISCORD_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DiscordMessage | DiscordMessage[];
    const messages = Array.isArray(body) ? body : [body];
    const results = [];

    for (const msg of messages) {
      if (!msg.type || !msg.content) {
        results.push({ error: "Missing type or content" });
        continue;
      }
      const result = await processDiscordMessage(msg);
      results.push(result);
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Discord webhook error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
