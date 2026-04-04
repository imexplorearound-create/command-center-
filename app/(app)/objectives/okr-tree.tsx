"use client";

import { useState, useEffect, useActionState } from "react";
import { healthColor, priorityColor, progressPercent, taskStatusColor } from "@/lib/utils";
import { createObjective, createKeyResult, deleteObjective, deleteKeyResult } from "@/lib/okr-actions";
import type { OkrObjectiveData, KeyResultData, TaskStatus } from "@/lib/types";

interface Props {
  objectives: OkrObjectiveData[];
  projects: { id: string; name: string; slug: string; color: string }[];
}

export function OkrTree({ objectives, projects }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {objectives.map((obj) => (
        <ObjectiveCard key={obj.id} objective={obj} projects={projects} />
      ))}

      {showForm ? (
        <ObjectiveForm projects={projects} onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="cc-card"
          style={{
            padding: 16,
            textAlign: "center",
            cursor: "pointer",
            color: "var(--muted)",
            border: "1px dashed var(--border)",
            background: "transparent",
            fontSize: "0.85rem",
          }}
        >
          + Novo Objectivo
        </button>
      )}
    </div>
  );
}

function ObjectiveCard({ objective: obj, projects }: { objective: OkrObjectiveData; projects: Props["projects"] }) {
  const [expanded, setExpanded] = useState(false);
  const [showKrForm, setShowKrForm] = useState(false);
  const hColor = healthColor(obj.health ?? "green");

  return (
    <div className="cc-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
          {obj.projectColor && <div style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: obj.projectColor, flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{obj.title}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
              {obj.project && <span>{obj.project} · </span>}
              {obj.keyResults.length} KR{obj.keyResults.length !== 1 && "s"}
              {obj.deadline && <span> · prazo {obj.deadline}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{obj.computedProgress}%</div>
            {obj.targetValue > 0 && (
              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {obj.currentValue}/{obj.targetValue} {obj.unit}
              </div>
            )}
          </div>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: hColor }} />
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${Math.min(obj.computedProgress, 100)}%`, backgroundColor: hColor, transition: "width 0.3s" }} />
      </div>

      {/* Expanded: Key Results */}
      {expanded && (
        <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {obj.description && (
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", padding: "0 0 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {obj.description}
            </div>
          )}

          {obj.keyResults.map((kr) => (
            <KeyResultCard key={kr.id} kr={kr} objectiveId={obj.id} />
          ))}

          {showKrForm ? (
            <KrForm objectiveId={obj.id} onClose={() => setShowKrForm(false)} />
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowKrForm(true)}
                style={{ fontSize: "0.78rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                + Key Result
              </button>
              <button
                onClick={async () => {
                  if (confirm("Apagar este objectivo e todos os KRs?")) {
                    await deleteObjective(obj.id);
                  }
                }}
                style={{ fontSize: "0.78rem", color: "var(--red)", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}
              >
                Apagar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeyResultCard({ kr, objectiveId }: { kr: KeyResultData; objectiveId: string }) {
  const [showTasks, setShowTasks] = useState(false);
  const pct = progressPercent(kr.currentValue, kr.targetValue);
  const hColor = healthColor(kr.health ?? "green");

  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: hColor, flexShrink: 0 }} />
          <span style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kr.title}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {kr.currentValue}/{kr.targetValue} {kr.unit}
          </span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{pct}%</span>
          {kr.weight > 1 && <span style={{ fontSize: "0.65rem", color: "var(--muted)", padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>x{kr.weight}</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 1, marginTop: 6 }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: hColor, borderRadius: 1 }} />
      </div>

      {/* Tasks toggle */}
      {kr.linkedTasks.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setShowTasks(!showTasks)}
            style={{ fontSize: "0.72rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {kr.linkedTasks.length} tarefa{kr.linkedTasks.length !== 1 && "s"} {showTasks ? "▲" : "▼"}
          </button>
          {showTasks && (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
              {kr.linkedTasks.map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.75rem", color: "var(--muted)" }}>
                  <TaskStatusDot status={t.status} />
                  <span>{t.title}</span>
                  <span style={{ marginLeft: "auto" }}>@{t.assignee}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete KR */}
      <div style={{ marginTop: 4, textAlign: "right" }}>
        <button
          onClick={async () => {
            if (confirm("Apagar este Key Result?")) {
              await deleteKeyResult(kr.id);
            }
          }}
          style={{ fontSize: "0.68rem", color: "var(--red)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}
        >
          apagar
        </button>
      </div>
    </div>
  );
}

function TaskStatusDot({ status }: { status: TaskStatus }) {
  return <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: taskStatusColor(status), flexShrink: 0 }} />;
}

// ─── Forms ─────────────────────────────────────────────────

function ObjectiveForm({ projects, onClose }: { projects: Props["projects"]; onClose: () => void }) {
  const [state, action, pending] = useActionState(createObjective, undefined);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <div className="cc-card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 12 }}>Novo Objectivo</div>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FormInput name="title" placeholder="Título do objectivo" required />
        <FormInput name="description" placeholder="Descrição (opcional)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <FormInput name="targetValue" placeholder="Valor alvo" type="number" />
          <FormInput name="unit" placeholder="Unidade (€, %...)" />
          <FormInput name="deadline" type="date" />
        </div>
        <select name="projectId" style={selectStyle}>
          <option value="">Sem projecto (global)</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {state?.error && <div style={{ color: "var(--red)", fontSize: "0.78rem" }}>{state.error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={pending} style={btnPrimary}>{pending ? "..." : "Criar"}</button>
        </div>
      </form>
    </div>
  );
}

function KrForm({ objectiveId, onClose }: { objectiveId: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(createKeyResult, undefined);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
      <input type="hidden" name="objectiveId" value={objectiveId} />
      <FormInput name="title" placeholder="Título do Key Result" required />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", gap: 6 }}>
        <FormInput name="targetValue" placeholder="Alvo" type="number" />
        <FormInput name="unit" placeholder="Unidade" />
        <FormInput name="deadline" type="date" />
        <FormInput name="weight" placeholder="Peso" type="number" defaultValue="1" />
      </div>
      {state?.error && <div style={{ color: "var(--red)", fontSize: "0.75rem" }}>{state.error}</div>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button type="submit" disabled={pending} style={btnPrimary}>{pending ? "..." : "Criar KR"}</button>
      </div>
    </form>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: "0.82rem",
  color: "var(--text)",
  outline: "none",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: "0.82rem",
  cursor: "pointer",
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: "0.82rem",
  cursor: "pointer",
};
