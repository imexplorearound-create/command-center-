import PDFDocument from "pdfkit";

// ─── Helpers ───────────────────────────────────────────────

function createDoc(title: string): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.fontSize(20).text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#666").text(
    `Gerado em ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`,
    { align: "center" }
  );
  doc.moveDown(1);
  doc.fillColor("#000");
  return doc;
}

function sectionHeader(doc: InstanceType<typeof PDFDocument>, text: string) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#1a1a2e").text(text);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#ddd");
  doc.moveDown(0.3);
  doc.fillColor("#000").fontSize(10);
}

function tableRow(doc: InstanceType<typeof PDFDocument>, cols: { text: string; width: number }[]) {
  const y = doc.y;
  let x = 50;
  for (const col of cols) {
    doc.text(col.text, x, y, { width: col.width, lineBreak: false });
    x += col.width;
  }
  doc.moveDown(0.3);
}

function tableHeader(doc: InstanceType<typeof PDFDocument>, cols: { text: string; width: number }[]) {
  doc.font("Helvetica-Bold");
  tableRow(doc, cols);
  doc.font("Helvetica");
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#eee");
  doc.moveDown(0.2);
}

function checkPage(doc: InstanceType<typeof PDFDocument>) {
  if (doc.y > 750) doc.addPage();
}

function docToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ─── Project Report ────────────────────────────────────────

interface ProjectReportData {
  name: string;
  status: string;
  health: string;
  progress: number;
  type: string;
  description: string | null;
  phases: { name: string; status: string; progress: number }[];
  taskStats: { total: number; done: number; inProgress: number };
}

export async function generateProjectReport(project: ProjectReportData): Promise<Buffer> {
  const doc = createDoc(`Relatório: ${project.name}`);

  // Overview
  sectionHeader(doc, "Informação Geral");
  doc.text(`Estado: ${project.status}`);
  doc.text(`Saúde: ${project.health}`);
  doc.text(`Progresso: ${project.progress}%`);
  doc.text(`Tipo: ${project.type}`);
  if (project.description) {
    doc.moveDown(0.3);
    doc.text(project.description, { width: 495 });
  }

  // Phases
  if (project.phases.length > 0) {
    sectionHeader(doc, "Fases");
    tableHeader(doc, [
      { text: "Fase", width: 250 },
      { text: "Estado", width: 120 },
      { text: "Progresso", width: 80 },
    ]);
    for (const phase of project.phases) {
      checkPage(doc);
      tableRow(doc, [
        { text: phase.name, width: 250 },
        { text: phase.status, width: 120 },
        { text: `${phase.progress}%`, width: 80 },
      ]);
    }
  }

  // Task stats
  sectionHeader(doc, "Tarefas");
  doc.text(`Total: ${project.taskStats.total}`);
  doc.text(`Concluídas: ${project.taskStats.done}`);
  doc.text(`Em curso: ${project.taskStats.inProgress}`);

  return docToBuffer(doc);
}

// ─── Timesheet Report ──────────────────────────────────────

interface TimesheetReportEntry {
  personName: string;
  date: string;
  duration: number;
  projectName: string | null;
  isBillable: boolean;
}

export async function generateTimesheetReport(
  entries: TimesheetReportEntry[],
  title: string
): Promise<Buffer> {
  const doc = createDoc(title);

  // Summary by person
  const byPerson = new Map<string, { total: number; billable: number }>();
  for (const e of entries) {
    const curr = byPerson.get(e.personName) ?? { total: 0, billable: 0 };
    curr.total += e.duration;
    if (e.isBillable) curr.billable += e.duration;
    byPerson.set(e.personName, curr);
  }

  sectionHeader(doc, "Resumo por Pessoa");
  tableHeader(doc, [
    { text: "Pessoa", width: 200 },
    { text: "Total (h)", width: 100 },
    { text: "Facturável (h)", width: 100 },
  ]);
  for (const [name, stats] of byPerson) {
    checkPage(doc);
    tableRow(doc, [
      { text: name, width: 200 },
      { text: `${(stats.total / 60).toFixed(1)}`, width: 100 },
      { text: `${(stats.billable / 60).toFixed(1)}`, width: 100 },
    ]);
  }

  // Detail
  sectionHeader(doc, "Detalhe");
  tableHeader(doc, [
    { text: "Data", width: 80 },
    { text: "Pessoa", width: 150 },
    { text: "Projecto", width: 150 },
    { text: "Duração", width: 70 },
  ]);
  for (const e of entries) {
    checkPage(doc);
    tableRow(doc, [
      { text: e.date, width: 80 },
      { text: e.personName, width: 150 },
      { text: e.projectName ?? "-", width: 150 },
      { text: `${(e.duration / 60).toFixed(1)}h`, width: 70 },
    ]);
  }

  return docToBuffer(doc);
}

// ─── Pipeline Report ───────────────────────────────────────

interface PipelineReportData {
  title: string;
  stage: string;
  value: number | null;
  probability: number;
  company: string | null;
  owner: string | null;
}

export async function generatePipelineReport(opportunities: PipelineReportData[]): Promise<Buffer> {
  const doc = createDoc("Pipeline Comercial");

  // Summary by stage
  const byStage = new Map<string, { count: number; totalValue: number }>();
  for (const o of opportunities) {
    const curr = byStage.get(o.stage) ?? { count: 0, totalValue: 0 };
    curr.count++;
    curr.totalValue += Number(o.value ?? 0);
    byStage.set(o.stage, curr);
  }

  sectionHeader(doc, "Resumo por Fase");
  tableHeader(doc, [
    { text: "Fase", width: 200 },
    { text: "Oportunidades", width: 100 },
    { text: "Valor Total (€)", width: 120 },
  ]);
  for (const [stage, stats] of byStage) {
    tableRow(doc, [
      { text: stage, width: 200 },
      { text: String(stats.count), width: 100 },
      { text: stats.totalValue.toLocaleString("pt-PT", { minimumFractionDigits: 2 }), width: 120 },
    ]);
  }

  // Detail
  sectionHeader(doc, "Oportunidades");
  tableHeader(doc, [
    { text: "Título", width: 180 },
    { text: "Empresa", width: 120 },
    { text: "Valor (€)", width: 80 },
    { text: "Prob.", width: 50 },
  ]);
  for (const o of opportunities) {
    checkPage(doc);
    tableRow(doc, [
      { text: o.title, width: 180 },
      { text: o.company ?? "-", width: 120 },
      { text: o.value ? Number(o.value).toLocaleString("pt-PT") : "-", width: 80 },
      { text: `${o.probability}%`, width: 50 },
    ]);
  }

  return docToBuffer(doc);
}
