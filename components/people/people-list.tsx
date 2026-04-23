"use client";

import { useState } from "react";
import type { PersonRow, GroupedPeople } from "@/lib/queries";
import { PersonFormModal, type PersonInitial } from "./person-form-modal";

interface Props {
  grouped: GroupedPeople;
  canEdit: boolean;
}

export function PeopleList({ grouped, canEdit }: Props) {
  const [editing, setEditing] = useState<PersonInitial | null>(null);

  function openEdit(p: PersonRow) {
    if (!canEdit || p.archivedAt) return;
    setEditing({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      type: p.type,
      avatarColor: p.avatarColor,
      githubUsername: p.githubUsername,
    });
  }

  const totalCount =
    grouped.internas.length +
    grouped.porProjeto.reduce((acc, g) => acc + g.people.length, 0) +
    grouped.semProjeto.length;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Section
          title="Internas"
          subtitle={`${grouped.internas.length} pessoa(s) na equipa`}
        >
          {grouped.internas.length > 0 ? (
            grouped.internas.map((p) => (
              <PersonCard key={p.id} person={p} onClick={openEdit} canEdit={canEdit} />
            ))
          ) : (
            <EmptyRow text="Sem pessoas internas." />
          )}
        </Section>

        {grouped.porProjeto.map((g) => (
          <Section
            key={g.project.id}
            title={g.project.name}
            subtitle={`${g.people.length} contacto(s) cliente`}
            color={g.project.color}
          >
            {g.people.map((p) => (
              <PersonCard
                key={`${g.project.id}-${p.id}`}
                person={p}
                onClick={openEdit}
                canEdit={canEdit}
              />
            ))}
          </Section>
        ))}

        {grouped.semProjeto.length > 0 && (
          <Section
            title="Sem projeto"
            subtitle={`${grouped.semProjeto.length} pessoa(s) sem projeto associado`}
          >
            {grouped.semProjeto.map((p) => (
              <PersonCard key={p.id} person={p} onClick={openEdit} canEdit={canEdit} />
            ))}
          </Section>
        )}

        {totalCount === 0 && <EmptyRow text="Sem pessoas registadas." />}
      </div>

      {editing && (
        <PersonFormModal mode="edit" person={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  color,
  children,
}: {
  title: string;
  subtitle?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {color && (
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{subtitle}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function PersonCard({
  person: p,
  onClick,
  canEdit,
}: {
  person: PersonRow;
  onClick: (p: PersonRow) => void;
  canEdit: boolean;
}) {
  return (
    <div
      className="cc-card"
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: p.archivedAt ? 0.5 : 1,
        cursor: canEdit && !p.archivedAt ? "pointer" : "default",
      }}
      onClick={() => onClick(p)}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: p.avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 600,
          fontSize: "0.95rem",
          flexShrink: 0,
        }}
      >
        {p.name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {p.name}
          <span
            style={{
              fontSize: "0.7rem",
              padding: "1px 6px",
              borderRadius: 4,
              background:
                p.type === "equipa" ? "rgba(55, 138, 221, 0.15)" : "rgba(186, 117, 23, 0.15)",
              color: p.type === "equipa" ? "var(--accent, #378ADD)" : "var(--yellow, #BA7517)",
            }}
          >
            {p.type}
          </span>
          {p.archivedAt && (
            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>arquivada</span>
          )}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {p.role && <span>{p.role}</span>}
          {p.role && p.email && <span> · </span>}
          {p.email && <span>{p.email}</span>}
          {p.githubUsername && <span> · @{p.githubUsername}</span>}
        </div>
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "right" }}>
        {p.activeTaskCount > 0 ? `${p.activeTaskCount} tarefa(s) activa(s)` : "—"}
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="cc-card" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
      {text}
    </div>
  );
}
