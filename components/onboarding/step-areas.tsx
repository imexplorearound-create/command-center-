"use client";

import { useState, useActionState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import { saveOnboardingStep3 } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { slugify } from "@/lib/validation/project-schema";

interface Props {
  onSuccess: () => void;
}

interface AreaEntry {
  name: string;
  slug: string;
}

export function StepAreas({ onSuccess }: Props) {
  const t = useT();
  const [areas, setAreas] = useState<AreaEntry[]>([]);

  const [state, action, pending] = useActionState(saveOnboardingStep3, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Áreas guardadas");
      onSuccess();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  function addArea() {
    setAreas([...areas, { name: "", slug: "" }]);
  }

  function removeArea(idx: number) {
    setAreas(areas.filter((_, i) => i !== idx));
  }

  function updateName(idx: number, name: string) {
    const copy = [...areas];
    copy[idx] = { name, slug: slugify(name) };
    setAreas(copy);
  }

  return (
    <form action={action}>
      <input type="hidden" name="areas" value={JSON.stringify(areas)} />

      <p style={{ marginBottom: 16, color: "#666" }}>
        {t("onboarding.create_areas")}
      </p>

      {areas.map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            value={a.name}
            onChange={(e) => updateName(i, e.target.value)}
            placeholder="Nome da área"
            className="cc-input"
            style={{ flex: 2 }}
          />
          <span style={{ flex: 1, color: "#999", fontSize: 13 }}>{a.slug}</span>
          <button type="button" onClick={() => removeArea(i)} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addArea}
        className="cc-btn cc-btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
      >
        <Plus size={16} /> Adicionar
      </button>

      <div>
        <button type="submit" disabled={pending || areas.length === 0} className="cc-btn cc-btn-primary">
          {pending ? "..." : t("common.save")}
        </button>
      </div>
    </form>
  );
}
