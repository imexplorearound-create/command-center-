"use client";

import { useState } from "react";
import type { AreaRow } from "@/lib/queries";
import type { PersonOption } from "@/lib/types";
import { AreaFormModal, type AreaInitial } from "./area-form-modal";

export function AreasList({
  areas,
  people,
  canEdit,
}: {
  areas: AreaRow[];
  people: PersonOption[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<AreaInitial | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {areas.map((a) => (
          <div
            key={a.id}
            className="cc-card"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: a.archivedAt ? 0.5 : 1,
              cursor: canEdit && !a.archivedAt ? "pointer" : "default",
              borderLeft: `4px solid ${a.color}`,
            }}
            onClick={() => {
              if (!canEdit || a.archivedAt) return;
              setEditing({
                id: a.id,
                name: a.name,
                slug: a.slug,
                description: a.description,
                color: a.color,
                icon: a.icon,
                ownerId: a.ownerId,
              });
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {a.name}
                <code style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{a.slug}</code>
                {a.archivedAt && (
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>arquivada</span>
                )}
              </div>
              {a.description && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                  {a.description}
                </div>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "right" }}>
              {a.ownerName && <div>Owner: {a.ownerName}</div>}
              <div>
                {a.taskCount} task(s) · {a.workflowTemplateCount} template(s)
              </div>
            </div>
          </div>
        ))}
        {areas.length === 0 && (
          <div className="cc-card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            Sem áreas registadas.
          </div>
        )}
      </div>

      {editing && (
        <AreaFormModal
          mode="edit"
          area={editing}
          people={people}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
