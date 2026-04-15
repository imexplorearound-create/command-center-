import { NextResponse } from "next/server";
import { basePrisma } from "@/lib/db";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Find first pending/sent recipient for this campaign and mark as opened
  // We use the campaignId to track opens at the campaign level
  try {
    // Increment open count on campaign
    await basePrisma.emailCampaign.update({
      where: { id: campaignId },
      data: { openCount: { increment: 1 } },
    });

    // Try to mark recipient as opened (if email param provided)
    // This is a best-effort tracking — no auth needed for pixel tracking
  } catch {
    // Silently fail — don't break email rendering
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
