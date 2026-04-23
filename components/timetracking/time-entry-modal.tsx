"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
  formButtonDangerStyle,
} from "@/components/shared/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { TimeEntryData } from "@/lib/types";
import {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "@/lib/actions/timeentry-actions";

interface Props {
  entry?: TimeEntryData;
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; projectId: string | null }[];
  onClose: () => void;
}

export function TimeEntryModal({ entry, projects, tasks, onClose }: Props) {
  const isEdit = !!entry;
  const action = isEdit
    ? updateTimeEntry
    : (createTimeEntry as typeof updateTimeEntry);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [selectedProject, setSelectedProject] = useState<string>(
    entry?.projectId ?? ""
  );
  const [showDelete, setShowDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(entry?.duration ?? 0);
  const hoursRef = useRef<HTMLInputElement>(null);
  const minsRef = useRef<HTMLInputElement>(null);

  const filteredTasks = selectedProject
    ? tasks.filter((t) => t.projectId === selectedProject)
    : tasks;

  function updateDuration() {
    const h = parseInt(hoursRef.current?.value ?? "0") || 0;
    const m = parseInt(minsRef.current?.value ?? "0") || 0;
    setDurationMinutes(h * 60 + m);
  }

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Registo actualizado" : "Registo criado");
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleDelete() {
    if (!entry) return;
    setDeletePending(true);
    const r = await deleteTimeEntry(entry.id);
    setDeletePending(false);
    setShowDelete(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Registo eliminado");
      onClose();
    }
  }

  const initialHours = entry ? Math.floor(entry.duration / 60) : 0;
  const initialMinutes = entry ? entry.duration % 60 : 0;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? "Editar registo" : "Registar horas"}
        width={480}
      >
        <form
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {isEdit && <input type="hidden" name="id" value={entry.id} />}
          <input type="hidden" name="duration" value={durationMinutes} />

          <FormField label="Projecto">
            <select
              name="projectId"
              defaultValue={entry?.projectId ?? ""}
              style={formInputStyle}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">-- Sem projecto --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tarefa">
            <select
              name="taskId"
              defaultValue={entry?.taskId ?? ""}
              style={formInputStyle}
            >
              <option value="">-- Sem tarefa --</option>
              {filteredTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Data">
            <input
              type="date"
              name="date"
              required
              defaultValue={entry?.date ?? new Date().toISOString().slice(0, 10)}
              style={formInputStyle}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Horas">
              <input
                ref={hoursRef}
                type="number"
                min={0}
                max={23}
                defaultValue={initialHours}
                onChange={updateDuration}
                style={formInputStyle}
              />
            </FormField>
            <FormField label="Minutos">
              <input
                ref={minsRef}
                type="number"
                min={0}
                max={59}
                step={5}
                defaultValue={initialMinutes}
                onChange={updateDuration}
                style={formInputStyle}
              />
            </FormField>
          </div>

          <FormField label="Descrição">
            <textarea
              name="description"
              rows={2}
              defaultValue={entry?.description ?? ""}
              maxLength={2000}
              style={{ ...formInputStyle, resize: "vertical" }}
              placeholder="O que foi feito (opcional)"
            />
          </FormField>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="isBillable"
              value="true"
              defaultChecked={entry?.isBillable ?? true}
              style={{ accentColor: "var(--accent)" }}
            />
            Facturável
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: isEdit ? "space-between" : "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {isEdit && entry.status === "draft" && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={pending || deletePending}
                style={{ ...formButtonStyle, ...formButtonDangerStyle }}
              >
                Eliminar
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                style={formButtonStyle}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
              >
                {pending ? "A guardar..." : isEdit ? "Guardar" : "Criar"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {isEdit && (
        <ConfirmDialog
          open={showDelete}
          title="Eliminar registo"
          message="Eliminar este registo de horas? Esta acção não pode ser revertida."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
          loading={deletePending}
          destructive
        />
      )}
    </>
  );
}
