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
import type { PersonOption, AreaInitial } from "@/lib/types";
import {
  createArea,
  updateArea,
  archiveArea,
} from "@/lib/actions/area-actions";

export type { AreaInitial };

interface BaseProps {
  people: PersonOption[];
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; area?: undefined })
  | (BaseProps & { mode: "edit"; area: AreaInitial });

export function AreaFormModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateArea : createArea;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showArchive, setShowArchive] = useState(false);
  const [archivePending, setArchivePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Área actualizada" : "Área criada");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleArchive() {
    if (!isEdit) return;
    setArchivePending(true);
    const r = await archiveArea(props.area.slug);
    setArchivePending(false);
    setShowArchive(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Área arquivada");
      props.onClose();
    }
  }

  const initial = isEdit ? props.area : undefined;

  return (
    <>
      <Modal open onClose={props.onClose} title={isEdit ? "Editar área" : "Nova área"} width={520}>
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="currentSlug" value={props.area.slug} />}

          <FormField label="Nome">
            <input
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              maxLength={200}
              style={formInputStyle}
              autoFocus
            />
          </FormField>

          <FormField label="Slug">
            <input
              name="slug"
              defaultValue={initial?.slug ?? ""}
              maxLength={100}
              style={formInputStyle}
              placeholder="auto-gerado se vazio"
            />
          </FormField>

          <FormField label="Descrição">
            <textarea
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              maxLength={2000}
              style={{ ...formInputStyle, resize: "vertical" }}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Cor (hex)">
              <input
                name="color"
                defaultValue={initial?.color ?? ""}
                placeholder="#888780"
                pattern="#[0-9A-Fa-f]{6}"
                style={formInputStyle}
              />
            </FormField>

            <FormField label="Ícone">
              <input
                name="icon"
                defaultValue={initial?.icon ?? ""}
                maxLength={50}
                style={formInputStyle}
                placeholder="ex: users, cog, target"
              />
            </FormField>

            <FormField label="Owner (opcional)">
              <select name="ownerId" defaultValue={initial?.ownerId ?? ""} style={formInputStyle}>
                <option value="">— Sem owner —</option>
                {props.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
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
          title="Arquivar área"
          message={`Arquivar "${props.area.name}"? Pode ser restaurada mais tarde.`}
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
