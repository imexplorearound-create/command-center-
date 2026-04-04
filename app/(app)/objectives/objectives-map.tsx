"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OkrObjectiveData, KeyResultData } from "@/lib/types";
import { progressColor, healthBadge, taskStatusColor, formatDateShort, truncate, progressPercent } from "@/lib/utils";

const CARD_W = 260;
const CARD_H_OBJ = 130;
const CARD_H_KR = 72;
const CARD_H_TASK = 36;
const GAP_Y = 50;
const GAP_X = 28;
const KR_GAP_X = 16;
const TASK_GAP = 4;

export function ObjectivesMap({ objectives }: { objectives: OkrObjectiveData[] }) {
  const router = useRouter();
  const [expandedKr, setExpandedKr] = useState<string | null>(null);

  if (objectives.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Nenhum objectivo definido.</div>;
  }

  // Layout calculation
  const main = objectives[0];
  const subs = objectives.slice(1);

  // For each sub-objective, calculate its KRs width
  const subLayouts = subs.map((sub) => {
    const krsWidth = sub.keyResults.length > 0
      ? sub.keyResults.length * (CARD_W * 0.75 + KR_GAP_X) - KR_GAP_X
      : 0;
    const colWidth = Math.max(CARD_W, krsWidth);
    return { sub, colWidth, krsWidth };
  });

  // Main objective KRs
  const mainKrsWidth = main.keyResults.length > 0
    ? main.keyResults.length * (CARD_W * 0.75 + KR_GAP_X) - KR_GAP_X
    : 0;

  const totalSubsWidth = subLayouts.reduce((s, l) => s + l.colWidth, 0) + (subs.length - 1) * GAP_X;
  const svgWidth = Math.max(totalSubsWidth + 80, Math.max(CARD_W, mainKrsWidth) + 80, 600);

  // Y positions
  const mainY = 24;
  const mainKrY = mainY + CARD_H_OBJ + GAP_Y * 0.7;
  const subsY = (main.keyResults.length > 0 ? mainKrY + CARD_H_KR : mainY + CARD_H_OBJ) + GAP_Y;
  const subKrY = subsY + CARD_H_OBJ + GAP_Y * 0.6;

  // Expanded KR tasks Y
  const expandedKrData = expandedKr
    ? objectives.flatMap((o) => o.keyResults).find((kr) => kr.id === expandedKr)
    : null;
  const tasksY = subKrY + CARD_H_KR + GAP_Y * 0.5;
  const tasksHeight = expandedKrData ? expandedKrData.linkedTasks.length * (CARD_H_TASK + TASK_GAP) : 0;

  const svgHeight = (expandedKrData ? tasksY + tasksHeight : subKrY + CARD_H_KR) + 50;

  // X positions
  const mainX = svgWidth / 2 - CARD_W / 2;
  const mainCx = svgWidth / 2;
  const mainKrStartX = svgWidth / 2 - mainKrsWidth / 2;

  const subsStartX = svgWidth / 2 - totalSubsWidth / 2;
  let runX = subsStartX;
  const subPositions = subLayouts.map((l) => {
    const x = runX;
    const cx = runX + l.colWidth / 2;
    runX += l.colWidth + GAP_X;
    return { x, cx, colWidth: l.colWidth, krsWidth: l.krsWidth };
  });

  return (
    <div style={{ overflowX: "auto", paddingBottom: 20 }}>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ display: "block", margin: "0 auto" }}>
        <style>{`
          .cc-svg-card { cursor: pointer; }
          .cc-svg-card:hover rect { filter: brightness(1.15); }
          .cc-svg-card:hover text { filter: brightness(1.1); }
        `}</style>

        {/* ═══ MAIN OBJECTIVE ═══ */}
        <ObjCard x={mainX} y={mainY} obj={main} isMain onClick={() => main.projectSlug && router.push(`/project/${main.projectSlug}`)} />

        {/* Lines: Main → Main KRs */}
        {main.keyResults.map((_, ki) => {
          const krCx = mainKrStartX + ki * (CARD_W * 0.75 + KR_GAP_X) + (CARD_W * 0.75) / 2;
          return (
            <BezierLine key={`main-kr-${ki}`} x1={mainCx} y1={mainY + CARD_H_OBJ} x2={krCx} y2={mainKrY} />
          );
        })}

        {/* Main KRs */}
        {main.keyResults.map((kr, ki) => {
          const kx = mainKrStartX + ki * (CARD_W * 0.75 + KR_GAP_X);
          const isExp = expandedKr === kr.id;
          return (
            <KrCard key={kr.id} x={kx} y={mainKrY} kr={kr} expanded={isExp}
              onClick={() => setExpandedKr(isExp ? null : kr.id)} />
          );
        })}

        {/* Lines: Main → Subs */}
        {subPositions.map((pos, i) => (
          <BezierLine key={`main-sub-${i}`} x1={mainCx} y1={main.keyResults.length > 0 ? mainKrY + CARD_H_KR : mainY + CARD_H_OBJ} x2={pos.cx} y2={subsY} dashed />
        ))}

        {/* ═══ SUB OBJECTIVES ═══ */}
        {subs.map((sub, i) => {
          const sx = subPositions[i].cx - CARD_W / 2;
          const krStartX = subPositions[i].cx - subPositions[i].krsWidth / 2;

          return (
            <g key={sub.id}>
              <ObjCard x={sx} y={subsY} obj={sub} onClick={() => sub.projectSlug && router.push(`/project/${sub.projectSlug}`)} />

              {/* Lines: Sub → Sub KRs */}
              {sub.keyResults.map((_, ki) => {
                const krCx = krStartX + ki * (CARD_W * 0.75 + KR_GAP_X) + (CARD_W * 0.75) / 2;
                return (
                  <BezierLine key={`sub-kr-${i}-${ki}`} x1={subPositions[i].cx} y1={subsY + CARD_H_OBJ} x2={krCx} y2={subKrY} />
                );
              })}

              {/* Sub KRs */}
              {sub.keyResults.map((kr, ki) => {
                const kx = krStartX + ki * (CARD_W * 0.75 + KR_GAP_X);
                const isExp = expandedKr === kr.id;
                return (
                  <KrCard key={kr.id} x={kx} y={subKrY} kr={kr} expanded={isExp}
                    onClick={() => setExpandedKr(isExp ? null : kr.id)} />
                );
              })}
            </g>
          );
        })}

        {/* ═══ EXPANDED KR TASKS ═══ */}
        {expandedKrData && expandedKrData.linkedTasks.length > 0 && (() => {
          // Find the KR position
          let krCx = svgWidth / 2;
          // Search in main KRs
          const mainKrIdx = main.keyResults.findIndex((kr) => kr.id === expandedKr);
          if (mainKrIdx >= 0) {
            krCx = mainKrStartX + mainKrIdx * (CARD_W * 0.75 + KR_GAP_X) + (CARD_W * 0.75) / 2;
          } else {
            // Search in sub KRs
            for (let si = 0; si < subs.length; si++) {
              const ki = subs[si].keyResults.findIndex((kr) => kr.id === expandedKr);
              if (ki >= 0) {
                const krStartX = subPositions[si].cx - subPositions[si].krsWidth / 2;
                krCx = krStartX + ki * (CARD_W * 0.75 + KR_GAP_X) + (CARD_W * 0.75) / 2;
                break;
              }
            }
          }
          const taskX = krCx - CARD_W / 2;

          return expandedKrData.linkedTasks.map((task, ti) => {
            const ty = tasksY + ti * (CARD_H_TASK + TASK_GAP);
            return (
              <g key={task.id}>
                {ti === 0 && <line x1={krCx} y1={subKrY + CARD_H_KR} x2={krCx} y2={ty} stroke="var(--border)" strokeWidth="1" opacity="0.4" />}
                {ti > 0 && <line x1={krCx} y1={ty - TASK_GAP} x2={krCx} y2={ty} stroke="var(--border)" strokeWidth="1" opacity="0.3" />}
                <rect x={taskX} y={ty} width={CARD_W} height={CARD_H_TASK} rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="0.5" />
                <circle cx={taskX + 12} cy={ty + CARD_H_TASK / 2} r="3.5" fill={taskStatusColor(task.status)} />
                <text x={taskX + 22} y={ty + CARD_H_TASK / 2 + 1} fill="var(--text)" fontSize="11" dominantBaseline="middle">{truncate(task.title, 28)}</text>
                <text x={taskX + CARD_W - 8} y={ty + CARD_H_TASK / 2 + 1} textAnchor="end" fill="var(--muted)" fontSize="9" dominantBaseline="middle">@{task.assignee}</text>
              </g>
            );
          });
        })()}
      </svg>
    </div>
  );
}

