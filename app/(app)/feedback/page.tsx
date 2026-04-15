import Link from "next/link";
import { getTenantDb } from "@/lib/tenant";
import { requireNonClient } from "@/lib/auth/dal";
import { getServerT } from "@/lib/i18n/server";
import { formatDateShort } from "@/lib/utils";
import type { FeedbackSessionStatus } from "@/lib/types";

const STATUS_COLORS: Record<FeedbackSessionStatus, string> = {
  processing: "var(--yellow)",
  ready: "var(--green)",
  reviewed: "var(--accent)",
  archived: "var(--muted)",
};

export default async function FeedbackPage() {
  await requireNonClient();
  const t = await getServerT();
  const db = await getTenantDb();

  const sessions = await db.feedbackSession.findMany({
    include: { project: { select: { name: true, slug: true, color: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">{t("feedback.title")}</div>
        <div className="cc-page-subtitle">{t("feedback.subtitle")}</div>
      </div>

      {sessions.length === 0 && (
        <div className="cc-card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          {t("feedback.empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sessions.map((s) => {
          const status = s.status as FeedbackSessionStatus;
          const color = STATUS_COLORS[status] ?? STATUS_COLORS.processing;
          const label = t(`feedback.status.${status}`);
          return (
            <Link
              key={s.id}
              href={`/feedback/${s.id}`}
              className="cc-card"
              style={{ padding: "14px 18px", textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: s.project.color ?? "#888",
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>{s.project.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    por {s.testerName}
                  </span>
                </div>
                <span style={{ fontSize: "0.78rem", color, fontWeight: 600 }}>
                  {label}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "var(--muted)" }}>
                <span>{formatDateShort(s.createdAt.toISOString())}</span>
                <span>{s.itemsCount} nota{s.itemsCount !== 1 ? "s" : ""}</span>
                {s.durationSeconds && (
                  <span>{Math.round(s.durationSeconds / 60)}min</span>
                )}
                {s.pagesVisited.length > 0 && (
                  <span>{s.pagesVisited.length} página{s.pagesVisited.length !== 1 ? "s" : ""}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
