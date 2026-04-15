"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
  formButtonDangerStyle,
} from "@/components/shared/form-styles";
import { FormField } from "@/components/shared/form-field";
import type { TaskData, TaskStatus, PhaseData, PersonOption, AreaOption } from "@/lib/types";
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from "@/lib/validation/task-schema";
import { createTask, updateTask, archiveTask } from "@/lib/actions/task-actions";

interface BaseProps {
  projectId: string;
  projectSlug: string;
  phases: PhaseData[];
  people: PersonOption[];
  areas: AreaOption[];
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; initialStatus: TaskStatus; task?: undefined })
  | (BaseProps & { mode: "edit"; task: TaskData; initialStatus?: undefined });

export function TaskEditModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateTask : createTask;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showArchive, setShowArchive] = useState(false);
  const [archivePending, setArchivePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Tarefa actualizada" : "Tarefa criada");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleArchive() {
    setArchivePending(true);
    const r = await archiveTask((props.task as TaskData).id);
    setArchivePending(false);
    setShowArchive(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Tarefa arquivada");
      props.onClose();
    }
  }

  const initial = isEdit ? props.task : undefined;

  return (
    <>
      <Modal
        open
        onClose={props.onClose}
        title={isEdit ? "Editar tarefa" : "Nova tarefa"}
        width={560}
      >
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="id" value={props.task.id} />}
          {!isEdit && <input type="hidden" name="projectId" value={props.projectId} />}
          {!isEdit && <input type="hidden" name="status" value={props.initialStatus} />}

          <FormField label="Título">
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              maxLength={500}
              style={formInputStyle}
              placeholder="O que precisa de ser feito?"
              autoFocus
            />
          </FormField>

          <FormField label="Descrição">
            <textarea
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              maxLength={5000}
              style={{ ...formInputStyle, resize: "vertical" }}
              placeholder="Detalhes (opcional)"
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Prioridade">
              <select name="priority" defaultValue={initial?.priority ?? "media"} style={formInputStyle}>
                {TASK_PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            {isEdit && (
              <FormField label="Estado">
                <select name="status" defaultValue={initial?.status ?? "backlog"} style={formInputStyle}>
                  {TASK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Responsável">
              <select name="assigneeId" defaultValue={initial?.assigneeId ?? ""} style={formInputStyle}>
                <option value="">— Sem responsável —</option>
                {props.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Prazo">
              <input
                type="date"
                name="deadline"
                defaultValue={initial?.deadline ?? ""}
                style={formInputStyle}
              />
            </FormField>

            {props.phases.length > 0 && (
              <FormField label="Fase">
                <select name="phaseId" defaultValue={initial?.phaseId ?? ""} style={formInputStyle}>
                  <option value="">— Sem fase —</option>
                  {props.phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {props.areas.length > 0 && (
              <FormField label="Área">
                <select name="areaId" defaultValue={initial?.areaId ?? ""} style={formInputStyle}>
                  <option value="">— Sem área —</option>
                  {props.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

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
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowArchive(true)}
                disabled={pending || archivePending}
                style={{ ...formButtonStyle, ...formButtonDangerStyle }}
              >
                🗄 Arquivar
              </button>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={props.onClose} disabled={pending} style={formButtonStyle}>
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
          open={showArchive}
          title="Arquivar tarefa"
          message={`Arquivar "${props.task.title}"? Pode ser restaurada mais tarde.`}
          confirmLabel="Arquivar"
          onConfirm={handleArchive}
          onClose={() => setShowArchive(false)}
          loading={archivePending}
          destructive
        />
      )}
    </>
  );
}
