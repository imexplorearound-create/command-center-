import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyGithubSignature,
  processGithubEvent,
} from "@/lib/integrations/github";

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyGithubSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = request.headers.get("x-github-event");
  if (!eventType) {
    return NextResponse.json(
      { error: "Missing x-github-event header" },
      { status: 400 }
    );
  }

  // Respond to ping events immediately
  if (eventType === "ping") {
    return NextResponse.json({ ok: true, event: "ping" });
  }

  try {
    const payload = JSON.parse(body);
    const result = await processGithubEvent(eventType, payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
