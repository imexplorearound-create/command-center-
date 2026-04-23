"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { TimeEntryData } from "@/lib/types";
import {
  approveTimeEntries,
  rejectTimeEntries,
} from "@/lib/actions/timeentry-actions";
import {
  formButtonStyle,
  formButtonPrimaryStyle,
  formButtonDangerStyle,
} from "@/components/shared/form-styles";
import { formatDuration } from "@/lib/utils";

interface Props {
  entries: TimeEntryData[];
}

export function ApprovalView({ entries }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  // Group by person
  const grouped = new Map<string, { name: string; entries: TimeEntryData[] }>();
  for (const e of entries) {
    const group = grouped.get(e.personId) ?? { name: e.personName, entries: [] };
    group.entries.push(e);
    grouped.set(e.personId, group);
  }

  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleAction(action: "approve" | "reject") {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error("Seleccione pelo menos um registo");
      return;
    }
    setPending(true);
    const result =
      action === "approve"
        ? await approveTimeEntries(ids)
        : await rejectTimeEntries(ids);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(action === "approve" ? "Registos aprovados" : "Registos rejeitados");
      setSelected(new Set());
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from(grouped.entries()).map(([personId, group]) => {
        const total = group.entries.reduce((s, e) => s + e.duration, 0);
        const ids = group.entries.map((e) => e.id);

        return (
          <div
            key={personId}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  {group.name}
                </span>
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                  }}
                >
                  {formatDuration(total)}
                </span>
              </div>
              <label
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={ids.every((id) => selected.has(id))}
                  onChange={() => toggleAll(ids)}
                  style={{ accentColor: "var(--accent)" }}
                />
                Todos
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.entries.map((e) => (
                <label
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    background: selected.has(e.id)
                      ? "var(--accent-glow)"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleEntry(e.id)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span style={{ flex: 1 }}>
                    {e.taskTitle ?? e.projectName ?? "Sem projecto"}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    {e.date}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", minWidth: 54, textAlign: "right" }}>
                    {formatDuration(e.duration)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {entries.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => handleAction("reject")}
            disabled={pending || selected.size === 0}
            style={{ ...formButtonStyle, ...formButtonDangerStyle }}
          >
            {pending ? "..." : "Rejeitar"}
          </button>
          <button
            type="button"
            onClick={() => handleAction("approve")}
            disabled={pending || selected.size === 0}
            style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
          >
            {pending ? "..." : "Aprovar"}
          </button>
        </div>
      )}
    </div>
  );
}
