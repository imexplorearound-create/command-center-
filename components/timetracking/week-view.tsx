"use client";

import { useState } from "react";
import type { WeekSummary, TimeEntryData } from "@/lib/types";
import { TimeEntryCard } from "./time-entry-card";
import { TimeEntryModal } from "./time-entry-modal";
import { formatDuration } from "@/lib/utils";

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  summary: WeekSummary;
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; projectId: string | null }[];
}

export function WeekView({ summary, projects, tasks }: Props) {
  const [modalEntry, setModalEntry] = useState<TimeEntryData | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);

  const billablePct =
    summary.weekTotal > 0
      ? Math.round((summary.billableMinutes / summary.weekTotal) * 100)
      : 0;

  const contractedMinutes = summary.contractedHours * 60;
  const progressPct = contractedMinutes > 0
    ? Math.min(100, Math.round((summary.weekTotal / contractedMinutes) * 100))
    : 0;

  return (
    <>
      {/* Week summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          marginBottom: 18,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
            {formatDuration(summary.weekTotal)}
          </span>
          <div className="cc-progress-bar" style={{ flex: 1, maxWidth: 200 }}>
            <div
              className="cc-progress-fill"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct > 100
                    ? "var(--red)"
                    : progressPct > 80
                      ? "var(--green)"
                      : "var(--accent)",
              }}
            />
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {summary.contractedHours}h
          </span>
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          {billablePct}% facturável
        </span>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Registar
        </button>
      </div>

      {/* Week grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {summary.days.map((day, i) => {
          const dateObj = new Date(day.date + "T00:00:00");
          const dayNum = dateObj.getDate();
          const isToday = day.date === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={day.date}
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 140,
                background: isToday ? "var(--accent-glow)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}
            >
              {/* Day header */}
              <div
                style={{
                  padding: "8px 10px 6px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: isToday ? "var(--accent)" : "var(--muted)",
                    letterSpacing: 0.5,
                  }}
                >
                  {DAY_NAMES[i]}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: isToday ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {dayNum}
                </span>
              </div>

              {/* Entries */}
              <div
                style={{
                  flex: 1,
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {day.entries.length === 0 && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      textAlign: "center",
                      marginTop: 16,
                    }}
                  >
                    --
                  </span>
                )}
                {day.entries.map((entry) => (
                  <TimeEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={
                      entry.status === "draft"
                        ? () => setModalEntry(entry)
                        : undefined
                    }
                  />
                ))}
              </div>

              {/* Day total */}
              {day.totalMinutes > 0 && (
                <div
                  style={{
                    padding: "6px 10px",
                    borderTop: "1px solid var(--border)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  {formatDuration(day.totalMinutes)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {modalEntry && (
        <TimeEntryModal
          entry={modalEntry}
          projects={projects}
          tasks={tasks}
          onClose={() => setModalEntry(undefined)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <TimeEntryModal
          projects={projects}
          tasks={tasks}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
