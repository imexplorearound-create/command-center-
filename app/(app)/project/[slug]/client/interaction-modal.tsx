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
import type { InteractionData, PersonOption } from "@/lib/types";
import { INTERACTION_TYPE_OPTIONS } from "@/lib/validation/interaction-schema";
import {
  createInteraction,
  updateInteraction,
  deleteInteraction,
} from "@/lib/actions/interaction-actions";

interface BaseProps {
  clientId: string;
  projectId: string;
  people: PersonOption[];
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; interaction?: undefined })
  | (BaseProps & { mode: "edit"; interaction: InteractionData });

export function InteractionModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateInteraction : createInteraction;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Interação actualizada" : "Interação criada");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleDelete() {
    setDeletePending(true);
    const r = await deleteInteraction(props.interaction!.id);
    setDeletePending(false);
    setShowDelete(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Interação eliminada");
      props.onClose();
    }
  }

  const initial = isEdit ? props.interaction : undefined;

  // For datetime-local input, convert ISO to local format
  const defaultDate = initial?.date
    ? new Date(initial.date).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  return (
    <>
      <Modal
        open
        onClose={props.onClose}
        title={isEdit ? "Editar interação" : "Nova interação"}
        width={560}
      >
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="id" value={props.interaction.id} />}
          <input type="hidden" name="clientId" value={props.clientId} />
          <input type="hidden" name="projectId" value={props.projectId} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Tipo">
              <select
                name="type"
                defaultValue={initial?.type ?? "call"}
                style={formInputStyle}
              >
                {INTERACTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.icon} {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Data">
              <input
                type="datetime-local"
                name="interactionDate"
                defaultValue={defaultDate}
                required
                style={formInputStyle}
              />
            </FormField>
          </div>

          <FormField label="Título">
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              maxLength={500}
              style={formInputStyle}
              placeholder="Ex: Reunião kickoff com cliente"
              autoFocus
            />
          </FormField>

          <FormField label="Descrição">
            <textarea
              name="body"
              rows={4}
              defaultValue={initial?.body ?? ""}
              maxLength={10000}
              style={{ ...formInputStyle, resize: "vertical" }}
              placeholder="Notas, resumo da conversa, decisões tomadas..."
            />
          </FormField>

          <FormField label="Participantes">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {props.people.map((p) => {
                const checked = initial?.participantIds?.includes(p.id) ?? false;
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="participants"
                      value={p.id}
                      defaultChecked={checked}
                    />
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: p.avatarColor,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {p.name.charAt(0)}
                    </span>
                    {p.name}
                  </label>
                );
              })}
            </div>
          </FormField>

          <FormField label="Fonte (opcional)">
            <input
              name="source"
              defaultValue={initial?.source ?? ""}
              maxLength={100}
              style={formInputStyle}
              placeholder="Ex: Google Meet, Email, WhatsApp"
            />
          </FormField>

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
                onClick={() => setShowDelete(true)}
                disabled={pending || deletePending}
                style={{ ...formButtonStyle, ...formButtonDangerStyle }}
              >
                Eliminar
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
          open={showDelete}
          title="Eliminar interação"
          message={`Eliminar "${props.interaction.title}"? Esta acção não pode ser desfeita.`}
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
