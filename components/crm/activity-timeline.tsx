"use client";

import { useState } from "react";
import type { OpportunityActivityData } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ActivityModal } from "./activity-modal";
import {
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";

interface Props {
  activities: OpportunityActivityData[];
  opportunityId: string;
}

const TYPE_ICONS: Record<string, string> = {
  note: "\uD83D\uDCDD",
  call: "\uD83D\uDCDE",
  email: "\uD83D\uDCE7",
  meeting: "\uD83E\uDD1D",
  task: "\u2705",
};

const TYPE_LABELS: Record<string, string> = {
  note: "Nota",
  call: "Chamada",
  email: "Email",
  meeting: "Reunião",
  task: "Tarefa",
};

export function ActivityTimeline({ activities, opportunityId }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Actividades</h3>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{ ...formButtonStyle, ...formButtonPrimaryStyle, fontSize: "0.78rem", padding: "5px 12px" }}
        >
          + Actividade
        </button>
      </div>

      {activities.length === 0 && (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--muted, #888)",
          }}
        >
          Sem actividades registadas
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {activities.map((a, idx) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 0",
              borderBottom:
                idx < activities.length - 1
                  ? "1px solid rgba(255,255,255,0.06)"
                  : undefined,
            }}
          >
            {/* Timeline dot + line */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 32,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{TYPE_ICONS[a.type] ?? "\uD83D\uDCDD"}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.title}</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--muted, #888)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(a.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted, #999)", marginBottom: 4 }}>
                {TYPE_LABELS[a.type] ?? a.type}
                {a.createdByName && <> &middot; {a.createdByName}</>}
              </div>
              {a.description && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary, #ccc)",
                    lineHeight: 1.5,
                  }}
                >
                  {a.description}
                </div>
              )}
              {a.scheduledAt && (
                <div style={{ fontSize: "0.72rem", color: "var(--accent, #378ADD)", marginTop: 4 }}>
                  Agendado: {formatDate(a.scheduledAt)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ActivityModal
          opportunityId={opportunityId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
