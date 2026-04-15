"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { OpportunityData, OpportunityStage } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { DealCard } from "./deal-card";

interface Props {
  stageId: OpportunityStage;
  label: string;
  opportunities: OpportunityData[];
  onEditDeal: (opp: OpportunityData) => void;
  onCreateDeal: (stageId: OpportunityStage) => void;
}

export function PipelineColumn({
  stageId,
  label,
  opportunities,
  onEditDeal,
  onCreateDeal,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stageId}` });

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className="cc-kanban-col"
      style={{
        background: isOver ? "rgba(255,255,255,0.04)" : undefined,
        transition: "background 0.15s",
      }}
    >
      <div
        className="cc-kanban-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span>
          {label} <span className="cc-kanban-count">{opportunities.length}</span>
        </span>
        <button
          type="button"
          onClick={() => onCreateDeal(stageId)}
          aria-label={`Novo negócio em ${label}`}
          title={`Novo negócio em ${label}`}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "var(--muted, #999)",
            cursor: "pointer",
            fontSize: "0.85rem",
            padding: "0 6px",
            borderRadius: 4,
            lineHeight: 1.4,
          }}
        >
          +
        </button>
      </div>

      {totalValue > 0 && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--accent, #378ADD)",
            fontWeight: 600,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {formatCurrency(totalValue)}
        </div>
      )}

      <SortableContext
        id={`col:${stageId}`}
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
          {opportunities.map((o) => (
            <DealCard key={o.id} opportunity={o} onEdit={onEditDeal} />
          ))}
          {opportunities.length === 0 && (
            <div
              style={{
                padding: "16px 8px",
                textAlign: "center",
                fontSize: "0.75rem",
                color: "var(--muted, #888)",
                opacity: 0.6,
              }}
            >
              vazio
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
