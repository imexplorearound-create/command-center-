"use client";

import type { TimeEntryData } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--muted)",
  submitted: "var(--accent)",
  approved: "var(--green)",
  rejected: "var(--red)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Submetido",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

interface Props {
  entry: TimeEntryData;
  onClick?: () => void;
}

export function TimeEntryCard({ entry, onClick }: Props) {
  const label = entry.taskTitle ?? entry.projectName ?? "Sem projecto";
  const statusColor = STATUS_COLORS[entry.status] ?? "var(--muted)";

  return (
    <button
      type="button"
      onClick={onClick}
      className="cc-card cc-tt-entry"
      style={{
        width: "100%",
        textAlign: "left",
        cursor: entry.status === "draft" && onClick ? "pointer" : "default",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--card)",
        color: "var(--text)",
        fontSize: "0.82rem",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {entry.isBillable && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--green)",
              flexShrink: 0,
            }}
            title="Facturável"
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
          {formatDuration(entry.duration)}
        </span>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.3,
            color: statusColor,
          }}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </div>
    </button>
  );
}
