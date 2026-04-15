import * as XLSX from "xlsx";

type Row = Record<string, string | number | null>;

function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: Row[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Sheet name max 31 chars
}

function toBuffer(wb: XLSX.WorkBook): Buffer {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

// ─── Projects ──────────────────────────────────────────────

interface ProjectRow {
  name: string;
  status: string;
  health: string;
  progress: number;
  type: string;
  phases?: { name: string; status: string; progress: number }[];
}

export function generateProjectsExcel(projects: ProjectRow[]): Buffer {
  const wb = createWorkbook();

  const rows: Row[] = projects.map((p) => ({
    Nome: p.name,
    Estado: p.status,
    Saúde: p.health,
    "Progresso (%)": p.progress,
    Tipo: p.type,
    Fases: p.phases?.length ?? 0,
  }));
  addSheet(wb, "Projectos", rows);

  // Phases sheet
  const phaseRows: Row[] = projects.flatMap((p) =>
    (p.phases ?? []).map((ph) => ({
      Projecto: p.name,
      Fase: ph.name,
      Estado: ph.status,
      "Progresso (%)": ph.progress,
    }))
  );
  if (phaseRows.length > 0) addSheet(wb, "Fases", phaseRows);

  return toBuffer(wb);
}

// ─── Timesheets ────────────────────────────────────────────

interface TimeEntryRow {
  personName: string;
  projectName: string | null;
  taskTitle: string | null;
  date: string;
  duration: number;
  isBillable: boolean;
  status: string;
  description: string | null;
}

export function generateTimesheetsExcel(entries: TimeEntryRow[]): Buffer {
  const wb = createWorkbook();

  const rows: Row[] = entries.map((e) => ({
    Pessoa: e.personName,
    Projecto: e.projectName ?? "",
    Tarefa: e.taskTitle ?? "",
    Data: e.date,
    "Duração (min)": e.duration,
    Facturável: e.isBillable ? "Sim" : "Não",
    Estado: e.status,
    Descrição: e.description ?? "",
  }));
  addSheet(wb, "Horas", rows);

  return toBuffer(wb);
}

// ─── Pipeline ──────────────────────────────────────────────

interface OpportunityRow {
  title: string;
  stage: string;
  value: number | null;
  probability: number;
  company: string | null;
  contact: string | null;
  owner: string | null;
  expectedClose: string | null;
  source: string | null;
}

export function generatePipelineExcel(opportunities: OpportunityRow[]): Buffer {
  const wb = createWorkbook();

  const rows: Row[] = opportunities.map((o) => ({
    Título: o.title,
    Fase: o.stage,
    "Valor (€)": o.value,
    "Probabilidade (%)": o.probability,
    Empresa: o.company ?? "",
    Contacto: o.contact ?? "",
    Responsável: o.owner ?? "",
    "Fecho Previsto": o.expectedClose ?? "",
    Origem: o.source ?? "",
  }));
  addSheet(wb, "Pipeline", rows);

  return toBuffer(wb);
}

// ─── People ────────────────────────────────────────────────

interface PersonRow {
  name: string;
  email: string | null;
  role: string | null;
  type: string;
}

export function generatePeopleExcel(people: PersonRow[]): Buffer {
  const wb = createWorkbook();

  const rows: Row[] = people.map((p) => ({
    Nome: p.name,
    Email: p.email ?? "",
    Papel: p.role ?? "",
    Tipo: p.type,
  }));
  addSheet(wb, "Pessoas", rows);

  return toBuffer(wb);
}

// ─── Investments ───────────────────────────────────────────

interface InvestmentRow {
  projectName: string;
  totalBudget: number;
  fundingSource: string | null;
  fundingPercentage: number | null;
  rubrics: { name: string; allocated: number; executed: number; area: string | null }[];
}

export function generateInvestmentsExcel(maps: InvestmentRow[]): Buffer {
  const wb = createWorkbook();

  const overviewRows: Row[] = maps.map((m) => ({
    Projecto: m.projectName,
    "Orçamento Total (€)": m.totalBudget,
    "Fonte de Financiamento": m.fundingSource ?? "",
    "% Financiamento": m.fundingPercentage,
  }));
  addSheet(wb, "Investimentos", overviewRows);

  const rubricRows: Row[] = maps.flatMap((m) =>
    m.rubrics.map((r) => ({
      Projecto: m.projectName,
      Rubrica: r.name,
      "Alocado (€)": r.allocated,
      "Executado (€)": r.executed,
      "Execução (%)": r.allocated > 0 ? Math.round((r.executed / r.allocated) * 100) : 0,
      Departamento: r.area ?? "",
    }))
  );
  if (rubricRows.length > 0) addSheet(wb, "Rubricas", rubricRows);

  return toBuffer(wb);
}
