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
import type { TaskData, TaskStatus, PersonOption, AreaOption, PhaseData } from "@/lib/types";
import { TASK_STATUS_OPTIONS } from "@/lib/validation/task-schema";
import { moveTask } from "@/lib/actions/task-actions";
import { KanbanColumn } from "./kanban-column";
import { KanbanTaskCard } from "./task-card";
import { TaskEditModal } from "./task-edit-modal";

interface OptimisticAction {
  id: string;
  toStatus: TaskStatus;
  toIndex: number;
}

type ModalState =
  | { mode: "create"; status: TaskStatus }
  | { mode: "edit"; task: TaskData }
  | null;

interface Props {
  tasks: TaskData[];
  projectId: string;
  projectSlug: string;
  phases: PhaseData[];
  people: PersonOption[];
  areas: AreaOption[];
  canWrite: boolean;
}

export function KanbanBoard({
  tasks,
  projectId,
  projectSlug,
  phases,
  people,
  areas,
  canWrite,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [optimisticTasks, applyOptimistic] = useOptimistic(
    tasks,
    (state: TaskData[], action: OptimisticAction): TaskData[] => {
      const moved = state.find((t) => t.id === action.id);
      if (!moved) return state;
      const updated: TaskData = { ...moved, status: action.toStatus };
      const others = state.filter((t) => t.id !== action.id);
      const targetCol = others.filter((t) => t.status === action.toStatus);
      const restCols = others.filter((t) => t.status !== action.toStatus);
      const safeIndex = Math.min(Math.max(action.toIndex, 0), targetCol.length);
      targetCol.splice(safeIndex, 0, updated);
      return [...restCols, ...targetCol];
    }
  );

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, TaskData[]>();
    for (const c of TASK_STATUS_OPTIONS) map.set(c.value, []);
    for (const t of optimisticTasks) {
      const arr = map.get(t.status as TaskStatus);
      if (arr) arr.push(t);
    }
    return map;
  }, [optimisticTasks]);

  const activeTask = activeId ? optimisticTasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeTask = optimisticTasks.find((t) => t.id === activeIdStr);
    if (!activeTask) return;

    // Determinar coluna destino e índice
    let toStatus: TaskStatus;
    let toIndex: number;

    if (overIdStr.startsWith("col:")) {
      // Drop directo numa coluna (vazia ou no fim)
      toStatus = overIdStr.slice(4) as TaskStatus;
      const colTasks = grouped.get(toStatus) ?? [];
      toIndex = colTasks.filter((t) => t.id !== activeIdStr).length;
    } else {
      // Drop em cima de outra task
      const overTask = optimisticTasks.find((t) => t.id === overIdStr);
      if (!overTask) return;
      toStatus = overTask.status as TaskStatus;
      const colTasks = grouped.get(toStatus) ?? [];
      const overIndex = colTasks.findIndex((t) => t.id === overIdStr);
      toIndex = overIndex < 0 ? colTasks.length : overIndex;
    }

    // Sem alterações?
    const sameStatus = activeTask.status === toStatus;
    const colTasks = grouped.get(toStatus) ?? [];
    const currentIndex = colTasks.findIndex((t) => t.id === activeIdStr);
    if (sameStatus && currentIndex === toIndex) return;

    startTransition(async () => {
      applyOptimistic({ id: activeIdStr, toStatus, toIndex });
      const r = await moveTask(activeIdStr, { toStatus, toIndex });
      if ("error" in r) {
        toast.error(r.error);
      }
    });
  }

  function handleEdit(task: TaskData) {
    if (!canWrite) return;
    setModal({ mode: "edit", task });
  }

  function handleCreate(status: TaskStatus) {
    setModal({ mode: "create", status });
  }

  const closeModal = () => setModal(null);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="cc-kanban"
          style={{ gridTemplateColumns: `repeat(${TASK_STATUS_OPTIONS.length}, 1fr)` }}
        >
          {TASK_STATUS_OPTIONS.map((col) => (
            <KanbanColumn
              key={col.value}
              status={col.value}
              label={col.label}
              tasks={grouped.get(col.value) ?? []}
              canWrite={canWrite}
              onEditTask={handleEdit}
              onCreateTask={handleCreate}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <KanbanTaskCard task={activeTask} canWrite={false} onEdit={() => {}} ghost />
          )}
        </DragOverlay>
      </DndContext>

      {modal?.mode === "edit" && (
        <TaskEditModal
          mode="edit"
          task={modal.task}
          projectId={projectId}
          projectSlug={projectSlug}
          phases={phases}
          people={people}
          areas={areas}
          onClose={closeModal}
        />
      )}

      {modal?.mode === "create" && (
        <TaskEditModal
          mode="create"
          initialStatus={modal.status}
          projectId={projectId}
          projectSlug={projectSlug}
          phases={phases}
          people={people}
          areas={areas}
          onClose={closeModal}
        />
      )}
    </>
  );
}
