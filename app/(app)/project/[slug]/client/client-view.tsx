"use client";

import { useState } from "react";
import Link from "next/link";
import { priorityColor, formatDateShort } from "@/lib/utils";
import type { InteractionType, InteractionData, ClientData, PersonOption } from "@/lib/types";
import { InteractionModal } from "./interaction-modal";
import { useT } from "@/lib/i18n/context";

const TYPE_ICONS: Record<InteractionType, { icon: string; iconClass: string }> = {
  call: { icon: "📞", iconClass: "cc-feed-icon-call" },
  email: { icon: "📧", iconClass: "cc-feed-icon-email" },
  decisao: { icon: "✅", iconClass: "cc-feed-icon-decisao" },
  documento: { icon: "📄", iconClass: "cc-feed-icon-documento" },
  tarefa: { icon: "📋", iconClass: "cc-feed-icon-tarefa" },
  nota: { icon: "📝", iconClass: "cc-feed-icon-nota" },
};

const FILTER_KEYS: { key: InteractionType | "tudo"; labelKey: string }[] = [
  { key: "tudo", labelKey: "client.filter.all" },
  { key: "call", labelKey: "client.filter.calls" },
  { key: "email", labelKey: "client.filter.emails" },
  { key: "decisao", labelKey: "client.filter.decisions" },
  { key: "documento", labelKey: "client.filter.docs" },
  { key: "nota", labelKey: "client.filter.notes" },
];

interface Props {
  slug: string;
  projectId: string;
  projectName: string;
  client: ClientData;
  people: PersonOption[];
}

export function ClientView({ slug, projectId, projectName, client, people }: Props) {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState<InteractionType | "tudo">("tudo");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; interaction: InteractionData }
    | null
  >(null);

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
        <div className="cc-page-title">{projectName} — {t("client.title_suffix")}</div>
        <div className="cc-page-subtitle">{client.companyName}</div>
      </div>

      <div className="cc-client-bar">
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">{t("client.company")}</div>
          <div className="cc-client-bar-value">{client.companyName}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">{t("client.primary_contact")}</div>
          <div className="cc-client-bar-value">{client.primaryContact}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">{t("client.status")}</div>
          <div className="cc-client-bar-value" style={{ color: "var(--yellow)" }}>{client.status}</div>
        </div>
        <div className="cc-card cc-client-bar-item">
          <div className="cc-client-bar-label">{t("client.last_contact")}</div>
          <div className="cc-client-bar-value" style={{ color: client.daysSinceContact > 5 ? "var(--red)" : "var(--green)" }}>
            {t("client.days_ago", { days: client.daysSinceContact })}
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
        <div className="cc-section-title">{t("client.next_steps")}</div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="cc-section-title" style={{ marginBottom: 0 }}>{t("client.feed_title")}</div>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("client.new_interaction")}
          </button>
        </div>

        <div className="cc-feed-filters">
          {FILTER_KEYS.map(f => (
            <button
              key={f.key}
              className={`cc-feed-filter ${typeFilter === f.key ? "active" : ""}`}
              onClick={() => setTypeFilter(f.key)}
            >
              {t(f.labelKey)}
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
            {t("client.no_interactions")}
          </div>
        )}

        {filteredInteractions.map(item => {
          const cfg = TYPE_ICONS[item.type];
          return (
            <div
              key={item.id}
              className="cc-feed-item"
              style={{ cursor: "pointer" }}
              onClick={() => setModal({ mode: "edit", interaction: item })}
            >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setPersonFilter(personFilter === p ? null : p);
                      }}
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

      {modal?.mode === "create" && (
        <InteractionModal
          mode="create"
          clientId={client.id}
          projectId={projectId}
          people={people}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <InteractionModal
          mode="edit"
          interaction={modal.interaction}
          clientId={client.id}
          projectId={projectId}
          people={people}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
