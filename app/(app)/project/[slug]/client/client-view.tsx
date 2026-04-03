"use client";

import { useState } from "react";
import Link from "next/link";
import { priorityColor, formatDateShort } from "@/lib/utils";
import type { InteractionType, ClientData } from "@/lib/types";

const TYPE_CONFIG: Record<InteractionType, { icon: string; label: string; iconClass: string }> = {
  call: { icon: "📞", label: "Call", iconClass: "cc-feed-icon-call" },
  email: { icon: "📧", label: "Email", iconClass: "cc-feed-icon-email" },
  decisao: { icon: "✅", label: "Decisão", iconClass: "cc-feed-icon-decisao" },
  documento: { icon: "📄", label: "Documento", iconClass: "cc-feed-icon-documento" },
  tarefa: { icon: "📋", label: "Tarefa", iconClass: "cc-feed-icon-tarefa" },
  nota: { icon: "📝", label: "Nota", iconClass: "cc-feed-icon-nota" },
};

const FILTER_OPTIONS: { key: InteractionType | "tudo"; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
  { key: "decisao", label: "Decisões" },
  { key: "documento", label: "Docs" },
  { key: "nota", label: "Notas" },
];

interface Props {
  slug: string;
  projectName: string;
  client: ClientData;
}

export function ClientView({ slug, projectName, client }: Props) {
  const [typeFilter, setTypeFilter] = useState<InteractionType | "tudo">("tudo");
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const filteredInteractions = client.interactions.filter(i => {
    if (typeFilter !== "tudo" && i.type !== typeFilter) return false;
    if (personFilter && !i.participants.includes(personFilter)) return false;
    return true;
  });

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/project/${slug}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.82rem" }}>
          ← {projectName}
        </Link>
      </div>

      <div className="cc-page-header">
        <div className="cc-page-title">{projectName} — Cliente</div>
        <div className="cc-page-subtitle">{client.companyName}</div>
      </div>

      <div className="cc-client-bar">
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">Empresa</div>
          <div className="cc-client-bar-value">{client.companyName}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">Contacto principal</div>
          <div className="cc-client-bar-value">{client.primaryContact}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">Estado</div>
          <div className="cc-client-bar-value" style={{ color: "var(--yellow)" }}>{client.status}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">Último contacto</div>
          <div className="cc-client-bar-value" style={{ color: client.daysSinceContact > 5 ? "var(--red)" : "var(--green)" }}>
            {client.daysSinceContact}d atrás
          </div>
        </div>
      </div>

      <div className="cc-client-contacts">
        {client.contacts.map(c => (
          <div
            key={c.name}
            className="cc-card cc-client-contact"
            style={{ cursor: "pointer", borderColor: personFilter === c.name ? c.color : undefined }}
            onClick={() => setPersonFilter(personFilter === c.name ? null : c.name)}
          >
            <div className="cc-client-avatar" style={{ backgroundColor: c.color }}>{c.name.charAt(0)}</div>
            <div>
              <div className="cc-client-contact-name">{c.name}</div>
              <div className="cc-client-contact-role">{c.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="cc-card cc-next-steps">
        <div className="cc-section-title">Próximos passos</div>
        {client.nextSteps.map((step, i) => (
          <div key={i} className="cc-next-step">
            <div className="cc-next-step-left">
              <div className="cc-next-step-prio" style={{ backgroundColor: priorityColor(step.priority) }} />
              <span style={{ fontWeight: 600 }}>{step.title}</span>
            </div>
            <div className="cc-next-step-meta">
              @{step.assignee}
              {step.deadline && <> · {formatDateShort(step.deadline)}</>}
            </div>
          </div>
        ))}
      </div>

      <div className="cc-card" style={{ padding: 20 }}>
        <div className="cc-section-title">Feed de interacções</div>

        <div className="cc-feed-filters">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              className={`cc-feed-filter ${typeFilter === f.key ? "active" : ""}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          {personFilter && (
            <button className="cc-feed-filter active" onClick={() => setPersonFilter(null)}>
              ✕ {personFilter}
            </button>
          )}
        </div>

        {filteredInteractions.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--muted)", fontSize: "0.85rem" }}>
            Nenhuma interacção encontrada com estes filtros.
          </div>
        )}

        {filteredInteractions.map(item => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <div key={item.id} className="cc-feed-item">
              <div className="cc-feed-date">{formatDateShort(item.date)}</div>
              <div className={`cc-feed-icon ${cfg.iconClass}`}>{cfg.icon}</div>
              <div className="cc-feed-content">
                <div className="cc-feed-title">{item.title}</div>
                {item.body && <div className="cc-feed-body">{item.body}</div>}
                <div className="cc-feed-meta">
                  {item.participants.map(p => (
                    <span
                      key={p}
                      className="cc-feed-participant"
                      style={{ cursor: "pointer" }}
                      onClick={() => setPersonFilter(personFilter === p ? null : p)}
                    >
                      {p}
                    </span>
                  ))}
                  {item.source && <span>{item.source}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
