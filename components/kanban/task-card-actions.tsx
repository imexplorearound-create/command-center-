"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { TaskData } from "@/lib/types";
import { confirmValidation, rejectValidation } from "@/lib/actions/validation";

export function TaskCardActions({ task }: { task: TaskData }) {
  const [pending, startTransition] = useTransition();

  function act(action: "confirmar" | "rejeitar") {
    startTransition(async () => {
      const r = action === "confirmar"
        ? await confirmValidation(task.id)
        : await rejectValidation(task.id);
      if ("error" in r) {
        toast.error(r.error);
      } else {
        toast.success(action === "confirmar" ? "Tarefa confirmada" : "Tarefa rejeitada");
      }
    });
  }

  return (
    <div
      data-no-drag
      style={{
        display: "flex",
        gap: 6,
        marginTop: 8,
        paddingTop: 8,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => act("confirmar")}
        title="Confirmar"
        style={btn("var(--green, #16a34a)")}
      >
        ✓ Confirmar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act("rejeitar")}
        title="Rejeitar"
        style={btn("var(--red, #dc2626)")}
      >
        ✗ Rejeitar
      </button>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    flex: 1,
    fontSize: "0.72rem",
    padding: "4px 8px",
    background: "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 4,
    cursor: "pointer",
  };
}
