"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { BriefingListItem } from "@/lib/queries";
import { markBriefingAsRead } from "@/lib/actions/briefing-actions";
import { renderBriefingMarkdown } from "./render-briefing-markdown";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  delivered: { label: "entregue", color: "var(--green, #16a34a)" },
  pending: { label: "pendente", color: "var(--muted)" },
  failed: { label: "falhou", color: "var(--red, #dc2626)" },
  skipped_existing: { label: "duplicado", color: "var(--muted)" },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "📧 email",
  telegram: "✈️ telegram",
  whatsapp: "💬 whatsapp",
  inapp: "🪟 in-app",
};

const DATE_FMT = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

function formatDate(d: Date | string): string {
  return DATE_FMT.format(typeof d === "string" ? new Date(d) : d);
}

export function BriefingList({ briefings }: { briefings: BriefingListItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (briefings.length === 0) {
    return (
      <div className="cc-card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        Ainda não há briefings. O cron diário começa a gerá-los automaticamente. Podes
        forçar um agora com o botão acima.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {briefings.map((b) => {
        const isExpanded = expandedId === b.id;
        const status = STATUS_LABELS[b.status] ?? { label: b.status, color: "var(--muted)" };
        const isUnread = b.status === "delivered" && !b.readAt;
        return (
          <div
            key={b.id}
            className="cc-card"
            style={{
              padding: 14,
              borderLeft: isUnread ? "3px solid var(--accent, #3b82f6)" : "3px solid transparent",
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : b.id)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                width: "100%",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{formatDate(b.briefingDate)}</span>
                  <span style={{ fontSize: "0.7rem", color: status.color, fontWeight: 600 }}>
                    {status.label}
                  </span>
                  {b.channel && (
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {CHANNEL_LABELS[b.channel] ?? b.channel}
                    </span>
                  )}
                  {isUnread && (
                    <span style={{
                      fontSize: "0.65rem",
                      background: "var(--accent, #3b82f6)",
                      color: "#fff",
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}>
                      NOVO
                    </span>
                  )}
                </div>
                {!isExpanded && (
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.excerpt || "(sem resumo)"}
                  </div>
                )}
              </div>
              <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                {isExpanded ? "▲" : "▼"}
              </span>
            </button>

            {isExpanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #e5e7eb)" }}>
                {b.errorMessage ? (
                  <div style={{ color: "var(--red, #dc2626)", fontSize: "0.85rem" }}>
                    Falhou: {b.errorMessage}
                  </div>
                ) : (
                  <div className="cc-briefing-content">{renderBriefingMarkdown(b.content)}</div>
                )}
                {isUnread && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="cc-btn"
                      onClick={() => {
                        startTransition(async () => {
                          const r = await markBriefingAsRead(b.id);
                          if ("error" in r) toast.error(r.error);
                          else toast.success("Briefing marcado como lido");
                        });
                      }}
                    >
                      Marcar como lido
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
