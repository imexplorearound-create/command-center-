"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitTimeEntries } from "@/lib/actions/timeentry-actions";
import {
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";

interface Props {
  draftCount: number;
  draftIds: string[];
}

export function SubmitBar({ draftCount, draftIds }: Props) {
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    const result = await submitTimeEntries(draftIds);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Semana submetida");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        marginTop: 20,
      }}
    >
      <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
        {draftCount} {draftCount === 1 ? "rascunho" : "rascunhos"}
      </span>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
      >
        {pending ? "A submeter..." : "Submeter Semana"}
      </button>
    </div>
  );
}
