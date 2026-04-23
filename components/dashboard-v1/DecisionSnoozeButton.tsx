"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { snoozeDecision } from "@/lib/actions/decision-actions";

type Preset = { key: string; label: string; hours: number };

const PRESETS: Preset[] = [
  { key: "1h", label: "1 hora", hours: 1 },
  { key: "4h", label: "4 horas", hours: 4 },
  { key: "tomorrow", label: "Amanhã", hours: 16 },
  { key: "week", label: "Próxima semana", hours: 24 * 7 },
];

type Props = {
  decisionId: string;
};

export function DecisionSnoozeButton({ decisionId }: Props) {
  const [state, formAction, pending] = useActionState(snoozeDecision, undefined);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click fora do wrapper fecha o menu.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handlePick = (hours: number) => {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const fd = new FormData();
    fd.set("decisionId", decisionId);
    fd.set("snoozedUntil", until);
    setOpen(false);
    formAction(fd);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        {pending ? "a adiar…" : "Adiar ▾"}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="adiar decisão"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            minWidth: 160,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-card)",
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            zIndex: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="menuitem"
              onClick={() => handlePick(p.hours)}
              style={{
                textAlign: "left",
                padding: "6px 10px",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius-input)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      {state && "error" in state ? (
        <span className="mono" style={{ color: "var(--error)", fontSize: 10 }}>
          {state.error}
        </span>
      ) : null}
    </div>
  );
}
