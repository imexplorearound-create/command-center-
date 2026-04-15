"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OpportunityData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  opportunity: OpportunityData;
  onEdit: (opp: OpportunityData) => void;
  ghost?: boolean;
}

export function DealCard({ opportunity, onEdit, ghost = false }: Props) {
  const sortable = useSortable({ id: opportunity.id, disabled: ghost });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: ghost ? "grabbing" : "grab",
  };

  function handleClick(e: React.MouseEvent) {
    if (isDragging) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    onEdit(opportunity);
  }

  const ownerInitial = opportunity.ownerName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cc-task-card"
      onClick={handleClick}
      {...(!ghost ? attributes : {})}
      {...(!ghost ? listeners : {})}
    >
      {/* Title */}
      <div className="cc-task-name" style={{ marginBottom: 6 }}>
        {opportunity.title}
      </div>

      {/* Company */}
      {opportunity.companyName && (
        <div style={{ fontSize: "0.75rem", color: "var(--muted, #888)", marginBottom: 8 }}>
          {opportunity.companyName}
        </div>
      )}

      {/* Bottom row */}
      <div className="cc-task-bottom">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            className="cc-task-avatar"
            style={{ backgroundColor: opportunity.ownerColor || "#6366f1" }}
          >
            {ownerInitial}
          </div>
          {opportunity.value != null && (
            <span style={{ fontWeight: 600, color: "var(--text, #eee)", fontSize: "0.78rem" }}>
              {formatCurrency(opportunity.value)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {opportunity.daysInStage > 0 && (
            <span className="cc-deal-days-badge">
              {opportunity.daysInStage}d
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
