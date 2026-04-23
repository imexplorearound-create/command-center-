"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskData, TaskStatus } from "@/lib/types";
import { KanbanTaskCard } from "./task-card";

interface Props {
  status: TaskStatus;
  label: string;
  tasks: TaskData[];
  canWrite: boolean;
  onEditTask: (task: TaskData) => void;
  onCreateTask: (status: TaskStatus) => void;
}

export function KanbanColumn({ status, label, tasks, canWrite, onEditTask, onCreateTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

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
          {label} <span className="cc-kanban-count">{tasks.length}</span>
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={() => onCreateTask(status)}
            aria-label={`Nova tarefa em ${label}`}
            title={`Nova tarefa em ${label}`}
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
        )}
      </div>

      <SortableContext
        id={`col:${status}`}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
          {tasks.map((t) => (
            <KanbanTaskCard key={t.id} task={t} canWrite={canWrite} onEdit={onEditTask} />
          ))}
          {tasks.length === 0 && (
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
