"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhaseEditModal, type PhaseFormValues } from "./phase-edit-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deletePhase, reorderPhases } from "@/lib/actions/phase-actions";
import type { PhaseStatus } from "@/lib/validation/project-schema";

export interface PhaseRow {
  id: string;
  name: string;
  status: PhaseStatus;
  progress: number;
  startDate?: string;
  endDate?: string;
}

interface Props {
  projectSlug: string;
  phases: PhaseRow[];
  canEdit: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_curso: "Em curso",
  concluida: "Concluída",
};

export function PhaseListEditable({ projectSlug, phases, canEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticPhases, setOptimisticPhases] = useOptimistic<PhaseRow[], PhaseRow[]>(
    phases,
    (_current, next) => next
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PhaseFormValues | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  function move(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= optimisticPhases.length) return;
    const newOrder = [...optimisticPhases];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];

    startTransition(async () => {
      // Optimistic: cliques rápidos vêem a ordem mais recente, não a stale do servidor
      setOptimisticPhases(newOrder);
      const payload = newOrder.map((p, i) => ({ id: p.id, phaseOrder: i }));
      const result = await reorderPhases(projectSlug, payload);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deletePhase(deleting.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Fase "${deleting.name}" apagada`);
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: 0.5 }}>
          Fases ({optimisticPhases.length})
        </h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "var(--accent-glow, rgba(74,168,136,0.15))",
              color: "var(--accent, #4a8)",
              cursor: "pointer",
              fontSize: "0.74rem",
              fontWeight: 600,
            }}
          >
            + Fase
          </button>
        )}
      </div>

      {optimisticPhases.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Sem fases definidas.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {optimisticPhases.map((phase, idx) => (
            <li
              key={phase.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
              }}
            >
              {canEdit ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || pending}
                    aria-label="Mover para cima"
                    style={arrowBtnStyle(idx === 0 || pending)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === optimisticPhases.length - 1 || pending}
                    aria-label="Mover para baixo"
                    style={arrowBtnStyle(idx === optimisticPhases.length - 1 || pending)}
                  >
                    ▼
                  </button>
                </div>
              ) : (
                <div style={{ width: 16, color: "var(--muted)", fontSize: "0.75rem" }}>{idx + 1}</div>
              )}

              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{phase.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                  {STATUS_LABEL[phase.status] ?? phase.status} · {phase.progress}%
                  {phase.startDate && ` · ${phase.startDate}`}
                  {phase.endDate && ` → ${phase.endDate}`}
                </div>
              </div>

              {canEdit && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: phase.id,
                        name: phase.name,
                        status: phase.status,
                        progress: phase.progress,
                        startDate: phase.startDate,
                        endDate: phase.endDate,
                      })
                    }
                    aria-label="Editar fase"
                    style={iconBtnStyle}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting({ id: phase.id, name: phase.name })}
                    aria-label="Apagar fase"
                    style={iconBtnStyle}
                  >
                    🗑
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <PhaseEditModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        projectSlug={projectSlug}
      />
      {editing && (
        <PhaseEditModal
          open={true}
          onClose={() => setEditing(null)}
          mode="edit"
          projectSlug={projectSlug}
          initial={editing}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Apagar fase"
        message={`Tens a certeza que queres apagar "${deleting?.name ?? ""}"? Esta acção não pode ser desfeita. Bloqueada se houver tasks ligadas.`}
        confirmLabel="Apagar"
        destructive
        loading={pending}
      />
    </div>
  );
}

function arrowBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color: disabled ? "rgba(255,255,255,0.15)" : "var(--muted, #999)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.65rem",
    padding: "2px 4px",
    lineHeight: 1,
  };
}

const iconBtnStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
  color: "var(--muted, #999)",
  cursor: "pointer",
  fontSize: "0.78rem",
};
