import type { NextRequest } from "next/server";
import { authenticateBearer } from "./bearer-cron";

export function authenticateBriefingCron(req: NextRequest) {
  return authenticateBearer(req, "BRIEFING_CRON_SECRET");
}
