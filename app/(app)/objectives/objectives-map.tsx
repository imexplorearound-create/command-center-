"use client";

import { useState } from "react";
import Link from "next/link";
import type { OkrObjectiveData, KeyResultData } from "@/lib/types";
import { progressColor, healthBadge, taskStatusColor, formatDateShort, truncate } from "@/lib/utils";

export function ObjectivesMap({ objectives }: { objectives: OkrObjectiveData[] }) {
  const [expandedObj, setExpandedObj] = useState<string | null>(null);
  const [expandedKr, setExpandedKr] = useState<string | null>(null);

  if (objectives.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Nenhum objectivo definido.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
      {objectives.map((obj) => {
        const isExpanded = expandedObj === obj.id;
        return (
          <div key={obj.id} style={{ width: "100%", maxWidth: isExpanded ? 900 : 500, transition: "max-width 0.3s" }}>
            <ObjNode
              obj={obj}
              isExpanded={isExpanded}
              expandedKr={expandedKr}
              onToggle={() => {
                setExpandedObj(isExpanded ? null : obj.id);
                setExpandedKr(null);
              }}
              onToggleKr={(krId) => setExpandedKr(expandedKr === krId ? null : krId)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Objective Node ────────────────────────────────────────

function ObjNode({
  obj,
  isExpanded,
  expandedKr,
  onToggle,
  onToggleKr,
}: {
  obj: OkrObjectiveData;
  isExpanded: boolean;
  expandedKr: string | null;
  onToggle: () => void;
  onToggleKr: (krId: string) => void;
}) {
  const pct = obj.computedProgress;
  const color = obj.projectColor ?? progressColor(pct);
  const badge = healthBadge(obj.health ?? "green");

  return (
    <div style={{
      borderRadius: 14,
      border: `2px solid ${color}`,
      background: "var(--card)",
      overflow: "hidden",
      transition: "all 0.3s",
    }}>
      {/* Header — clickable */}
      <div
        onClick={onToggle}
        style={{
          padding: "16px 20px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{obj.title}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
            {obj.project && <span style={{ color }}>{obj.project} · </span>}
            {obj.keyResults.length} KR{obj.keyResults.length !== 1 && "s"}
            {obj.deadline && <span> · prazo {formatDateShort(obj.deadline)}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color }}>{pct}%</div>
            {obj.targetValue > 0 && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                {obj.currentValue.toLocaleString("pt-PT")} / {obj.targetValue.toLocaleString("pt-PT")} {obj.unit}
              </div>
            )}
          </div>
          <span style={{
            padding: "3px 10px",
            borderRadius: 10,
            fontSize: "0.72rem",
            fontWeight: 600,
            backgroundColor: badge.bg,
            color: badge.color,
          }}>
            {badge.label}
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, backgroundColor: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: color, transition: "width 0.4s" }} />
      </div>

      {/* Expanded: KRs */}
      {isExpanded && (
        <div style={{ padding: "16px 20px 20px", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {obj.keyResults.map((kr) => (
            <KrNode
              key={kr.id}
              kr={kr}
              color={color}
              isExpanded={expandedKr === kr.id}
              onToggle={() => onToggleKr(kr.id)}
              projectSlug={obj.projectSlug}
            />
          ))}
          {obj.keyResults.length === 0 && (
            <div style={{ color: "var(--muted)", fontSize: "0.82rem", padding: 12 }}>
              Sem Key Results definidos
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Key Result Node ───────────────────────────────────────

function KrNode({
  kr,
  color,
  isExpanded,
  onToggle,
  projectSlug,
}: {
  kr: KeyResultData;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  projectSlug?: string;
}) {
  const pct = kr.targetValue > 0 ? Math.round((kr.currentValue / kr.targetValue) * 100) : 0;
  const krColor = progressColor(pct);
  const minW = isExpanded ? 320 : 220;

  return (
    <div style={{
      borderRadius: 10,
      border: `1.5px solid ${isExpanded ? color : "rgba(255,255,255,0.08)"}`,
      background: isExpanded ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
      overflow: "hidden",
      flex: `1 1 ${minW}px`,
      maxWidth: isExpanded ? 400 : 280,
      transition: "all 0.3s",
    }}>
      {/* KR Header */}
      <div
        onClick={onToggle}
        style={{
          padding: "12px 14px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: krColor, flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {kr.title}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 3, paddingLeft: 13 }}>
            {kr.currentValue} / {kr.targetValue} {kr.unit}
            {kr.weight > 1 && <span> · peso x{kr.weight}</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: krColor }}>{pct}%</span>
          {kr.linkedTasks.length > 0 && (
            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              {isExpanded ? "▲" : "▼"}
            </span>
          )}
        </div>
      </div>

      {/* KR progress bar */}
      <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.04)", margin: "0 14px" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: krColor, borderRadius: 2 }} />
      </div>

      {/* Expanded: Tasks + project link */}
      {isExpanded && (
        <div style={{ padding: "10px 14px 14px" }}>
          {kr.linkedTasks.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {kr.linkedTasks.map((task) => (
                <div key={task.id} style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: "0.78rem",
                  padding: "5px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: taskStatusColor(task.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.72rem", flexShrink: 0 }}>@{task.assignee}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8 }}>Sem tasks ligadas</div>
          )}

          {/* Link to project */}
          {projectSlug && (
            <ProjectLink slug={projectSlug} />
          )}

          {kr.deadline && (
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 6 }}>
              Prazo: {formatDateShort(kr.deadline)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Project Link ──────────────────────────────────────────

function ProjectLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/project/${slug}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "0.75rem",
        color: "var(--accent)",
        textDecoration: "none",
        padding: "4px 8px",
        borderRadius: 6,
        background: "rgba(59, 130, 246, 0.08)",
      }}
    >
      → Ver projecto
    </Link>
  );
}
