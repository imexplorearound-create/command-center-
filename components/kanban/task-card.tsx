"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskData } from "@/lib/types";
import { priorityColor, formatDateShort } from "@/lib/utils";
import { TaskCardActions } from "./task-card-actions";

interface Props {
  task: TaskData;
  canWrite: boolean;
  onEdit: (task: TaskData) => void;
  /**
   * Quando true, o cartão é apenas um placeholder visual (drag overlay).
   * Não tem listeners do useSortable e ignora cliques.
   */
  ghost?: boolean;
}

export function KanbanTaskCard({ task, canWrite, onEdit, ghost = false }: Props) {
  const sortable = useSortable({ id: task.id, disabled: !canWrite || ghost });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const isStale = (task.daysStale ?? 0) >= 2;
  const isAi = task.aiExtracted;
  const isPending = task.validationStatus === "por_confirmar";

  let cardClass = "cc-task-card";
  if (isStale) cardClass += " cc-task-card-stale";
  if (isAi) cardClass += " cc-task-card-ai";
  if (isPending) cardClass += " cc-task-card-pending";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: canWrite ? "grab" : "default",
    borderLeft: isPending ? "3px solid var(--yellow, #f59e0b)" : undefined,
  };

  function handleClick(e: React.MouseEvent) {
    // Não abrir modal durante drag
    if (isDragging) return;
    // Não disparar quando clica em botões internos (validation actions)
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    onEdit(task);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
      onClick={handleClick}
      {...(canWrite && !ghost ? attributes : {})}
      {...(canWrite && !ghost ? listeners : {})}
    >
      <div className="cc-task-title-row">
        <div className="cc-task-prio" style={{ backgroundColor: priorityColor(task.priority) }} />
        <div className="cc-task-name">{task.title}</div>
      </div>

      <div className="cc-task-bottom">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="cc-task-avatar" style={{ backgroundColor: task.assigneeColor }}>
            {task.assignee.charAt(0)}
          </div>
          <span>@{task.assignee}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.origin && <span className="cc-task-origin">{task.origin}</span>}
          {isAi && (
            <span className="cc-task-ai-badge" title="Extraída por AI">
              🤖 {Math.round((task.aiConfidence ?? 0) * 100)}%
            </span>
          )}
          {task.deadline && (
            <span
              className="cc-task-deadline"
              style={{ color: isStale ? "var(--red)" : "var(--muted)" }}
            >
              {isStale && "⚠️ "}
              {formatDateShort(task.deadline)}
            </span>
          )}
          {isStale && <span className="cc-task-stale-badge">parada {task.daysStale}d</span>}
        </div>
      </div>

      {isPending && canWrite && <TaskCardActions task={task} />}
    </div>
  );
}
