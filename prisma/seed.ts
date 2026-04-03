import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("Seeding database...");

  // ─── People (parallel) ──────────────────────────────────
  const [miguel, bruno, sergio, nuno, marcia] = await Promise.all([
    prisma.person.create({
      data: { name: "Miguel Martins", email: "miguel@example.com", role: "Co-fundador, Gestão", type: "equipa", avatarColor: "#378ADD" },
    }),
    prisma.person.create({
      data: { name: "Bruno Fontes", email: "brunojtfontes@gmail.com", role: "Co-fundador, CTO", type: "equipa", avatarColor: "#1D9E75", githubUsername: "brunojtfontes" },
    }),
    prisma.person.create({
      data: { name: "Sérgio Gonçalves", email: "sergio.goncalves@fiscomelres.pt", role: "Proprietário / Contabilidade", type: "cliente", avatarColor: "#534AB7" },
    }),
    prisma.person.create({
      data: { name: "Nuno Gonçalves", email: "nuno.goncalves@iniciativapme.pt", role: "Proprietário / Salários", type: "cliente", avatarColor: "#D4537E" },
    }),
    prisma.person.create({
      data: { name: "Márcia Costa", email: "marcia.costa@fiscomelres.pt", role: "Contabilidade", type: "cliente", avatarColor: "#BA7517" },
    }),
  ]);
  console.log("  People created");

  // ─── Users (auth) ───────────────────────────────────────
  const hash = await bcrypt.hash("commandcenter2026", 10);
  await Promise.all([
    prisma.user.create({
      data: { email: "miguel@example.com", passwordHash: hash, role: "admin", personId: miguel.id },
    }),
    prisma.user.create({
      data: { email: "brunojtfontes@gmail.com", passwordHash: hash, role: "admin", personId: bruno.id },
    }),
  ]);
  console.log("  Users created");

  // ─── Projects (parallel) ────────────────────────────────
  const [aura, ipme, ops, content] = await Promise.all([
    prisma.project.create({
      data: { name: "AURA PMS", slug: "aura-pms", type: "interno", status: "ativo", health: "green", progress: 30, color: "#378ADD", description: "Property Management System AI-native para gestores de alojamento local" },
    }),
    prisma.project.create({
      data: { name: "iPME Digital", slug: "ipme-digital", type: "cliente", status: "ativo", health: "yellow", progress: 50, color: "#1D9E75", description: "Software de gestão e automação contabilística para PMEs" },
    }),
    prisma.project.create({
      data: { name: "Operações", slug: "operacoes", type: "interno", status: "ativo", health: "green", progress: 0, color: "#888780", description: "Infraestrutura, admin, tooling interno" },
    }),
    prisma.project.create({
      data: { name: "Conteúdo", slug: "conteudo", type: "interno", status: "ativo", health: "green", progress: 0, color: "#D85A30", description: "Content engine — vídeos, posts, thought leadership" },
    }),
  ]);
  console.log("  Projects created");

  // ─── Phases (batched with createMany) ───────────────────
  await prisma.projectPhase.createMany({
    data: [
      { projectId: aura.id, name: "Foundation", phaseOrder: 1, status: "em_curso", progress: 30, startDate: new Date("2026-01-01"), endDate: new Date("2026-03-31") },
      { projectId: aura.id, name: "Conectividade", phaseOrder: 2, status: "pendente", progress: 0, startDate: new Date("2026-04-01"), endDate: new Date("2026-05-31") },
      { projectId: aura.id, name: "UX e Operações", phaseOrder: 3, status: "pendente", progress: 0, startDate: new Date("2026-06-01"), endDate: new Date("2026-07-31") },
      { projectId: aura.id, name: "Portal Proprietários", phaseOrder: 4, status: "pendente", progress: 0, startDate: new Date("2026-08-01"), endDate: new Date("2026-09-30") },
      { projectId: aura.id, name: "AI Agents", phaseOrder: 5, status: "pendente", progress: 0, startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31") },
      { projectId: ipme.id, name: "Levantamento de Requisitos", phaseOrder: 1, status: "em_curso", progress: 50, startDate: new Date("2026-03-24"), endDate: new Date("2026-04-15") },
      { projectId: ipme.id, name: "Proposta e Contrato", phaseOrder: 2, status: "pendente", progress: 0, startDate: new Date("2026-04-15"), endDate: new Date("2026-05-01") },
      { projectId: ipme.id, name: "Infraestrutura", phaseOrder: 3, status: "pendente", progress: 0, startDate: new Date("2026-05-01"), endDate: new Date("2026-05-15") },
      { projectId: ipme.id, name: "M0 — Captura Documentos", phaseOrder: 4, status: "pendente", progress: 0, startDate: new Date("2026-05-15"), endDate: new Date("2026-06-30") },
      { projectId: ipme.id, name: "M1 — Conferências", phaseOrder: 5, status: "pendente", progress: 0, startDate: new Date("2026-07-01"), endDate: new Date("2026-08-31") },
      { projectId: ipme.id, name: "M2-M4 — Estudos e Demonstrações", phaseOrder: 6, status: "pendente", progress: 0, startDate: new Date("2026-09-01"), endDate: new Date("2026-11-30") },
      { projectId: ipme.id, name: "Estabilização", phaseOrder: 7, status: "pendente", progress: 0, startDate: new Date("2026-12-01"), endDate: new Date("2026-12-31") },
    ],
  });
  console.log("  Phases created");

  // ─── Objectives (batched) ───────────────────────────────
  await prisma.objective.createMany({
    data: [
      { title: "Facturar 1M€ em 2026", targetValue: 1000000, currentValue: 120000, unit: "€", deadline: new Date("2026-12-31"), status: "ativo" },
      { title: "AURA PMS: 50 propriedades até M4", targetValue: 50, currentValue: 0, unit: "propriedades", deadline: new Date("2026-07-31"), projectId: aura.id, status: "ativo" },
      { title: "iPME Digital: contrato fechado", targetValue: 1, currentValue: 0, unit: "contrato", deadline: new Date("2026-05-31"), projectId: ipme.id, status: "ativo" },
    ],
  });
  console.log("  Objectives created");

  // ─── Client ─────────────────────────────────────────────
  const client = await prisma.client.create({
    data: { companyName: "Fiscomelres / iPME", projectId: ipme.id, status: "negociacao" },
  });

  await prisma.clientContact.createMany({
    data: [
      { clientId: client.id, personId: sergio.id, isPrimary: true },
      { clientId: client.id, personId: nuno.id, isPrimary: false },
      { clientId: client.id, personId: marcia.id, isPrimary: false },
    ],
  });
  console.log("  Client created");

  // ─── Tasks (batched) ───────────────────────────────────
  await prisma.task.createMany({
    data: [
      { title: "Fechar proposta iPME Digital", projectId: ipme.id, assigneeId: miguel.id, status: "a_fazer", priority: "alta", origin: "call", deadline: new Date("2026-04-10") },
      { title: "Completar módulos 2-7 Canvas", projectId: ipme.id, assigneeId: bruno.id, status: "em_curso", priority: "alta", origin: "call" },
      { title: "Validar requisitos legais com Nuno", projectId: ipme.id, assigneeId: miguel.id, status: "a_fazer", priority: "media", origin: "call" },
      { title: "Setup CI/CD pipeline AURA", projectId: aura.id, assigneeId: bruno.id, status: "em_curso", priority: "media", origin: "manual" },
      { title: "Configurar Trust Score no AURA PMS", projectId: aura.id, assigneeId: bruno.id, status: "backlog", priority: "media", origin: "manual" },
      { title: "Criar servidor Discord", projectId: ops.id, assigneeId: miguel.id, status: "a_fazer", priority: "baixa", origin: "manual" },
      { title: "Gravar 3 vídeos de demonstração", projectId: content.id, assigneeId: miguel.id, status: "backlog", priority: "media", origin: "manual" },
      { title: "Integrar TOC Online", projectId: ipme.id, assigneeId: bruno.id, status: "backlog", priority: "alta", origin: "call", aiExtracted: true, aiConfidence: 0.78, validationStatus: "por_confirmar" },
    ],
  });
  console.log("  Tasks created");

  // ─── Areas (parallel) ───────────────────────────────────
  const [areaRH, areaOps, areaFin, _areaComercial] = await Promise.all([
    prisma.area.create({ data: { name: "Recursos Humanos", slug: "rh", description: "Contratação, onboarding, gestão de equipa, avaliações de desempenho", color: "#D4537E", icon: "users" } }),
    prisma.area.create({ data: { name: "Operações", slug: "operacoes", description: "Infraestrutura técnica, admin, tooling, servidores, DevOps", color: "#888780", icon: "cog" } }),
    prisma.area.create({ data: { name: "Financeiro", slug: "financeiro", description: "Facturação, contabilidade, pagamentos, tesouraria", color: "#639922", icon: "briefcase" } }),
    prisma.area.create({ data: { name: "Comercial", slug: "comercial", description: "Vendas, propostas, relação com clientes, pipeline comercial", color: "#BA7517", icon: "target" } }),
  ]);
  console.log("  Areas created");

  // ─── Workflow Templates (parallel creation, batched steps) ─
  const [onboarding, setupCliente, fechoMensal, contratacao] = await Promise.all([
    prisma.workflowTemplate.create({ data: { name: "Onboarding novo colaborador", slug: "onboarding-colaborador", description: "Processo de integração de novos membros da equipa", areaId: areaRH.id, triggerType: "manual", estimatedDurationDays: 30 } }),
    prisma.workflowTemplate.create({ data: { name: "Setup novo projeto cliente", slug: "setup-projeto-cliente", description: "Configuração inicial quando se fecha um novo projeto com cliente", areaId: areaOps.id, triggerType: "manual", estimatedDurationDays: 5 } }),
    prisma.workflowTemplate.create({ data: { name: "Fecho mensal contabilidade", slug: "fecho-mensal", description: "Processo mensal de fecho de contas e reconciliação", areaId: areaFin.id, triggerType: "recorrente", triggerConfig: { recurrence: "monthly", day: 1 }, estimatedDurationDays: 5 } }),
    prisma.workflowTemplate.create({ data: { name: "Processo de contratação", slug: "contratacao", description: "Do anúncio à decisão final de contratação", areaId: areaRH.id, triggerType: "manual", estimatedDurationDays: 21 } }),
  ]);

  // Batch all workflow steps in one createMany
  await prisma.workflowTemplateStep.createMany({
    data: [
      // Onboarding steps
      { templateId: onboarding.id, stepOrder: 1, title: "Criar conta no sistema (email, Drive, Discord)", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { templateId: onboarding.id, stepOrder: 2, title: "Dar acessos aos projetos relevantes", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [1] },
      { templateId: onboarding.id, stepOrder: 3, title: "Atribuir mentor", defaultAssigneeRole: "manager", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { templateId: onboarding.id, stepOrder: 4, title: "Enviar manual de boas-vindas e documentação", defaultAssigneeRole: "rh", relativeDeadlineDays: 2, priority: "media", dependsOn: [] },
      { templateId: onboarding.id, stepOrder: 5, title: "Agendar formação inicial (ferramentas, processos)", defaultAssigneeRole: "mentor", relativeDeadlineDays: 3, priority: "media", dependsOn: [3] },
      { templateId: onboarding.id, stepOrder: 6, title: "Revisão primeira semana — check-in com manager", defaultAssigneeRole: "manager", relativeDeadlineDays: 7, priority: "media", dependsOn: [5] },
      { templateId: onboarding.id, stepOrder: 7, title: "Feedback 360° — recolher input da equipa", defaultAssigneeRole: "rh", relativeDeadlineDays: 14, priority: "baixa", dependsOn: [6], isOptional: true },
      { templateId: onboarding.id, stepOrder: 8, title: "Revisão 30 dias — avaliação e ajustes", defaultAssigneeRole: "manager", relativeDeadlineDays: 30, priority: "alta", dependsOn: [6] },
      // Setup cliente steps
      { templateId: setupCliente.id, stepOrder: 1, title: "Criar pasta no Google Drive com estrutura padrão", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { templateId: setupCliente.id, stepOrder: 2, title: "Criar canais no Discord (#dev, #cliente, #decisões)", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { templateId: setupCliente.id, stepOrder: 3, title: "Configurar grupo Telegram com agente discovery", defaultAssigneeRole: "admin", relativeDeadlineDays: 2, priority: "alta", dependsOn: [1] },
      { templateId: setupCliente.id, stepOrder: 4, title: "Criar projeto no Command Center com fases e equipa", defaultAssigneeRole: "manager", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { templateId: setupCliente.id, stepOrder: 5, title: "Agendar kickoff meeting com cliente", defaultAssigneeRole: "manager", relativeDeadlineDays: 5, priority: "alta", dependsOn: [1, 2, 3] },
      // Fecho mensal steps
      { templateId: fechoMensal.id, stepOrder: 1, title: "Reconciliação bancária", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { templateId: fechoMensal.id, stepOrder: 2, title: "Verificar faturas pendentes de pagamento", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { templateId: fechoMensal.id, stepOrder: 3, title: "Emitir faturas do mês (clientes)", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 3, priority: "alta", dependsOn: [1] },
      { templateId: fechoMensal.id, stepOrder: 4, title: "Atualizar previsão de tesouraria", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 4, priority: "media", dependsOn: [1, 2] },
      { templateId: fechoMensal.id, stepOrder: 5, title: "Enviar dados ao contabilista", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 5, priority: "alta", dependsOn: [3] },
      { templateId: fechoMensal.id, stepOrder: 6, title: "Relatório financeiro mensal para sócios", defaultAssigneeRole: "manager", relativeDeadlineDays: 5, priority: "media", dependsOn: [4] },
      // Contratação steps
      { templateId: contratacao.id, stepOrder: 1, title: "Definir perfil e requisitos da função", defaultAssigneeRole: "manager", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { templateId: contratacao.id, stepOrder: 2, title: "Criar e publicar anúncio (LinkedIn, plataformas)", defaultAssigneeRole: "rh", relativeDeadlineDays: 3, priority: "alta", dependsOn: [1] },
      { templateId: contratacao.id, stepOrder: 3, title: "Triagem de candidaturas", defaultAssigneeRole: "rh", relativeDeadlineDays: 10, priority: "media", dependsOn: [2] },
      { templateId: contratacao.id, stepOrder: 4, title: "Entrevistas (primeira ronda)", defaultAssigneeRole: "manager", relativeDeadlineDays: 14, priority: "alta", dependsOn: [3] },
      { templateId: contratacao.id, stepOrder: 5, title: "Entrevista técnica / prova prática", defaultAssigneeRole: "cto", relativeDeadlineDays: 17, priority: "alta", dependsOn: [4] },
      { templateId: contratacao.id, stepOrder: 6, title: "Decisão final e proposta", defaultAssigneeRole: "manager", relativeDeadlineDays: 21, priority: "alta", dependsOn: [5] },
    ],
  });
  console.log("  Workflow templates created");

  // ─── Trust Scores (batched) ─────────────────────────────
  await prisma.trustScore.createMany({
    data: [
      { extractionType: "tarefa", score: 0 },
      { extractionType: "decisao", score: 0 },
      { extractionType: "resumo", score: 0 },
      { extractionType: "prioridade", score: 0 },
      { extractionType: "responsavel", score: 0 },
      { extractionType: "conteudo", score: 0 },
    ],
  });

  console.log("  Trust scores initialized");

  // ─── GitHub Repos ──────────────────────────────────────
  await prisma.githubRepo.createMany({
    data: [
      { projectId: aura.id, repoFullName: "brunojtfontes/aura-pms", defaultBranch: "main" },
      { projectId: ipme.id, repoFullName: "brunojtfontes/ipme-digital", defaultBranch: "main" },
    ],
  });
  console.log("  GitHub repos created");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