// ─── SVG Components ────────────────────────────────────────

function BezierLine({ x1, y1, x2, y2, dashed }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  const midY = (y1 + y2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      stroke="var(--border)" strokeWidth="1.5" fill="none"
      strokeDasharray={dashed ? "6,4" : undefined}
    />
  );
}

function ObjCard({ x, y, obj, isMain, onClick }: { x: number; y: number; obj: OkrObjectiveData; isMain?: boolean; onClick?: () => void }) {
  const pct = obj.computedProgress;
  const color = obj.projectColor ?? progressColor(pct);
  const badge = healthBadge(obj.health ?? "green");
  const barW = CARD_W - 32;

  return (
    <g className="cc-svg-card" onClick={onClick}>
      <rect x={x} y={y} width={CARD_W} height={CARD_H_OBJ} rx={isMain ? 14 : 12}
        fill="var(--card)" stroke={color} strokeWidth={isMain ? 2.5 : 1.5} />

      {/* Title */}
      <text x={x + CARD_W / 2} y={y + (isMain ? 26 : 24)} textAnchor="middle"
        fill="var(--text)" fontSize={isMain ? 14 : 13} fontWeight="700">
        {truncate(obj.title, 28)}
      </text>

      {/* Big percentage */}
      <text x={x + CARD_W / 2} y={y + (isMain ? 58 : 54)} textAnchor="middle"
        fill={color} fontSize={isMain ? 26 : 22} fontWeight="800">
        {pct}%
      </text>

      {/* Value */}
      <text x={x + CARD_W / 2} y={y + (isMain ? 76 : 72)} textAnchor="middle"
        fill="var(--muted)" fontSize="11">
        {obj.currentValue.toLocaleString("pt-PT")} / {obj.targetValue.toLocaleString("pt-PT")} {obj.unit}
      </text>

      {/* Progress bar */}
      <rect x={x + 16} y={y + (isMain ? 88 : 84)} width={barW} height="6" rx="3" fill="var(--border)" />
      <rect x={x + 16} y={y + (isMain ? 88 : 84)} width={Math.max(3, barW * Math.min(pct, 100) / 100)} height="6" rx="3" fill={color} />

      {/* Footer: KRs count + deadline + health badge */}
      <text x={x + 16} y={y + (isMain ? 115 : 110)} fill="var(--muted)" fontSize="9">
        {obj.keyResults.length} KRs · {formatDateShort(obj.deadline)}
      </text>
      <rect x={x + CARD_W - 86} y={y + (isMain ? 104 : 99)} width="74" height="16" rx="8" fill={badge.bg} />
      <text x={x + CARD_W - 49} y={y + (isMain ? 115 : 110)} textAnchor="middle"
        fill={badge.color} fontSize="9" fontWeight="600">{badge.label}</text>
    </g>
  );
}

