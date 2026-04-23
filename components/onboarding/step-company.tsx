"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n/context";
import { saveOnboardingStep1 } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  tenantName: string;
  onSuccess: () => void;
}

export function StepCompany({ tenantName, onSuccess }: Props) {
  const t = useT();

  const [state, action, pending] = useActionState(saveOnboardingStep1, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Empresa guardada");
      onSuccess();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  return (
    <form action={action}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("onboarding.company_name")}
        </label>
        <input
          name="tenantName"
          defaultValue={tenantName}
          required
          className="cc-input"
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("onboarding.logo")} (URL)
        </label>
        <input
          name="logoUrl"
          type="url"
          placeholder="https://..."
          className="cc-input"
          style={{ width: "100%" }}
        />
      </div>

      <button type="submit" disabled={pending} className="cc-btn cc-btn-primary">
        {pending ? "..." : t("common.save")}
      </button>
    </form>
  );
}
