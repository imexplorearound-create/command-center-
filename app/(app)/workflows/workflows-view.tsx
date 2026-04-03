"use client";

import { useState } from "react";
import { formatDateShort, priorityColor } from "@/lib/utils";
import type { WorkflowInstanceData, WorkflowTemplateData, WorkflowStepStatus, WorkflowTrigger } from "@/lib/types";

type Tab = "em_curso" | "templates";

const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  manual: "Manual",
  recorrente: "Recorrente",
  evento: "Evento",
};

const STEP_STATUS_STYLE: Record<WorkflowStepStatus, { cls: string; icon: string }> = {
  concluido: { cls: "cc-wf-step-done", icon: "✓" },
  em_curso: { cls: "cc-wf-step-active", icon: "●" },
  bloqueado: { cls: "cc-wf-step-blocked", icon: "🔒" },
  pendente: { cls: "cc-wf-step-pending", icon: "○" },
  saltado: { cls: "cc-wf-step-pending", icon: "—" },
};

interface Props {
  templates: WorkflowTemplateData[];
  instances: WorkflowInstanceData[];
}

export function WorkflowsView({ templates, instances }: Props) {
  const [tab, setTab] = useState<Tab>("em_curso");
  const [expandedInstance, setExpandedInstance] = useState<string | null>(
    instances.length > 0 ? instances[0].id : null
  );
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  return (
    <>
      <div className="cc-tabs">
        <button className={`cc-tab ${tab === "em_curso" ? "active" : ""}`} onClick={() => setTab("em_curso")}>
          Em curso ({instances.length})
        </button>
        <button className={`cc-tab ${tab === "templates" ? "active" : ""}`} onClick={() => setTab("templates")}>
          Templates ({templates.length})
        </button>
      </div>

      {tab === "em_curso" && (
        <div className="cc-wf-grid">
          {instances.length === 0 && (
            <div className="cc-card" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              Nenhum workflow em curso. Inicia um a partir dos templates.
            </div>
          )}
          {instances.map(inst => (
            <InstanceCard
              key={inst.id}
              instance={inst}
              expanded={expandedInstance === inst.id}
              onToggle={() => setExpandedInstance(expandedInstance === inst.id ? null : inst.id)}
            />
          ))}
        </div>
      )}

      {tab === "templates" && (
        <div className="cc-wf-grid">
          {templates.map(tmpl => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              expanded={expandedTemplate === tmpl.id}
              onToggle={() => setExpandedTemplate(expandedTemplate === tmpl.id ? null : tmpl.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function InstanceCard({ instance, expanded, onToggle }: { instance: WorkflowInstanceData; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="cc-card cc-wf-instance" onClick={onToggle}>
      <div className="cc-wf-instance-header">
        <div>
          <div className="cc-wf-instance-name">{instance.name}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
            <span className="cc-wf-area-badge" style={{ backgroundColor: `${instance.areaColor}18`, color: instance.areaColor }}>
              {instance.area}
            </span>
            <span style={{ marginLeft: 8 }}>Iniciado {formatDateShort(instance.startedAt)}</span>
          </div>
        </div>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
          {instance.progress}%
        </span>
      </div>

      <div className="cc-wf-instance-progress">
        <div className="cc-progress-bar" style={{ flex: 1, height: 8 }}>
          <div className="cc-progress-fill" style={{ width: `${instance.progress}%`, backgroundColor: instance.areaColor }} />
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {instance.completedSteps}/{instance.totalSteps} passos
        </span>
      </div>

      <div className="cc-wf-instance-next">
        Próximo: <strong style={{ color: "var(--text)" }}>{instance.nextStep}</strong> · @{instance.nextStepAssignee}
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }} onClick={e => e.stopPropagation()}>
          {instance.steps.map(step => {
            const style = STEP_STATUS_STYLE[step.status];
            return (
              <div key={step.order} className="cc-wf-step">
                <div className={`cc-wf-step-circle ${style.cls}`}>{style.icon}</div>
                <div className="cc-wf-step-info">
                  <div className="cc-wf-step-title">{step.title}</div>
                  <div className="cc-wf-step-meta">
                    @{step.assignee} · Prazo: {step.deadlineDate ? formatDateShort(step.deadlineDate) : "—"}
                    {step.status === "concluido" && " · Concluído"}
                    {step.status === "bloqueado" && " · Bloqueado (dependências)"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, expanded, onToggle }: { template: WorkflowTemplateData; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="cc-card cc-wf-template" onClick={onToggle} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="cc-wf-template-info">
          <div className="cc-wf-template-name">{template.name}</div>
          <div className="cc-wf-template-desc">{template.description}</div>
          <div className="cc-wf-template-meta">
            <span className="cc-wf-area-badge" style={{ backgroundColor: `${template.areaColor}18`, color: template.areaColor }}>
              {template.area}
            </span>
            <span>{template.stepsCount} passos</span>
            <span>~{template.estimatedDays} dias</span>
            <span className="cc-wf-trigger-badge">{TRIGGER_LABELS[template.triggerType] ?? template.triggerType}</span>
            {template.timesUsed > 0 && <span>Usado {template.timesUsed}x</span>}
          </div>
        </div>
        <button className="cc-wf-start-btn" disabled title="Em breve" onClick={e => e.stopPropagation()} style={{ opacity: 0.5, cursor: "not-allowed" }}>
          Iniciar
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }} onClick={e => e.stopPropagation()}>
          {template.steps.map(step => (
            <div key={step.order} className="cc-wf-step">
              <div className="cc-wf-step-circle cc-wf-step-pending" style={{ fontSize: "0.6rem" }}>{step.order}</div>
              <div className="cc-wf-step-info">
                <div className="cc-wf-step-title">
                  {step.title}
                  {step.isOptional && <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 6 }}>(opcional)</span>}
                </div>
                <div className="cc-wf-step-meta">
                  <span style={{ backgroundColor: priorityColor(step.priority), width: 6, height: 6, borderRadius: "50%", display: "inline-block", marginRight: 4 }} />
                  {step.assigneeRole} · Dia {step.deadlineDays}
                  {step.dependsOn.length > 0 && ` · Depende de: ${step.dependsOn.map(d => `#${d}`).join(", ")}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
