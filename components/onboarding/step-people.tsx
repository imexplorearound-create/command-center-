"use client";

import { useState, useActionState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import { saveOnboardingStep4, importPeopleFromCsv } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";
import { Plus, X, Upload } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

interface PersonEntry {
  name: string;
  email: string;
  role: string;
  type: "equipa" | "contacto";
}

export function StepPeople({ onSuccess }: Props) {
  const t = useT();
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);

  const [state, action, pending] = useActionState(saveOnboardingStep4, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Pessoas guardadas");
      onSuccess();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  function addPerson() {
    setPeople([...people, { name: "", email: "", role: "", type: "equipa" }]);
  }

  function removePerson(idx: number) {
    setPeople(people.filter((_, i) => i !== idx));
  }

  function updatePerson(idx: number, field: keyof PersonEntry, value: string) {
    const copy = [...people];
    copy[idx] = { ...copy[idx], [field]: value };
    setPeople(copy);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);

    const fd = new FormData();
    fd.append("csv", file);

    const result = await importPeopleFromCsv(undefined, fd);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`${result.data?.imported ?? 0} pessoas importadas`);
    }
    setCsvUploading(false);
    e.target.value = "";
  }

  return (
    <div>
      <p style={{ marginBottom: 16, color: "#666" }}>
        {t("onboarding.import_people")}
      </p>

      {/* CSV Import */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px dashed var(--cc-border, #e0e0e0)", borderRadius: 8, textAlign: "center" }}>
        <label
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
          className="cc-btn cc-btn-secondary"
        >
          <Upload size={16} />
          {csvUploading ? "..." : t("onboarding.import_csv")}
          <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
        </label>
        <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
          CSV com colunas: nome/name, email, papel/role
        </p>
      </div>

      {/* Manual entry */}
      <form action={action}>
        <input type="hidden" name="people" value={JSON.stringify(people)} />

        {people.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              value={p.name}
              onChange={(e) => updatePerson(i, "name", e.target.value)}
              placeholder="Nome"
              className="cc-input"
              style={{ flex: 2 }}
            />
            <input
              value={p.email}
              onChange={(e) => updatePerson(i, "email", e.target.value)}
              placeholder="Email"
              type="email"
              className="cc-input"
              style={{ flex: 2 }}
            />
            <input
              value={p.role}
              onChange={(e) => updatePerson(i, "role", e.target.value)}
              placeholder="Papel"
              className="cc-input"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => removePerson(i)} style={{ border: "none", background: "none", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addPerson}
          className="cc-btn cc-btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
        >
          <Plus size={16} /> Adicionar
        </button>

        {people.length > 0 && (
          <div>
            <button type="submit" disabled={pending} className="cc-btn cc-btn-primary">
              {pending ? "..." : t("common.save")}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
