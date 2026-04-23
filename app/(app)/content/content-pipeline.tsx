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
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ContentItemData, ContentStatus } from "@/lib/types";
import { moveContent } from "@/lib/actions/content-actions";
import { ContentCard } from "./content-card";
import { ContentEditModal } from "./content-edit-modal";

const COLUMNS: { key: ContentStatus; label: string; icon: string }[] = [
  { key: "proposta", label: "Proposta", icon: "💡" },
  { key: "aprovado", label: "Aprovado", icon: "👍" },
  { key: "em_producao", label: "Produção", icon: "🎬" },
  { key: "pronto", label: "Pronto", icon: "✅" },
  { key: "publicado", label: "Publicado", icon: "📢" },
];

interface OptimisticAction {
  id: string;
  toStatus: ContentStatus;
}

type ModalState =
  | { mode: "create"; status: ContentStatus }
  | { mode: "edit"; item: ContentItemData }
  | null;

interface Props {
  items: ContentItemData[];
  projects: { id: string; name: string }[];
}

function ContentColumn({
  status,
  label,
  icon,
  items,
  onEdit,
  onCreate,
}: {
  status: ContentStatus;
  label: string;
  icon: string;
  items: ContentItemData[];
  onEdit: (item: ContentItemData) => void;
  onCreate: (status: ContentStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <div
      ref={setNodeRef}
      className="cc-content-col"
      style={{
        background: isOver ? "rgba(255,255,255,0.04)" : undefined,
        transition: "background 0.15s",
      }}
    >
      <div className="cc-content-col-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {icon} {label} <span className="cc-content-col-count">{items.length}</span>
        </span>
        <button
          type="button"
          onClick={() => onCreate(status)}
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

      <SortableContext
        id={`col:${status}`}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onEdit={onEdit} />
          ))}
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, fontSize: "0.78rem", color: "var(--muted)" }}>
              Vazio
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function ContentPipeline({ items, projects }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    (state: ContentItemData[], action: OptimisticAction): ContentItemData[] =>
      state.map((i) => (i.id === action.id ? { ...i, status: action.toStatus } : i))
  );

  const grouped = useMemo(() => {
    const map = new Map<ContentStatus, ContentItemData[]>();
    for (const c of COLUMNS) map.set(c.key, []);
    for (const item of optimisticItems) {
      const arr = map.get(item.status);
      if (arr) arr.push(item);
    }
    return map;
  }, [optimisticItems]);

  const activeItem = activeId ? optimisticItems.find((i) => i.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const item = optimisticItems.find((i) => i.id === activeIdStr);
    if (!item) return;

    let toStatus: ContentStatus;
    if (overIdStr.startsWith("col:")) {
      toStatus = overIdStr.slice(4) as ContentStatus;
    } else {
      const overItem = optimisticItems.find((i) => i.id === overIdStr);
      if (!overItem) return;
      toStatus = overItem.status;
    }

    if (item.status === toStatus) return;

    startTransition(async () => {
      applyOptimistic({ id: activeIdStr, toStatus });
      const r = await moveContent(activeIdStr, { toStatus });
      if ("error" in r) {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="cc-content-pipeline">
          {COLUMNS.map((col) => (
            <ContentColumn
              key={col.key}
              status={col.key}
              label={col.label}
              icon={col.icon}
              items={grouped.get(col.key) ?? []}
              onEdit={(item) => setModal({ mode: "edit", item })}
              onCreate={(status) => setModal({ mode: "create", status })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && <ContentCard item={activeItem} onEdit={() => {}} ghost />}
        </DragOverlay>
      </DndContext>

      {modal?.mode === "create" && (
        <ContentEditModal
          mode="create"
          initialStatus={modal.status}
          projects={projects}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.mode === "edit" && (
        <ContentEditModal
          mode="edit"
          item={modal.item}
          projects={projects}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
