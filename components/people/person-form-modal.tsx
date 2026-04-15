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
import type { PersonInitial } from "@/lib/types";
import { PERSON_TYPE_OPTIONS } from "@/lib/validation/person-schema";
import {
  createPerson,
  updatePerson,
  archivePerson,
} from "@/lib/actions/person-actions";

export type { PersonInitial };

interface BaseProps {
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; person?: undefined })
  | (BaseProps & { mode: "edit"; person: PersonInitial });

export function PersonFormModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updatePerson : createPerson;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showArchive, setShowArchive] = useState(false);
  const [archivePending, setArchivePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Pessoa actualizada" : "Pessoa criada");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleArchive() {
    if (!isEdit) return;
    setArchivePending(true);
    const r = await archivePerson(props.person.id);
    setArchivePending(false);
    setShowArchive(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Pessoa arquivada");
      props.onClose();
    }
  }

  const initial = isEdit ? props.person : undefined;

  return (
    <>
      <Modal open onClose={props.onClose} title={isEdit ? "Editar pessoa" : "Nova pessoa"} width={520}>
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="id" value={props.person.id} />}

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Email">
              <input
                type="email"
                name="email"
                defaultValue={initial?.email ?? ""}
                maxLength={300}
                style={formInputStyle}
              />
            </FormField>

            <FormField label="Tipo">
              <select name="type" defaultValue={initial?.type ?? "equipa"} style={formInputStyle}>
                {PERSON_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Função / Papel">
              <input
                name="role"
                defaultValue={initial?.role ?? ""}
                maxLength={200}
                style={formInputStyle}
                placeholder="ex: CTO, Contabilidade"
              />
            </FormField>

            <FormField label="Cor avatar (hex)">
              <input
                name="avatarColor"
                defaultValue={initial?.avatarColor ?? ""}
                placeholder="#378ADD"
                pattern="#[0-9A-Fa-f]{6}"
                style={formInputStyle}
              />
            </FormField>

            <FormField label="GitHub username">
              <input
                name="githubUsername"
                defaultValue={initial?.githubUsername ?? ""}
                maxLength={100}
                style={formInputStyle}
              />
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
          title="Arquivar pessoa"
          message={`Arquivar "${props.person.name}"? Pode ser restaurada mais tarde.`}
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
