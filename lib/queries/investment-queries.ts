import "server-only";
import { getTenantDb } from "@/lib/tenant";
import { executionPercent } from "@/lib/utils";
import type { InvestmentMapData, InvestmentRubricData, CrossDepartmentSummary } from "@/lib/types";

function formatRubric(r: any): InvestmentRubricData {
  const allocated = Number(r.budgetAllocated);
  const executed = Number(r.budgetExecuted);
  return {
    id: r.id,
    name: r.name,
    budgetAllocated: allocated,
    budgetExecuted: executed,
    executionPercent: executionPercent(executed, allocated),
    areaId: r.areaId,
    areaName: r.area?.name ?? null,
    sortOrder: r.sortOrder,
  };
}

function formatInvestmentMap(map: any): InvestmentMapData {
  const rubrics = map.rubrics.map(formatRubric);
  const totalBudget = Number(map.totalBudget);
  const totalExecuted = rubrics.reduce((sum: number, r: InvestmentRubricData) => sum + r.budgetExecuted, 0);
  return {
    id: map.id,
    projectId: map.projectId,
    projectName: map.project.name,
    totalBudget,
    totalExecuted,
    executionPercent: executionPercent(totalExecuted, totalBudget),
    fundingSource: map.fundingSource,
    fundingPercentage: map.fundingPercentage ? Number(map.fundingPercentage) : null,
    startDate: map.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: map.endDate?.toISOString().slice(0, 10) ?? null,
    rubrics,
  };
}

export async function getInvestmentMapByProject(projectId: string): Promise<InvestmentMapData | null> {
  const db = await getTenantDb();
  const map = await db.investmentMap.findFirst({
    where: { projectId, archivedAt: null },
    include: {
      project: { select: { name: true } },
      rubrics: {
        where: { archivedAt: null },
        include: { area: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!map) return null;

  return formatInvestmentMap(map);
}

export async function getInvestmentMapsOverview(): Promise<InvestmentMapData[]> {
  const db = await getTenantDb();
  const maps = await db.investmentMap.findMany({
    where: { archivedAt: null },
    include: {
      project: { select: { name: true } },
      rubrics: {
        where: { archivedAt: null },
        include: { area: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { project: { name: "asc" } },
  });

  return maps.map(formatInvestmentMap);
}

export function computeCrossDepartmentSummary(maps: InvestmentMapData[]): CrossDepartmentSummary[] {
  const byArea = new Map<string, { name: string; allocated: number; executed: number; projects: Set<string> }>();

  for (const map of maps) {
    for (const r of map.rubrics) {
      if (!r.areaId) continue;
      const key = r.areaId;
      const entry = byArea.get(key) ?? { name: r.areaName ?? "", allocated: 0, executed: 0, projects: new Set() };
      entry.allocated += r.budgetAllocated;
      entry.executed += r.budgetExecuted;
      entry.projects.add(map.projectId);
      byArea.set(key, entry);
    }
  }

  return Array.from(byArea.entries()).map(([areaId, data]) => ({
    areaId,
    areaName: data.name,
    totalAllocated: data.allocated,
    totalExecuted: data.executed,
    executionPercent: executionPercent(data.executed, data.allocated),
    projectCount: data.projects.size,
  }));
}

export async function getCrossDepartmentSummary(): Promise<CrossDepartmentSummary[]> {
  const db = await getTenantDb();
  const rubrics = await db.investmentRubric.findMany({
    where: { archivedAt: null, investmentMap: { archivedAt: null } },
    select: {
      areaId: true,
      budgetAllocated: true,
      budgetExecuted: true,
      area: { select: { id: true, name: true } },
      investmentMap: { select: { projectId: true } },
    },
  });

  const byArea = new Map<string, { name: string; allocated: number; executed: number; projects: Set<string> }>();

  for (const r of rubrics) {
    if (!r.areaId || !r.area) continue;
    const key = r.areaId;
    const entry = byArea.get(key) ?? { name: r.area.name, allocated: 0, executed: 0, projects: new Set() };
    entry.allocated += Number(r.budgetAllocated);
    entry.executed += Number(r.budgetExecuted);
    entry.projects.add(r.investmentMap.projectId);
    byArea.set(key, entry);
  }

  return Array.from(byArea.entries()).map(([areaId, data]) => ({
    areaId,
    areaName: data.name,
    totalAllocated: data.allocated,
    totalExecuted: data.executed,
    executionPercent: executionPercent(data.executed, data.allocated),
    projectCount: data.projects.size,
  }));
}
