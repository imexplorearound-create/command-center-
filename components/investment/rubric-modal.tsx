"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";
import { createRubric, updateRubric } from "@/lib/actions/investment-actions";
import type { InvestmentRubricData } from "@/lib/types";

interface Props {
  rubric?: InvestmentRubricData;
  investmentMapId: string;
  areas: { id: string; name: string }[];
  onClose: () => void;
}

export function RubricModal({ rubric, investmentMapId, areas, onClose }: Props) {
  const isEdit = !!rubric;
  const action = isEdit
    ? (updateRubric as typeof createRubric)
    : createRubric;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Rubrica actualizada" : "Rubrica criada");
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar rubrica" : "Nova rubrica"} width={480}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="investmentMapId" value={investmentMapId} />
        {isEdit && <input type="hidden" name="id" value={rubric.id} />}

        <FormField label="Nome">
          <input
            name="name"
            required
            defaultValue={rubric?.name ?? ""}
            maxLength={300}
            style={formInputStyle}
            placeholder="Nome da rubrica"
            autoFocus
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Orçamento alocado">
            <input
              type="number"
              name="budgetAllocated"
              required
              min={0}
              step="any"
              defaultValue={rubric?.budgetAllocated ?? ""}
              style={formInputStyle}
              placeholder="0"
            />
          </FormField>

          {isEdit && (
            <FormField label="Orçamento executado">
              <input
                type="number"
                name="budgetExecuted"
                min={0}
                step="any"
                defaultValue={rubric?.budgetExecuted ?? 0}
                style={formInputStyle}
                placeholder="0"
              />
            </FormField>
          )}

          <FormField label="Área">
            <select
              name="areaId"
              defaultValue={rubric?.areaId ?? ""}
              style={formInputStyle}
            >
              <option value="">-- Sem área --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

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
          <button type="submit" disabled={pending} style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}>
            {pending ? "A guardar..." : isEdit ? "Guardar" : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
