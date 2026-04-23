"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";
import { createInvestmentMap } from "@/lib/actions/investment-actions";

interface Props {
  projectId: string;
}

export function CreateMapForm({ projectId }: Props) {
  const [state, formAction, pending] = useActionState(createInvestmentMap, undefined);

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
    // success triggers revalidation, page will re-render with the map
  }, [state]);

  return (
    <form action={formAction} style={{ display: "inline-flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
      <input type="hidden" name="projectId" value={projectId} />

      <FormField label="Orçamento total">
        <input
          type="number"
          name="totalBudget"
          required
          min={0}
          step="any"
          style={formInputStyle}
          placeholder="0"
        />
      </FormField>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Fonte de financiamento">
          <input
            name="fundingSource"
            style={formInputStyle}
            placeholder="Ex: PT2030"
          />
        </FormField>
        <FormField label="% financiamento">
          <input
            type="number"
            name="fundingPercentage"
            min={0}
            max={100}
            step="any"
            style={formInputStyle}
            placeholder="0"
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{ ...formButtonStyle, ...formButtonPrimaryStyle, alignSelf: "center" }}
      >
        {pending ? "A criar..." : "Criar mapa de investimento"}
      </button>
    </form>
  );
}
