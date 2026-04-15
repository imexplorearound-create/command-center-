"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { createPhase, updatePhase } from "@/lib/actions/phase-actions";
import type { PhaseStatus } from "@/lib/validation/project-schema";
import {
  formLabelStyle as labelStyle,
  formInputStyle as inputStyle,
  formRowStyle as rowStyle,
  formTwoColStyle as twoColStyle,
} from "@/components/shared/form-styles";

export interface PhaseFormValues {
  id?: string;
  name?: string;
  description?: string;
  status?: PhaseStatus;
  progress?: number;
  startDate?: string;
  endDate?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  projectSlug: string;
  initial?: PhaseFormValues;
}

export function PhaseEditModal({ open, onClose, mode, projectSlug, initial }: Props) {
  const router = useRouter();
  const action = mode === "create" ? createPhase : updatePhase;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) {
      toast.error(state.error);
      return;
    }
    if (state.success) {
      toast.success(mode === "create" ? "Fase criada" : "Fase actualizada");
      onClose();
      router.refresh();
    }
  }, [state, mode, onClose, router]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nova Fase" : "Editar Fase"}
      width={480}
    >
      <form action={formAction}>
        {mode === "create" ? (
          <input type="hidden" name="projectSlug" value={projectSlug} />
        ) : (
          <input type="hidden" name="id" value={initial?.id ?? ""} />
        )}

        <div style={rowStyle}>
          <label style={labelStyle} htmlFor="phase-name">Nome *</label>
          <input
            id="phase-name"
            name="name"
            required
            maxLength={200}
            defaultValue={initial?.name ?? ""}
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle} htmlFor="phase-description">Descrição</label>
          <textarea
            id="phase-description"
            name="description"
            maxLength={2000}
            rows={2}
            defaultValue={initial?.description ?? ""}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ ...rowStyle, ...twoColStyle }}>
          <div>
            <label style={labelStyle} htmlFor="phase-status">Estado</label>
            <select
              id="phase-status"
              name="status"
              defaultValue={initial?.status ?? "pendente"}
              style={inputStyle}
            >
              <option value="pendente">Pendente</option>
              <option value="em_curso">Em curso</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="phase-progress">Progresso (%)</label>
            <input
              id="phase-progress"
              name="progress"
              type="number"
              min={0}
              max={100}
              defaultValue={initial?.progress ?? 0}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ ...rowStyle, ...twoColStyle }}>
          <div>
            <label style={labelStyle} htmlFor="phase-start">Início</label>
            <input
              id="phase-start"
              name="startDate"
              type="date"
              defaultValue={initial?.startDate ?? ""}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="phase-end">Fim</label>
            <input
              id="phase-end"
              name="endDate"
              type="date"
              defaultValue={initial?.endDate ?? ""}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "var(--text, #fff)",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent, #4a8)",
              color: "#fff",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "A guardar..." : mode === "create" ? "Criar" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
