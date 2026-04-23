import Link from "next/link";
import type { ProjectData } from "@/lib/types";
import { HEALTH_COLOR } from "@/lib/dashboard-helpers";

type Props = {
  projects: ProjectData[];
};

export function ProjectsStrip({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <section style={{ padding: "12px 0 24px" }}>
        <h2 className="h3" style={{ fontFamily: "var(--font-serif)", marginBottom: 12 }}>
          Projectos em voo
        </h2>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
          Sem projectos activos.
        </p>
      </section>
    );
  }

  return (
    <section style={{ padding: "12px 0 24px" }}>
      <h2 className="h3" style={{ fontFamily: "var(--font-serif)", marginBottom: 12 }}>
        Projectos em voo
      </h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "thin",
        }}
      >
        {projects.map((p) => {
          const color = HEALTH_COLOR[p.health] ?? "var(--muted)";
          return (
            <Link
              key={p.id}
              href={`/project/${p.slug}`}
              style={{
                flex: "0 0 220px",
                textDecoration: "none",
                background: "var(--bg-2)",
                borderTop: `2px solid ${color}`,
                border: "1px solid var(--line)",
                borderTopWidth: 2,
                borderRadius: "var(--radius-card)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 120,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {p.name}
              </span>
              {p.activePhase ? (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    color: "var(--muted)",
                  }}
                >
                  {p.activePhase}
                </span>
              ) : null}

              <div style={{ flex: 1 }} />

              <div
                aria-hidden
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "var(--line-2)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: `${p.progress}%`, background: color }} />
              </div>

              <span
                className="mono"
                style={{ color: "var(--muted)", fontSize: 9 }}
              >
                {p.progress}% · {p.activeTasks} tasks
                {p.overdueTasks > 0 ? ` · ${p.overdueTasks} atrasadas` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
