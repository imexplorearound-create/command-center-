"use client";

import type { RoadmapItem } from "@/lib/types";

const YEAR_START = new Date("2026-01-01").getTime();
const YEAR_END = new Date("2026-12-31").getTime();
const YEAR_SPAN = YEAR_END - YEAR_START;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function dateToPct(d: string): number {
  const t = new Date(d).getTime();
  return Math.max(0, Math.min(100, ((t - YEAR_START) / YEAR_SPAN) * 100));
}

function todayPct(): number {
  return dateToPct(new Date().toISOString().split("T")[0]);
}

export function RoadmapView({ items }: { items: RoadmapItem[] }) {
  // Group by project
  const grouped = new Map<string, RoadmapItem[]>();
  for (const item of items) {
    const key = item.project ?? "Global";
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  const today = todayPct();

  return (
    <div className="cc-card" style={{ padding: "20px 24px", overflowX: "auto" }}>
      {/* Month header */}
      <div style={{ display: "flex", position: "relative", marginBottom: 16, paddingLeft: 140 }}>
        {MONTHS.map((m, i) => (
          <div
            key={m}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.72rem",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              padding: "4px 0",
              fontWeight: new Date().getMonth() === i ? 700 : 400,
              color: new Date().getMonth() === i ? "var(--text)" : "var(--muted)",
            }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Rows by project */}
      {Array.from(grouped.entries()).map(([project, projectItems]) => (
        <div key={project} style={{ marginBottom: 20 }}>
          {/* Project label */}
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: projectItems[0]?.projectColor ?? "var(--text)" }}>
            {project}
          </div>

          {/* Items */}
          {projectItems.map((item) => (
            <RoadmapRow key={item.id} item={item} today={today} />
          ))}
        </div>
      ))}

      {/* Today line */}
      <div style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `calc(140px + ${today}% * (100% - 140px) / 100)`,
        width: 2,
        backgroundColor: "var(--red)",
        opacity: 0.5,
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          Sem items no roadmap
        </div>
      )}
    </div>
  );
}

function RoadmapRow({ item, today }: { item: RoadmapItem; today: number }) {
  const left = dateToPct(item.startDate);
  const right = dateToPct(item.endDate);
  const width = Math.max(right - left, 0.5);

  const isObjective = item.type === "objective";
  const isKr = item.type === "key_result";
  const height = isObjective || isKr ? 20 : 24;

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 4, height: height + 8 }}>
      {/* Label */}
      <div style={{
        width: 140,
        flexShrink: 0,
        fontSize: isKr ? "0.7rem" : "0.75rem",
        color: "var(--muted)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        paddingLeft: isKr ? 12 : isObjective ? 4 : 0,
      }}>
        {isObjective && "◆ "}{isKr && "◇ "}{item.title}
      </div>

      {/* Bar area */}
      <div style={{ flex: 1, position: "relative", height }}>
        {/* Track */}
        <div style={{
          position: "absolute",
          left: `${left}%`,
          width: `${width}%`,
          top: 0,
          bottom: 0,
          borderRadius: isObjective || isKr ? 3 : 4,
          backgroundColor: isObjective || isKr
            ? `${item.projectColor ?? "#f97316"}30`
            : `${item.projectColor ?? "#888"}20`,
          border: isObjective || isKr
            ? `1px solid ${item.projectColor ?? "#f97316"}50`
            : "none",
        }}>
          {/* Fill */}
          <div style={{
            height: "100%",
            width: `${Math.min(item.progress, 100)}%`,
            backgroundColor: item.projectColor ?? "#888",
            opacity: 0.6,
            borderRadius: "inherit",
          }} />
        </div>

        {/* Progress label */}
        {item.progress > 0 && (
          <div style={{
            position: "absolute",
            left: `${left + width + 0.5}%`,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "0.65rem",
            color: "var(--muted)",
          }}>
            {item.progress}%
          </div>
        )}
      </div>
    </div>
  );
}
