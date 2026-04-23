"use client";

import { useState, useActionState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import { saveOnboardingStep2 } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

interface UserEntry {
  name: string;
  email: string;
  role: "admin" | "manager" | "membro";
}

export function StepTeam({ onSuccess }: Props) {
  const t = useT();
  const [users, setUsers] = useState<UserEntry[]>([]);

  const [state, action, pending] = useActionState(saveOnboardingStep2, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Equipa guardada");
      onSuccess();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  function addUser() {
    setUsers([...users, { name: "", email: "", role: "membro" }]);
  }

  function removeUser(idx: number) {
    setUsers(users.filter((_, i) => i !== idx));
  }

  function updateUser(idx: number, field: keyof UserEntry, value: string) {
    const copy = [...users];
    copy[idx] = { ...copy[idx], [field]: value };
    setUsers(copy);
  }

  return (
    <form action={action}>
      <input type="hidden" name="users" value={JSON.stringify(users)} />

      <p style={{ marginBottom: 16, color: "#666" }}>
        {t("onboarding.invite_users")}
      </p>

      {users.map((u, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            value={u.name}
            onChange={(e) => updateUser(i, "name", e.target.value)}
            placeholder="Nome"
            className="cc-input"
            style={{ flex: 2 }}
          />
          <input
            value={u.email}
            onChange={(e) => updateUser(i, "email", e.target.value)}
            placeholder="Email"
            type="email"
            className="cc-input"
            style={{ flex: 2 }}
          />
          <select
            value={u.role}
            onChange={(e) => updateUser(i, "role", e.target.value as UserEntry["role"])}
            className="cc-input"
            style={{ flex: 1 }}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="membro">Membro</option>
          </select>
          <button type="button" onClick={() => removeUser(i)} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addUser}
        className="cc-btn cc-btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
      >
        <Plus size={16} /> Adicionar
      </button>

      <div>
        <button type="submit" disabled={pending || users.length === 0} className="cc-btn cc-btn-primary">
          {pending ? "..." : t("common.save")}
        </button>
      </div>
    </form>
  );
}
