import Link from "next/link";
import { getTenantDb } from "@/lib/tenant";
import { requireNonClient } from "@/lib/auth/dal";
import { getServerT } from "@/lib/i18n/server";
import { formatDateShort } from "@/lib/utils";
import type { FeedbackSessionStatus } from "@/lib/types";
import { SessionActions } from "./session-actions";
import { PageHeader } from "@/components/layout/page-header";
import { FEEDBACK_STATUS_COLOR } from "@/lib/dashboard-helpers";

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
    <PageHeader
      kicker="Feedback · Testers"
      title={t("feedback.title")}
      subtitle={t("feedback.subtitle")}
      actions={
        <Link
          href={showArchived ? "/feedback" : "/feedback?archived=1"}
          className="mono"
          style={{ textDecoration: "none" }}
        >
          {t(showArchived ? "feedback.hide_archived" : "feedback.show_archived")}
        </Link>
      }
    >
      {sessions.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          {t("feedback.empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...groups.values()].map(({ project, sessions: projectSessions }) => (
          <details key={project.id} open style={{ borderRadius: "var(--radius-card)" }}>
            <summary
              className="card"
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
                  backgroundColor: project.color ?? "var(--muted)",
                }}
              />
              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 16 }}>{project.name}</span>
              <span className="meta">
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
                const color = FEEDBACK_STATUS_COLOR[status] ?? FEEDBACK_STATUS_COLOR.processing;
                const label = t(`feedback.status.${status}`);
                return (
                  <div
                    key={s.id}
                    className="card"
                    style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <Link
                      href={`/feedback/${s.id}`}
                      style={{ flex: 1, textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span className="meta">por {s.testerName}</span>
                        <span className="meta" style={{ color, fontWeight: 600 }}>{label}</span>
                      </div>
                      <div className="meta" style={{ display: "flex", gap: 14 }}>
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
    </PageHeader>
  );
}
