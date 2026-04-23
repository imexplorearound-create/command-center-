import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleTelegramUpdate, verifyTelegramWebhook } from "@/lib/integrations/telegram-bot";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Verify the request comes from Telegram (secret_token set during setWebhook)
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramWebhook(secretToken)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const update = await request.json();
    handleTelegramUpdate(update).catch((err) => {
      console.error("Telegram webhook error:", err);
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
