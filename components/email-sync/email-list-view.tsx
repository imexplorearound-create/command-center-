"use client";

import { useState, useMemo } from "react";
import type { EmailRecordData } from "@/lib/types";
import { CategorizeModal } from "./categorize-modal";
import { formInputStyle } from "@/components/shared/form-styles";
import { timeAgo } from "@/lib/utils";

interface Props {
  emails: EmailRecordData[];
  projects: { id: string; name: string }[];
  clients: { id: string; companyName: string }[];
  people: { id: string; name: string }[];
}

function emailTimeAgo(dateStr: string): string {
  const result = timeAgo(dateStr);
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days >= 30) {
    return new Date(dateStr).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  }
  return result;
}

export function EmailListView({ emails, projects, clients, people }: Props) {
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "uncategorized" | "categorized">("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [selected, setSelected] = useState<EmailRecordData | null>(null);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      if (projectFilter && e.projectId !== projectFilter) return false;
      if (statusFilter === "uncategorized" && e.isProcessed) return false;
      if (statusFilter === "categorized" && !e.isProcessed) return false;
      if (directionFilter !== "all" && e.direction !== directionFilter) return false;
      return true;
    });
  }, [emails, projectFilter, statusFilter, directionFilter]);

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ ...formInputStyle, width: "auto", minWidth: 180 }}
        >
          <option value="">Todos os projectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ ...formInputStyle, width: "auto", minWidth: 160 }}
        >
          <option value="all">Todos os estados</option>
          <option value="uncategorized">Por categorizar</option>
          <option value="categorized">Categorizados</option>
        </select>

        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value as typeof directionFilter)}
          style={{ ...formInputStyle, width: "auto", minWidth: 140 }}
        >
          <option value="all">Todas as direcções</option>
          <option value="inbound">Recebidos</option>
          <option value="outbound">Enviados</option>
        </select>
      </div>

      {/* Email list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted, #999)" }}>
            Nenhum email encontrado.
          </div>
        )}

        {filtered.map((email) => (
          <button
            key={email.id}
            type="button"
            onClick={() => setSelected(email)}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "var(--card, #151821)",
              border: "1px solid var(--border, rgba(255,255,255,0.06))",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              color: "var(--text, #eaedf3)",
              width: "100%",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle, rgba(255,255,255,0.04))")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card, #151821)")}
          >
            {/* Subject + from */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email.subject || "(sem assunto)"}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted, #999)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: 2,
                }}
              >
                {email.from}
              </div>
            </div>

            {/* Direction badge */}
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "3px 8px",
                borderRadius: 4,
                background: email.direction === "inbound"
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(168,85,247,0.15)",
                color: email.direction === "inbound"
                  ? "var(--blue, #3b82f6)"
                  : "var(--purple, #a855f7)",
              }}
            >
              {email.direction === "inbound" ? "Recebido" : "Enviado"}
            </span>

            {/* Project or uncategorized badge */}
            <span
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                ...(email.projectName
                  ? {
                      background: "rgba(34,197,94,0.12)",
                      color: "var(--green, #22c55e)",
                    }
                  : {
                      background: "rgba(234,179,8,0.12)",
                      color: "var(--yellow, #eab308)",
                    }),
              }}
            >
              {email.projectName ?? "Por categorizar"}
            </span>

            {/* Timestamp */}
            <span style={{ fontSize: "0.75rem", color: "var(--muted, #999)", whiteSpace: "nowrap" }}>
              {emailTimeAgo(email.receivedAt)}
            </span>
          </button>
        ))}
      </div>

      {/* Categorize modal */}
      {selected && (
        <CategorizeModal
          email={selected}
          projects={projects}
          clients={clients}
          people={people}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
