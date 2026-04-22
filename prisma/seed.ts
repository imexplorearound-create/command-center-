import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("Seeding database...");

  // ─── Tenant ─────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "imexplorearound" },
    update: {},
    create: { slug: "imexplorearound", name: "IM Explore Around" },
  });
  const tenantId = tenant.id;
  console.log("  Tenant ready:", tenant.slug);

  // ─── People (parallel) ──────────────────────────────────
  const [miguel, bruno, sergio, nuno, marcia, membroTeste] = await Promise.all([
    prisma.person.create({
      data: { tenantId, name: "Miguel Martins", email: "miguel@example.com", role: "Co-fundador, Gestão", type: "equipa", avatarColor: "#378ADD" },
    }),
    prisma.person.create({
      data: { tenantId, name: "Bruno Fontes", email: "brunojtfontes@gmail.com", role: "Co-fundador, CTO", type: "equipa", avatarColor: "#1D9E75", githubUsername: "brunojtfontes" },
    }),
    prisma.person.create({
      data: { tenantId, name: "Sérgio Gonçalves", email: "sergio.goncalves@fiscomelres.pt", role: "Proprietário / Contabilidade", type: "cliente", avatarColor: "#534AB7" },
    }),
    prisma.person.create({
      data: { tenantId, name: "Nuno Gonçalves", email: "nuno.goncalves@iniciativapme.pt", role: "Proprietário / Salários", type: "cliente", avatarColor: "#D4537E" },
    }),
    prisma.person.create({
      data: { tenantId, name: "Márcia Costa", email: "marcia.costa@fiscomelres.pt", role: "Contabilidade", type: "cliente", avatarColor: "#BA7517" },
    }),
    prisma.person.create({
      data: { tenantId, name: "Membro Teste", email: "membro@example.com", role: "Programador (teste)", type: "equipa", avatarColor: "#888780" },
    }),
  ]);
  console.log("  People created");

  // ─── Users (auth) ───────────────────────────────────────
  // Senha para todos: commandcenter2026
  const hash = await bcrypt.hash("commandcenter2026", 10);
  await Promise.all([
    prisma.user.create({
      data: { tenantId, email: "miguel@example.com", passwordHash: hash, role: "admin", personId: miguel.id },
    }),
    prisma.user.create({
      data: { tenantId, email: "brunojtfontes@gmail.com", passwordHash: hash, role: "admin", personId: bruno.id },
    }),
    prisma.user.create({
      data: { tenantId, email: "membro@example.com", passwordHash: hash, role: "membro", personId: membroTeste.id },
    }),
    prisma.user.create({
      data: { tenantId, email: "sergio.goncalves@fiscomelres.pt", passwordHash: hash, role: "cliente", personId: sergio.id },
    }),
  ]);
  console.log("  Users created (admin: miguel, brunojtfontes — membro: membro@example.com — cliente: sergio.goncalves@fiscomelres.pt)");

  // ─── Projects (parallel) ────────────────────────────────
  const [aura, ipme, ops, content] = await Promise.all([
    prisma.project.create({
      data: { tenantId, name: "AURA PMS", slug: "aura-pms", type: "interno", status: "ativo", health: "green", progress: 30, color: "#378ADD", description: "Property Management System AI-native para gestores de alojamento local" },
    }),
    prisma.project.create({
      data: { tenantId, name: "iPME Digital", slug: "ipme-digital", type: "cliente", status: "ativo", health: "yellow", progress: 50, color: "#1D9E75", description: "Software de gestão e automação contabilística para PMEs" },
    }),
    prisma.project.create({
      data: { tenantId, name: "Operações", slug: "operacoes", type: "interno", status: "ativo", health: "green", progress: 0, color: "#888780", description: "Infraestrutura, admin, tooling interno" },
    }),
    prisma.project.create({
      data: { tenantId, name: "Conteúdo", slug: "conteudo", type: "interno", status: "ativo", health: "green", progress: 0, color: "#D85A30", description: "Content engine — vídeos, posts, thought leadership" },
    }),
  ]);
  console.log("  Projects created");

  // ─── Phases (batched with createMany) ───────────────────
  await prisma.projectPhase.createMany({
    data: [
      { tenantId, projectId: aura.id, name: "Foundation", phaseOrder: 1, status: "em_curso", progress: 30, startDate: new Date("2026-01-01"), endDate: new Date("2026-03-31") },
      { tenantId, projectId: aura.id, name: "Conectividade", phaseOrder: 2, status: "pendente", progress: 0, startDate: new Date("2026-04-01"), endDate: new Date("2026-05-31") },
      { tenantId, projectId: aura.id, name: "UX e Operações", phaseOrder: 3, status: "pendente", progress: 0, startDate: new Date("2026-06-01"), endDate: new Date("2026-07-31") },
      { tenantId, projectId: aura.id, name: "Portal Proprietários", phaseOrder: 4, status: "pendente", progress: 0, startDate: new Date("2026-08-01"), endDate: new Date("2026-09-30") },
      { tenantId, projectId: aura.id, name: "AI Agents", phaseOrder: 5, status: "pendente", progress: 0, startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31") },
      { tenantId, projectId: ipme.id, name: "Levantamento de Requisitos", phaseOrder: 1, status: "em_curso", progress: 50, startDate: new Date("2026-03-24"), endDate: new Date("2026-04-15") },
      { tenantId, projectId: ipme.id, name: "Proposta e Contrato", phaseOrder: 2, status: "pendente", progress: 0, startDate: new Date("2026-04-15"), endDate: new Date("2026-05-01") },
      { tenantId, projectId: ipme.id, name: "Infraestrutura", phaseOrder: 3, status: "pendente", progress: 0, startDate: new Date("2026-05-01"), endDate: new Date("2026-05-15") },
      { tenantId, projectId: ipme.id, name: "M0 — Captura Documentos", phaseOrder: 4, status: "pendente", progress: 0, startDate: new Date("2026-05-15"), endDate: new Date("2026-06-30") },
      { tenantId, projectId: ipme.id, name: "M1 — Conferências", phaseOrder: 5, status: "pendente", progress: 0, startDate: new Date("2026-07-01"), endDate: new Date("2026-08-31") },
      { tenantId, projectId: ipme.id, name: "M2-M4 — Estudos e Demonstrações", phaseOrder: 6, status: "pendente", progress: 0, startDate: new Date("2026-09-01"), endDate: new Date("2026-11-30") },
      { tenantId, projectId: ipme.id, name: "Estabilização", phaseOrder: 7, status: "pendente", progress: 0, startDate: new Date("2026-12-01"), endDate: new Date("2026-12-31") },
    ],
  });
  console.log("  Phases created");

  // ─── Objectives (batched) ───────────────────────────────
  await prisma.objective.createMany({
    data: [
      { tenantId, title: "Facturar 1M€ em 2026", targetValue: 1000000, currentValue: 120000, unit: "€", deadline: new Date("2026-12-31"), status: "ativo" },
      { tenantId, title: "AURA PMS: 50 propriedades até M4", targetValue: 50, currentValue: 0, unit: "propriedades", deadline: new Date("2026-07-31"), projectId: aura.id, status: "ativo" },
      { tenantId, title: "iPME Digital: contrato fechado", targetValue: 1, currentValue: 0, unit: "contrato", deadline: new Date("2026-05-31"), projectId: ipme.id, status: "ativo" },
    ],
  });
  console.log("  Objectives created");

  // ─── Key Results ────────────────────────────────────────
  const objectives = await prisma.objective.findMany({ orderBy: { createdAt: "asc" } });
  const [objRevenue, objAura, objIpme] = objectives;

  await prisma.keyResult.createMany({
    data: [
      { tenantId, objectiveId: objRevenue.id, title: "Fechar 3 contratos de cliente", targetValue: 3, currentValue: 0, unit: "contratos", weight: 2, deadline: new Date("2026-09-30"), krOrder: 1 },
      { tenantId, objectiveId: objRevenue.id, title: "AURA PMS gerar 50k€ MRR", targetValue: 50000, currentValue: 0, unit: "€", weight: 3, deadline: new Date("2026-12-31"), krOrder: 2 },
      { tenantId, objectiveId: objRevenue.id, title: "Pipeline com 10 leads qualificados", targetValue: 10, currentValue: 2, unit: "leads", weight: 1, deadline: new Date("2026-06-30"), krOrder: 3 },
      { tenantId, objectiveId: objAura.id, title: "Lançar MVP público", targetValue: 1, currentValue: 0, unit: "lançamento", weight: 2, deadline: new Date("2026-05-31"), krOrder: 1 },
      { tenantId, objectiveId: objAura.id, title: "Onboarding 10 propriedades piloto", targetValue: 10, currentValue: 0, unit: "propriedades", weight: 2, deadline: new Date("2026-06-30"), krOrder: 2 },
      { tenantId, objectiveId: objAura.id, title: "NPS piloto >= 8", targetValue: 8, currentValue: 0, unit: "NPS", weight: 1, deadline: new Date("2026-07-31"), krOrder: 3 },
      { tenantId, objectiveId: objIpme.id, title: "Proposta aprovada pelo cliente", targetValue: 1, currentValue: 0, unit: "aprovação", weight: 3, deadline: new Date("2026-04-30"), krOrder: 1 },
      { tenantId, objectiveId: objIpme.id, title: "Contrato assinado", targetValue: 1, currentValue: 0, unit: "contrato", weight: 3, deadline: new Date("2026-05-31"), krOrder: 2 },
    ],
  });
  console.log("  Key Results created");

  // ─── Client ─────────────────────────────────────────────
  const client = await prisma.client.create({
    data: { tenantId, companyName: "Fiscomelres / iPME", projectId: ipme.id, status: "negociacao" },
  });

  await prisma.clientContact.createMany({
    data: [
      { tenantId, clientId: client.id, personId: sergio.id, isPrimary: true },
      { tenantId, clientId: client.id, personId: nuno.id, isPrimary: false },
      { tenantId, clientId: client.id, personId: marcia.id, isPrimary: false },
    ],
  });
  console.log("  Client created");

  // ─── Tasks (batched) ───────────────────────────────────
  await prisma.task.createMany({
    data: [
      { tenantId, title: "Fechar proposta iPME Digital", projectId: ipme.id, assigneeId: miguel.id, status: "a_fazer", priority: "alta", origin: "call", deadline: new Date("2026-04-10") },
      { tenantId, title: "Completar módulos 2-7 Canvas", projectId: ipme.id, assigneeId: bruno.id, status: "em_curso", priority: "alta", origin: "call" },
      { tenantId, title: "Validar requisitos legais com Nuno", projectId: ipme.id, assigneeId: miguel.id, status: "a_fazer", priority: "media", origin: "call" },
      { tenantId, title: "Setup CI/CD pipeline AURA", projectId: aura.id, assigneeId: bruno.id, status: "em_curso", priority: "media", origin: "manual" },
      { tenantId, title: "Configurar Trust Score no AURA PMS", projectId: aura.id, assigneeId: bruno.id, status: "backlog", priority: "media", origin: "manual" },
      { tenantId, title: "Criar servidor Discord", projectId: ops.id, assigneeId: miguel.id, status: "a_fazer", priority: "baixa", origin: "manual" },
      { tenantId, title: "Gravar 3 vídeos de demonstração", projectId: content.id, assigneeId: miguel.id, status: "backlog", priority: "media", origin: "manual" },
      { tenantId, title: "Integrar TOC Online", projectId: ipme.id, assigneeId: bruno.id, status: "backlog", priority: "alta", origin: "call", aiExtracted: true, aiConfidence: 0.78, validationStatus: "por_confirmar" },
    ],
  });
  console.log("  Tasks created");

  // ─── Areas (parallel) ───────────────────────────────────
  const [areaRH, areaOps, areaFin, _areaComercial] = await Promise.all([
    prisma.area.create({ data: { tenantId, name: "Recursos Humanos", slug: "rh", description: "Contratação, onboarding, gestão de equipa, avaliações de desempenho", color: "#D4537E", icon: "users" } }),
    prisma.area.create({ data: { tenantId, name: "Operações", slug: "operacoes", description: "Infraestrutura técnica, admin, tooling, servidores, DevOps", color: "#888780", icon: "cog" } }),
    prisma.area.create({ data: { tenantId, name: "Financeiro", slug: "financeiro", description: "Facturação, contabilidade, pagamentos, tesouraria", color: "#639922", icon: "briefcase" } }),
    prisma.area.create({ data: { tenantId, name: "Comercial", slug: "comercial", description: "Vendas, propostas, relação com clientes, pipeline comercial", color: "#BA7517", icon: "target" } }),
  ]);
  console.log("  Areas created");

  // ─── Workflow Templates (parallel creation, batched steps) ─
  const [onboarding, setupCliente, fechoMensal, contratacao] = await Promise.all([
    prisma.workflowTemplate.create({ data: { tenantId, name: "Onboarding novo colaborador", slug: "onboarding-colaborador", description: "Processo de integração de novos membros da equipa", areaId: areaRH.id, triggerType: "manual", estimatedDurationDays: 30 } }),
    prisma.workflowTemplate.create({ data: { tenantId, name: "Setup novo projeto cliente", slug: "setup-projeto-cliente", description: "Configuração inicial quando se fecha um novo projeto com cliente", areaId: areaOps.id, triggerType: "manual", estimatedDurationDays: 5 } }),
    prisma.workflowTemplate.create({ data: { tenantId, name: "Fecho mensal contabilidade", slug: "fecho-mensal", description: "Processo mensal de fecho de contas e reconciliação", areaId: areaFin.id, triggerType: "recorrente", triggerConfig: { recurrence: "monthly", day: 1 }, estimatedDurationDays: 5 } }),
    prisma.workflowTemplate.create({ data: { tenantId, name: "Processo de contratação", slug: "contratacao", description: "Do anúncio à decisão final de contratação", areaId: areaRH.id, triggerType: "manual", estimatedDurationDays: 21 } }),
  ]);

  // Batch all workflow steps in one createMany
  await prisma.workflowTemplateStep.createMany({
    data: [
      // Onboarding steps
      { tenantId, templateId: onboarding.id, stepOrder: 1, title: "Criar conta no sistema (email, Drive, Discord)", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { tenantId, templateId: onboarding.id, stepOrder: 2, title: "Dar acessos aos projetos relevantes", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [1] },
      { tenantId, templateId: onboarding.id, stepOrder: 3, title: "Atribuir mentor", defaultAssigneeRole: "manager", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { tenantId, templateId: onboarding.id, stepOrder: 4, title: "Enviar manual de boas-vindas e documentação", defaultAssigneeRole: "rh", relativeDeadlineDays: 2, priority: "media", dependsOn: [] },
      { tenantId, templateId: onboarding.id, stepOrder: 5, title: "Agendar formação inicial (ferramentas, processos)", defaultAssigneeRole: "mentor", relativeDeadlineDays: 3, priority: "media", dependsOn: [3] },
      { tenantId, templateId: onboarding.id, stepOrder: 6, title: "Revisão primeira semana — check-in com manager", defaultAssigneeRole: "manager", relativeDeadlineDays: 7, priority: "media", dependsOn: [5] },
      { tenantId, templateId: onboarding.id, stepOrder: 7, title: "Feedback 360° — recolher input da equipa", defaultAssigneeRole: "rh", relativeDeadlineDays: 14, priority: "baixa", dependsOn: [6], isOptional: true },
      { tenantId, templateId: onboarding.id, stepOrder: 8, title: "Revisão 30 dias — avaliação e ajustes", defaultAssigneeRole: "manager", relativeDeadlineDays: 30, priority: "alta", dependsOn: [6] },
      // Setup cliente steps
      { tenantId, templateId: setupCliente.id, stepOrder: 1, title: "Criar pasta no Google Drive com estrutura padrão", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { tenantId, templateId: setupCliente.id, stepOrder: 2, title: "Criar canais no Discord (#dev, #cliente, #decisões)", defaultAssigneeRole: "admin", relativeDeadlineDays: 1, priority: "alta", dependsOn: [] },
      { tenantId, templateId: setupCliente.id, stepOrder: 3, title: "Configurar grupo Telegram com agente discovery", defaultAssigneeRole: "admin", relativeDeadlineDays: 2, priority: "alta", dependsOn: [1] },
      { tenantId, templateId: setupCliente.id, stepOrder: 4, title: "Criar projeto no Command Center com fases e equipa", defaultAssigneeRole: "manager", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { tenantId, templateId: setupCliente.id, stepOrder: 5, title: "Agendar kickoff meeting com cliente", defaultAssigneeRole: "manager", relativeDeadlineDays: 5, priority: "alta", dependsOn: [1, 2, 3] },
      // Fecho mensal steps
      { tenantId, templateId: fechoMensal.id, stepOrder: 1, title: "Reconciliação bancária", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { tenantId, templateId: fechoMensal.id, stepOrder: 2, title: "Verificar faturas pendentes de pagamento", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { tenantId, templateId: fechoMensal.id, stepOrder: 3, title: "Emitir faturas do mês (clientes)", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 3, priority: "alta", dependsOn: [1] },
      { tenantId, templateId: fechoMensal.id, stepOrder: 4, title: "Atualizar previsão de tesouraria", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 4, priority: "media", dependsOn: [1, 2] },
      { tenantId, templateId: fechoMensal.id, stepOrder: 5, title: "Enviar dados ao contabilista", defaultAssigneeRole: "financeiro", relativeDeadlineDays: 5, priority: "alta", dependsOn: [3] },
      { tenantId, templateId: fechoMensal.id, stepOrder: 6, title: "Relatório financeiro mensal para sócios", defaultAssigneeRole: "manager", relativeDeadlineDays: 5, priority: "media", dependsOn: [4] },
      // Contratação steps
      { tenantId, templateId: contratacao.id, stepOrder: 1, title: "Definir perfil e requisitos da função", defaultAssigneeRole: "manager", relativeDeadlineDays: 2, priority: "alta", dependsOn: [] },
      { tenantId, templateId: contratacao.id, stepOrder: 2, title: "Criar e publicar anúncio (LinkedIn, plataformas)", defaultAssigneeRole: "rh", relativeDeadlineDays: 3, priority: "alta", dependsOn: [1] },
      { tenantId, templateId: contratacao.id, stepOrder: 3, title: "Triagem de candidaturas", defaultAssigneeRole: "rh", relativeDeadlineDays: 10, priority: "media", dependsOn: [2] },
      { tenantId, templateId: contratacao.id, stepOrder: 4, title: "Entrevistas (primeira ronda)", defaultAssigneeRole: "manager", relativeDeadlineDays: 14, priority: "alta", dependsOn: [3] },
      { tenantId, templateId: contratacao.id, stepOrder: 5, title: "Entrevista técnica / prova prática", defaultAssigneeRole: "cto", relativeDeadlineDays: 17, priority: "alta", dependsOn: [4] },
      { tenantId, templateId: contratacao.id, stepOrder: 6, title: "Decisão final e proposta", defaultAssigneeRole: "manager", relativeDeadlineDays: 21, priority: "alta", dependsOn: [5] },
    ],
  });
  console.log("  Workflow templates created");

  // ─── Trust Scores (batched) ─────────────────────────────
  await prisma.trustScore.createMany({
    data: [
      { tenantId, extractionType: "tarefa", score: 0 },
      { tenantId, extractionType: "decisao", score: 0 },
      { tenantId, extractionType: "resumo", score: 0 },
      { tenantId, extractionType: "prioridade", score: 0 },
      { tenantId, extractionType: "responsavel", score: 0 },
      { tenantId, extractionType: "conteudo", score: 0 },
    ],
  });

  console.log("  Trust scores initialized");

  // ─── Interactions (Client Hub) ──────────────────────────
  await prisma.interaction.createMany({
    data: [
      { tenantId, projectId: ipme.id, clientId: client.id, type: "call", title: "Reunião kickoff iPME Digital", body: "Sérgio confirmou workflow de reconciliação bancária. Márcia explicou processo actual de conferência manual. Bruno apresentou protótipo.", interactionDate: new Date("2026-03-24T15:00:00Z"), participants: [miguel.id, sergio.id, bruno.id, marcia.id], source: "google_meet" },
      { tenantId, projectId: ipme.id, clientId: client.id, type: "email", title: "Envio proposta comercial v2", body: "Enviado resumo das decisões com próximos passos e timeline proposta.", interactionDate: new Date("2026-03-27T18:00:00Z"), participants: [miguel.id, nuno.id], source: "gmail" },
      { tenantId, projectId: ipme.id, clientId: client.id, type: "decisao", title: "Aprovação módulo contabilidade", body: "Acordado com Sérgio que a integração com o TOC Online é a prioridade. Permite eliminar dupla entrada de dados já na fase 1.", interactionDate: new Date("2026-03-28T16:30:00Z"), participants: [sergio.id, nuno.id, miguel.id], source: "call" },
      { tenantId, projectId: ipme.id, clientId: client.id, type: "documento", title: "Contrato de serviços — rascunho", body: "Actualizado com os inputs da call — adicionados requisitos de reconciliação e conferência.", interactionDate: new Date("2026-04-01T10:00:00Z"), participants: [miguel.id], source: "google_drive" },
      { tenantId, projectId: ipme.id, clientId: client.id, type: "nota", title: "Sérgio pediu integração com TOC Online", body: "Conversa informal depois da call — Sérgio quer avançar mas Nuno tem dúvidas sobre a timeline.", interactionDate: new Date("2026-04-03T17:00:00Z"), participants: [miguel.id, sergio.id] },
      { tenantId, projectId: ipme.id, clientId: client.id, type: "call", title: "Follow-up requisitos salários", body: "Nuno explicou o processo actual de processamento de salários. Márcia mostrou as tabelas que usam.", interactionDate: new Date("2026-04-07T15:00:00Z"), participants: [bruno.id, nuno.id, marcia.id], source: "google_meet" },
    ],
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { lastInteractionAt: new Date("2026-04-07T15:00:00Z"), daysSinceContact: 2 },
  });
  console.log("  Interactions created");

  // ─── Content Items ────────────────────────────────────────
  await prisma.contentItem.createMany({
    data: [
      { tenantId, title: "Como a AI vai mudar a contabilidade", format: "video", status: "publicado", platform: "LinkedIn", projectId: content.id, publishedAt: new Date("2026-03-15"), approvedById: miguel.id, approvedAt: new Date("2026-03-14") },
      { tenantId, title: "Demo AURA PMS — Walkthrough", format: "video", status: "em_producao", platform: "YouTube", projectId: aura.id },
      { tenantId, title: "5 erros que PMEs cometem na gestão", format: "carrossel", status: "aprovado", platform: "Instagram", projectId: content.id, approvedById: miguel.id, approvedAt: new Date("2026-04-05") },
      { tenantId, title: "Podcast: Futuro do AL em Portugal", format: "podcast", status: "proposta" },
      { tenantId, title: "Behind the scenes — Command Center", format: "reels", status: "pronto", platform: "TikTok", projectId: content.id },
    ],
  });
  console.log("  Content items created");

  // ─── GitHub Repos ──────────────────────────────────────
  await prisma.githubRepo.createMany({
    data: [
      { tenantId, projectId: aura.id, repoFullName: "brunojtfontes/aura-pms", defaultBranch: "main" },
      { tenantId, projectId: ipme.id, repoFullName: "brunojtfontes/ipme-digital", defaultBranch: "main" },
    ],
  });
  console.log("  GitHub repos created");

  // ─── Crew (CrewRole + Executor) ─────────────────────────
  // Idempotent via upsert on (tenantId, slug) — safe to re-run.
  const crewRoles = [
    { slug: "pipeline", name: "Pipeline", description: "Leads, opportunities, outbound", color: "#D4A843", glyphKey: "pipeline", order: 1 },
    { slug: "comms",    name: "Comms",    description: "Conversas pós-venda e updates",  color: "#7C5CBF", glyphKey: "comms",    order: 2 },
    { slug: "ops",      name: "Ops",      description: "Código, PRs, CI/CD",              color: "#3B7DD8", glyphKey: "ops",      order: 3 },
    { slug: "qa",       name: "QA",       description: "Triagem de feedback + validação", color: "#2D8A5E", glyphKey: "qa",       order: 4 },
  ];

  const createdRoles = await Promise.all(
    crewRoles.map((r) =>
      prisma.crewRole.upsert({
        where: { tenantId_slug: { tenantId, slug: r.slug } },
        update: { name: r.name, description: r.description, color: r.color, glyphKey: r.glyphKey, order: r.order },
        create: { tenantId, ...r },
      })
    )
  );
  console.log("  CrewRoles ready:", createdRoles.map((r) => r.slug).join(", "));

  const bySlug = Object.fromEntries(createdRoles.map((r) => [r.slug, r]));

  // 1 executor primário (kind=clawbot or claude-code) + 1 fallback humano por papel.
  // api_client_id identifica o executor em chamadas à Agent API — único por tenant.
  const executors = [
    { crewRoleId: bySlug.pipeline!.id, kind: "clawbot",     name: "Clawbot",                   note: "via Clawbot · crm-skill",      isPrimary: true,  apiClientId: "clawbot-pipeline" },
    { crewRoleId: bySlug.pipeline!.id, kind: "humano",      name: "Miguel Martins",            note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
    { crewRoleId: bySlug.comms!.id,    kind: "claude-code", name: "Claude Code · comms-skill", note: "resposta a emails de cliente", isPrimary: true,  apiClientId: "claude-comms" },
    { crewRoleId: bySlug.comms!.id,    kind: "humano",      name: "Miguel Martins",            note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
    { crewRoleId: bySlug.ops!.id,      kind: "claude-code", name: "Claude Code · build-skill", note: "código, PRs, deploys",         isPrimary: true,  apiClientId: "claude-ops" },
    { crewRoleId: bySlug.ops!.id,      kind: "humano",      name: "Bruno Fontes",              note: "via handoff",                  isPrimary: false, personId: bruno.id, apiClientId: null },
    { crewRoleId: bySlug.qa!.id,       kind: "claude-code", name: "Claude Code · triage",      note: "triage-feedback",              isPrimary: true,  apiClientId: "claude-qa" },
    { crewRoleId: bySlug.qa!.id,       kind: "humano",      name: "Miguel Martins",            note: "fallback humano",              isPrimary: false, personId: miguel.id, apiClientId: null },
  ];

  await Promise.all(
    executors
      .filter((e) => e.apiClientId !== null)
      .map((e) =>
        prisma.executor.upsert({
          where: { tenantId_apiClientId: { tenantId, apiClientId: e.apiClientId! } },
          update: {
            crewRoleId: e.crewRoleId,
            kind: e.kind,
            name: e.name,
            note: e.note,
            isPrimary: e.isPrimary,
            personId: e.personId ?? null,
          },
          create: {
            tenantId,
            crewRoleId: e.crewRoleId,
            kind: e.kind,
            name: e.name,
            note: e.note,
            isPrimary: e.isPrimary,
            personId: e.personId ?? null,
            apiClientId: e.apiClientId!,
          },
        }),
      ),
  );

  // Human fallbacks (apiClientId=null) — find-or-create by (crewRoleId, personId).
  await Promise.all(
    executors
      .filter((e) => e.apiClientId === null)
      .map(async (e) => {
        const existing = await prisma.executor.findFirst({
          where: { tenantId, crewRoleId: e.crewRoleId, personId: e.personId, apiClientId: null },
        });
        if (existing) return;
        await prisma.executor.create({
          data: {
            tenantId,
            crewRoleId: e.crewRoleId,
            kind: e.kind,
            name: e.name,
            note: e.note,
            isPrimary: e.isPrimary,
            personId: e.personId,
            apiClientId: null,
          },
        });
      }),
  );
  console.log("  Executors ready:", executors.length);

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
