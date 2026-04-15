import Link from "next/link";
import { getTenantDb } from "@/lib/tenant";
import { requireNonClient } from "@/lib/auth/dal";
import { getServerT } from "@/lib/i18n/server";
import { formatDateShort } from "@/lib/utils";
import type { FeedbackSessionStatus } from "@/lib/types";
import { SessionActions } from "./session-actions";

const STATUS_COLORS: Record<FeedbackSessionStatus, string> = {
  processing: "var(--yellow)",
  ready: "var(--green)",
  reviewed: "var(--accent)",
  archived: "var(--muted)",
};

interface SearchParams {
  archived?: string;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireNonClient();
  const t = await getServerT();
  const db = await getTenantDb();
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const sessions = await db.feedbackSession.findMany({
    where: showArchived ? { archivedAt: { not: null } } : { archivedAt: null },
    include: { project: { select: { id: true, name: true, slug: true, color: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const groups = new Map<
    string,
    { project: (typeof sessions)[number]["project"]; sessions: typeof sessions }
  >();
  for (const s of sessions) {
    const g = groups.get(s.project.id);
    if (g) g.sessions.push(s);
    else groups.set(s.project.id, { project: s.project, sessions: [s] });
  }

  return (
    <>
      <div className="cc-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="cc-page-title">{t("feedback.title")}</div>
            <div className="cc-page-subtitle">{t("feedback.subtitle")}</div>
          </div>
          <Link
            href={showArchived ? "/feedback" : "/feedback?archived=1"}
            style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}
          >
            {t(showArchived ? "feedback.hide_archived" : "feedback.show_archived")}
          </Link>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="cc-card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          {t("feedback.empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...groups.values()].map(({ project, sessions: projectSessions }) => (
          <details key={project.id} open style={{ borderRadius: 8 }}>
            <summary
              className="cc-card"
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                listStyle: "none",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: project.color ?? "#888",
                }}
              />
              <span style={{ fontWeight: 600 }}>{project.name}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                {t(
                  projectSessions.length === 1
                    ? "feedback.group_count_one"
                    : "feedback.group_count_many",
                  { count: projectSessions.length }
                )}
              </span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, paddingLeft: 12 }}>
              {projectSessions.map((s) => {
                const status = s.status as FeedbackSessionStatus;
                const color = STATUS_COLORS[status] ?? STATUS_COLORS.processing;
                const label = t(`feedback.status.${status}`);
                return (
                  <div
                    key={s.id}
                    className="cc-card"
                    style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <Link
                      href={`/feedback/${s.id}`}
                      style={{ flex: 1, textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                          por {s.testerName}
                        </span>
                        <span style={{ fontSize: "0.78rem", color, fontWeight: 600 }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: "0.8rem", color: "var(--muted)" }}>
                        <span>{formatDateShort(s.createdAt.toISOString())}</span>
                        <span>{s.itemsCount} nota{s.itemsCount !== 1 ? "s" : ""}</span>
                        {s.durationSeconds && <span>{Math.round(s.durationSeconds / 60)}min</span>}
                        {s.pagesVisited.length > 0 && (
                          <span>{s.pagesVisited.length} página{s.pagesVisited.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </Link>
                    <SessionActions sessionId={s.id} archived={s.archivedAt != null} />
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
