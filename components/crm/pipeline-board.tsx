"use client";

import { useState, useOptimistic, startTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { OpportunityData, OpportunityStage } from "@/lib/types";
import { OPPORTUNITY_STAGE_OPTIONS } from "@/lib/validation/opportunity-schema";
import { moveOpportunity } from "@/lib/actions/opportunity-actions";
import { PipelineColumn } from "./pipeline-column";
import { DealCard } from "./deal-card";
import { DealEditModal } from "./deal-edit-modal";
import {
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";

interface OptimisticAction {
  id: string;
  toStage: OpportunityStage;
  toIndex: number;
}

type ModalState =
  | { mode: "create"; stageId: OpportunityStage }
  | { mode: "edit"; opportunity: OpportunityData }
  | null;

interface Props {
  opportunities: OpportunityData[];
  people: { id: string; name: string; avatarColor: string | null }[];
}

export function PipelineBoard({ opportunities, people }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [optimisticOpps, applyOptimistic] = useOptimistic(
    opportunities,
    (state: OpportunityData[], action: OptimisticAction): OpportunityData[] => {
      const moved = state.find((o) => o.id === action.id);
      if (!moved) return state;
      const updated: OpportunityData = { ...moved, stageId: action.toStage };
      const others = state.filter((o) => o.id !== action.id);
      const targetCol = others.filter((o) => o.stageId === action.toStage);
      const restCols = others.filter((o) => o.stageId !== action.toStage);
      const safeIndex = Math.min(Math.max(action.toIndex, 0), targetCol.length);
      targetCol.splice(safeIndex, 0, updated);
      return [...restCols, ...targetCol];
    }
  );

  const grouped = useMemo(() => {
    const map = new Map<OpportunityStage, OpportunityData[]>();
    for (const c of OPPORTUNITY_STAGE_OPTIONS) map.set(c.value, []);
    for (const o of optimisticOpps) {
      const arr = map.get(o.stageId);
      if (arr) arr.push(o);
    }
    return map;
  }, [optimisticOpps]);

  const activeDeal = activeId
    ? optimisticOpps.find((o) => o.id === activeId) ?? null
    : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeOpp = optimisticOpps.find((o) => o.id === activeIdStr);
    if (!activeOpp) return;

    let toStage: OpportunityStage;
    let toIndex: number;

    if (overIdStr.startsWith("col:")) {
      toStage = overIdStr.slice(4) as OpportunityStage;
      const colOpps = grouped.get(toStage) ?? [];
      toIndex = colOpps.filter((o) => o.id !== activeIdStr).length;
    } else {
      const overOpp = optimisticOpps.find((o) => o.id === overIdStr);
      if (!overOpp) return;
      toStage = overOpp.stageId;
      const colOpps = grouped.get(toStage) ?? [];
      const overIndex = colOpps.findIndex((o) => o.id === overIdStr);
      toIndex = overIndex < 0 ? colOpps.length : overIndex;
    }

    const sameStage = activeOpp.stageId === toStage;
    const colOpps = grouped.get(toStage) ?? [];
    const currentIndex = colOpps.findIndex((o) => o.id === activeIdStr);
    if (sameStage && currentIndex === toIndex) return;

    startTransition(async () => {
      applyOptimistic({ id: activeIdStr, toStage, toIndex });
      const r = await moveOpportunity(activeIdStr, toStage, toIndex);
      if ("error" in r) {
        toast.error(r.error);
      }
    });
  }

  function handleEdit(opp: OpportunityData) {
    setModal({ mode: "edit", opportunity: opp });
  }

  function handleCreate(stageId: OpportunityStage) {
    setModal({ mode: "create", stageId });
  }

  const closeModal = () => setModal(null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => handleCreate("contacto_inicial")}
          style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
        >
          + Novo negócio
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="cc-kanban"
          style={{ gridTemplateColumns: `repeat(${OPPORTUNITY_STAGE_OPTIONS.length}, 1fr)` }}
        >
          {OPPORTUNITY_STAGE_OPTIONS.map((col) => (
            <PipelineColumn
              key={col.value}
              stageId={col.value}
              label={col.label}
              opportunities={grouped.get(col.value) ?? []}
              onEditDeal={handleEdit}
              onCreateDeal={handleCreate}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && <DealCard opportunity={activeDeal} onEdit={() => {}} ghost />}
        </DragOverlay>
      </DndContext>

      {modal?.mode === "edit" && (
        <DealEditModal
          mode="edit"
          opportunity={modal.opportunity}
          people={people}
          onClose={closeModal}
        />
      )}

      {modal?.mode === "create" && (
        <DealEditModal
          mode="create"
          initialStageId={modal.stageId}
          people={people}
          onClose={closeModal}
        />
      )}
    </>
  );
}
