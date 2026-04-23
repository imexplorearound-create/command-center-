import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleWhatsAppMessage } from "@/lib/integrations/whatsapp-bot";

export const dynamic = "force-dynamic";

// Webhook verification (GET) — Meta sends this on setup
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Webhook messages (POST) — Meta sends incoming messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract messages from WhatsApp Cloud API webhook format
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        if (change?.value?.messages) {
          for (const msg of change.value.messages) {
            if (msg.type === "text" && msg.text?.body) {
              // Process asynchronously
              handleWhatsAppMessage(msg.from, msg.text.body).catch((err) => {
                console.error("WhatsApp message handler error:", err);
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always 200
  }
}
