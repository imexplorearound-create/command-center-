import type { NextRequest } from "next/server";
import { authenticateBearer } from "./bearer-cron";

export function authenticateDecayCron(req: NextRequest) {
  return authenticateBearer(req, "DECAY_CRON_SECRET");
}
