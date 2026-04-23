"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";
import { FormField } from "@/components/shared/form-field";
import { ACTIVITY_TYPE_LABELS } from "@/lib/validation/opportunity-schema";
import { createActivity } from "@/lib/actions/activity-actions";

interface Props {
  opportunityId: string;
  onClose: () => void;
}

const ACTIVITY_TYPE_OPTIONS = (
  Object.entries(ACTIVITY_TYPE_LABELS) as [string, string][]
).map(([value, label]) => ({ value, label }));

export function ActivityModal({ opportunityId, onClose }: Props) {
  const [state, formAction, pending] = useActionState(createActivity, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Actividade registada");
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title="Nova actividade" width={480}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="opportunityId" value={opportunityId} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Tipo">
            <select name="type" defaultValue="note" style={formInputStyle}>
              {ACTIVITY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Data/Hora">
            <input
              type="datetime-local"
              name="scheduledAt"
              style={formInputStyle}
            />
          </FormField>
        </div>

        <FormField label="Título">
          <input
            name="title"
            required
            maxLength={500}
            style={formInputStyle}
            placeholder="Resumo da actividade"
            autoFocus
          />
        </FormField>

        <FormField label="Descrição">
          <textarea
            name="description"
            rows={3}
            maxLength={5000}
            style={{ ...formInputStyle, resize: "vertical" }}
            placeholder="Detalhes (opcional)"
          />
        </FormField>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 8,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button type="button" onClick={onClose} disabled={pending} style={formButtonStyle}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
          >
            {pending ? "A guardar..." : "Registar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
