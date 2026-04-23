"use client";

import { useActionState, useState } from "react";
import { resolveDecision } from "@/lib/actions/decision-actions";

type Props = {
  decisionId: string;
};

export function DecisionResolveButton({ decisionId }: Props) {
  const [state, formAction, pending] = useActionState(resolveDecision, undefined);
  const [showNote, setShowNote] = useState(false);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}
    >
      <input type="hidden" name="decisionId" value={decisionId} />
      {showNote ? (
        <textarea
          name="resolutionNote"
          placeholder="Como resolveste? (opcional)"
          rows={2}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            padding: "6px 8px",
            background: "var(--bg-3)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-input)",
            color: "var(--ink)",
            resize: "vertical",
          }}
        />
      ) : null}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          style={{ flex: 1 }}
        >
          {pending ? "a resolver…" : "Marcar resolvido"}
        </button>
        {!showNote ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowNote(true)}
            aria-label="Adicionar nota de resolução"
            title="Adicionar nota de resolução"
          >
            +
          </button>
        ) : null}
      </div>
      {state && "error" in state ? (
        <span className="mono" style={{ color: "var(--error)" }}>
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
