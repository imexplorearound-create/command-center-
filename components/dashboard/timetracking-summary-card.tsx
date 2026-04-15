import { getTenantDb } from "@/lib/tenant";
import { getAuthUser } from "@/lib/auth/dal";
import { getWeekBounds, formatDuration } from "@/lib/utils";
import { Clock } from "lucide-react";
import Link from "next/link";

export async function TimetrackingSummaryCard() {
  const user = await getAuthUser();
  if (!user) return null;

  const db = await getTenantDb();
  const { monday, sunday } = getWeekBounds();

  const entries = await db.timeEntry.findMany({
    where: {
      personId: user.personId,
      date: { gte: monday, lte: sunday },
      archivedAt: null,
    },
    select: { duration: true },
  });

  const total = entries.reduce((s, e) => s + e.duration, 0);

  return (
    <Link href="/timetracking" style={{ textDecoration: "none" }}>
      <div className="cc-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Clock size={18} style={{ color: "var(--cc-primary, #3b82f6)" }} />
          <span style={{ fontWeight: 600, color: "var(--text)" }}>Horas</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{formatDuration(total)}</div>
        <div style={{ fontSize: 12, color: "#666" }}>
          {entries.length} registos esta semana
        </div>
      </div>
    </Link>
  );
}
