import { NextResponse } from "next/server";
import { getProjects, getObjectives, getAlerts, getStats, getSatellites } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";

export async function GET() {
  const user = await getAuthUser();
  const [projects, objectives, alerts, stats, satellites] = await Promise.all([
    getProjects(user),
    getObjectives(user),
    getAlerts(user),
    getStats(user),
    getSatellites(),
  ]);

  return NextResponse.json({ projects, objectives, alerts, stats, satellites });
}
