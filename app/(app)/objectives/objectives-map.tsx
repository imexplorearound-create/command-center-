"use client";

import type { ObjectiveData } from "@/lib/types";
import { progressPercent, progressColor, healthBadge, taskStatusColor, formatDateShort, truncate } from "@/lib/utils";

const CARD_W = 280;
const CARD_H_MAIN = 140;
const CARD_H_SUB = 120;
const CARD_H_TASK = 44;
const GAP_Y = 60;
const GAP_X = 40;
const TASK_GAP = 6;

export function ObjectivesMap({ objectives }: { objectives: ObjectiveData[] }) {
  if (objectives.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Nenhum objectivo definido.</div>;
  }

  const main = objectives[0];
  const subs = objectives.slice(1);

  const mainPct = progressPercent(main.currentValue, main.targetValue);
  const mainColor = progressColor(mainPct);
  const mainBadge = healthBadge(main.health ?? "green");

  const totalSubsWidth = subs.length * CARD_W + (subs.length - 1) * GAP_X;
  const svgWidth = Math.max(totalSubsWidth + 80, CARD_W + 80);
  const mainX = svgWidth / 2 - CARD_W / 2;
  const mainY = 30;
  const subsStartX = svgWidth / 2 - totalSubsWidth / 2;
  const subsY = mainY + CARD_H_MAIN + GAP_Y;
  const tasksY = subsY + CARD_H_SUB + GAP_Y;

  const subPositions = subs.map((_, i) => ({
    x: subsStartX + i * (CARD_W + GAP_X),
    cx: subsStartX + i * (CARD_W + GAP_X) + CARD_W / 2,
  }));

  const maxTasks = Math.max(...subs.map(s => s.relatedTasks?.length ?? 0), 0);
  const svgHeight = tasksY + maxTasks * (CARD_H_TASK + TASK_GAP) + 40;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 20 }}>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ display: "block", margin: "0 auto" }}>

        {subPositions.map((pos, i) => (
          <path
            key={`line-main-${i}`}
            d={`M ${mainX + CARD_W / 2} ${mainY + CARD_H_MAIN} C ${mainX + CARD_W / 2} ${mainY + CARD_H_MAIN + GAP_Y / 2}, ${pos.cx} ${subsY - GAP_Y / 2}, ${pos.cx} ${subsY}`}
            stroke="var(--border)" strokeWidth="2" fill="none" strokeDasharray="6,4"
          />
        ))}

        {subs.map((sub, i) => (sub.relatedTasks ?? []).map((_, ti) => (
          <path
            key={`line-task-${i}-${ti}`}
            d={`M ${subPositions[i].cx} ${subsY + CARD_H_SUB} C ${subPositions[i].cx} ${subsY + CARD_H_SUB + GAP_Y / 3}, ${subPositions[i].cx} ${tasksY + ti * (CARD_H_TASK + TASK_GAP) - 20}, ${subPositions[i].cx} ${tasksY + ti * (CARD_H_TASK + TASK_GAP)}`}
            stroke="var(--border)" strokeWidth="1.5" fill="none" opacity="0.5"
          />
        )))}

        <g>
          <rect x={mainX} y={mainY} width={CARD_W} height={CARD_H_MAIN} rx="14" fill="var(--card)" stroke={mainColor} strokeWidth="2" />
          <text x={mainX + CARD_W / 2} y={mainY + 28} textAnchor="middle" fill="var(--text)" fontSize="15" fontWeight="700">{main.title}</text>
          <text x={mainX + CARD_W / 2} y={mainY + 64} textAnchor="middle" fill={mainColor} fontSize="28" fontWeight="700">
            {main.currentValue.toLocaleString("pt-PT")} {main.unit}
          </text>
          <text x={mainX + CARD_W / 2} y={mainY + 86} textAnchor="middle" fill="var(--muted)" fontSize="12">
            de {main.targetValue.toLocaleString("pt-PT")} {main.unit} · {mainPct}%
          </text>
          <rect x={mainX + 20} y={mainY + 100} width={CARD_W - 40} height="8" rx="4" fill="var(--border)" />
          <rect x={mainX + 20} y={mainY + 100} width={Math.max(4, (CARD_W - 40) * mainPct / 100)} height="8" rx="4" fill={mainColor} />
          <text x={mainX + 20} y={mainY + 131} fill="var(--muted)" fontSize="10">⏱ Prazo: {formatDateShort(main.deadline)}</text>
          <rect x={mainX + CARD_W - 120} y={mainY + 118} width="110" height="18" rx="9" fill={mainBadge.bg} />
          <text x={mainX + CARD_W - 65} y={mainY + 130} textAnchor="middle" fill={mainBadge.color} fontSize="10" fontWeight="600">● {mainBadge.label}</text>
        </g>

        {subs.map((sub, i) => {
          const sx = subPositions[i].x;
          const pct = progressPercent(sub.currentValue, sub.targetValue);
          const color = sub.projectColor ?? progressColor(pct);
          const badge = healthBadge(sub.health ?? "yellow");

          return (
            <g key={sub.id}>
              <rect x={sx} y={subsY} width={CARD_W} height={CARD_H_SUB} rx="12" fill="var(--card)" stroke={color} strokeWidth="1.5" />
              <circle cx={sx + 16} cy={subsY + 22} r="5" fill={color} />
              <text x={sx + 28} y={subsY + 26} fill="var(--text)" fontSize="13" fontWeight="600">{truncate(sub.title, 30)}</text>
              <text x={sx + CARD_W / 2} y={subsY + 56} textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{sub.currentValue} / {sub.targetValue}</text>
              <text x={sx + CARD_W / 2} y={subsY + 72} textAnchor="middle" fill="var(--muted)" fontSize="11">{sub.unit} · {pct}%</text>
              <rect x={sx + 16} y={subsY + 82} width={CARD_W - 32} height="6" rx="3" fill="var(--border)" />
              <rect x={sx + 16} y={subsY + 82} width={Math.max(3, (CARD_W - 32) * pct / 100)} height="6" rx="3" fill={color} />
              <text x={sx + 16} y={subsY + 108} fill="var(--muted)" fontSize="10">⏱ {formatDateShort(sub.deadline)}</text>
              <rect x={sx + CARD_W - 100} y={subsY + 96} width="88" height="16" rx="8" fill={badge.bg} />
              <text x={sx + CARD_W - 56} y={subsY + 107} textAnchor="middle" fill={badge.color} fontSize="9" fontWeight="600">● {badge.label}</text>
            </g>
          );
        })}

        {subs.map((sub, i) => (sub.relatedTasks ?? []).map((task, ti) => {
          const sx = subPositions[i].x;
          const ty = tasksY + ti * (CARD_H_TASK + TASK_GAP);
          return (
            <g key={`${sub.id}-${task.id}`}>
              <rect x={sx} y={ty} width={CARD_W} height={CARD_H_TASK} rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
              <circle cx={sx + 14} cy={ty + CARD_H_TASK / 2} r="4" fill={taskStatusColor(task.status)} />
              <text x={sx + 26} y={ty + CARD_H_TASK / 2 + 1} fill="var(--text)" fontSize="12" dominantBaseline="middle">{truncate(task.title, 32)}</text>
              <text x={sx + CARD_W - 12} y={ty + CARD_H_TASK / 2 + 1} textAnchor="end" fill="var(--muted)" fontSize="10" dominantBaseline="middle">@{task.assignee}</text>
            </g>
          );
        }))}
      </svg>
    </div>
  );
}