function KrCard({ x, y, kr, expanded, onClick }: { x: number; y: number; kr: KeyResultData; expanded: boolean; onClick: () => void }) {
  const w = CARD_W * 0.75;
  const pct = progressPercent(kr.currentValue, kr.targetValue);
  const color = progressColor(pct);
  const barW = w - 20;

  return (
    <g className="cc-svg-card" onClick={onClick}>
      <rect x={x} y={y} width={w} height={CARD_H_KR} rx="8"
        fill="var(--card)" stroke={expanded ? color : "var(--border)"} strokeWidth={expanded ? 2 : 1} />

      {/* Dot + title */}
      <circle cx={x + 11} cy={y + 15} r="4" fill={color} />
      <text x={x + 20} y={y + 18} fill="var(--text)" fontSize="11" fontWeight="600">
        {truncate(kr.title, 22)}
      </text>

      {/* Value + percentage */}
      <text x={x + w / 2} y={y + 38} textAnchor="middle" fill={color} fontSize="14" fontWeight="700">
        {kr.currentValue}/{kr.targetValue} {kr.unit}
      </text>

      {/* Progress bar */}
      <rect x={x + 10} y={y + 48} width={barW} height="4" rx="2" fill="var(--border)" />
      <rect x={x + 10} y={y + 48} width={Math.max(2, barW * Math.min(pct, 100) / 100)} height="4" rx="2" fill={color} />

      {/* Footer */}
      <text x={x + 10} y={y + 65} fill="var(--muted)" fontSize="8">
        {pct}% · x{kr.weight}{kr.linkedTasks.length > 0 ? ` · ${kr.linkedTasks.length} tasks` : ""}
        {expanded ? " ▲" : kr.linkedTasks.length > 0 ? " ▼" : ""}
      </text>
    </g>
  );
}
