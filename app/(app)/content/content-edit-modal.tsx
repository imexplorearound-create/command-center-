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
import type { ContentItemData, ContentStatus } from "@/lib/types";
import {
  CONTENT_FORMAT_OPTIONS,
  CONTENT_STATUS_OPTIONS,
  CONTENT_PLATFORM_OPTIONS,
} from "@/lib/validation/content-schema";
import { createContent, updateContent, deleteContent } from "@/lib/actions/content-actions";

interface BaseProps {
  projects: { id: string; name: string }[];
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; initialStatus: ContentStatus; item?: undefined })
  | (BaseProps & { mode: "edit"; item: ContentItemData; initialStatus?: undefined });

export function ContentEditModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateContent : createContent;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Conteúdo actualizado" : "Conteúdo criado");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleDelete() {
    setDeletePending(true);
    const r = await deleteContent(props.item!.id);
    setDeletePending(false);
    setShowDelete(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Conteúdo eliminado");
      props.onClose();
    }
  }

  const initial = isEdit ? props.item : undefined;

  return (
    <>
      <Modal
        open
        onClose={props.onClose}
        title={isEdit ? "Editar conteúdo" : "Novo conteúdo"}
        width={520}
      >
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="id" value={props.item.id} />}
          {!isEdit && <input type="hidden" name="status" value={props.initialStatus} />}

          <FormField label="Título">
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              maxLength={500}
              style={formInputStyle}
              placeholder="Ex: Como a AI vai mudar a contabilidade"
              autoFocus
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Formato">
              <select name="format" defaultValue={initial?.format ?? ""} style={formInputStyle}>
                <option value="">— Seleccionar —</option>
                {CONTENT_FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Plataforma">
              <select name="platform" defaultValue={initial?.platform ?? ""} style={formInputStyle}>
                <option value="">— Seleccionar —</option>
                {CONTENT_PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            {isEdit && (
              <FormField label="Estado">
                <select name="status" defaultValue={initial?.status ?? "proposta"} style={formInputStyle}>
                  {CONTENT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Data da call (opcional)">
              <input
                type="date"
                name="sourceCallDate"
                defaultValue={initial?.sourceCallDate ?? ""}
                style={formInputStyle}
              />
            </FormField>
          </div>

          {props.projects.length > 0 && (
            <FormField label="Projecto (opcional)">
              <select name="projectId" defaultValue={initial?.projectId ?? ""} style={formInputStyle}>
                <option value="">— Sem projecto —</option>
                {props.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

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
          title="Eliminar conteúdo"
          message={`Eliminar "${props.item.title}"? Esta acção não pode ser desfeita.`}
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
