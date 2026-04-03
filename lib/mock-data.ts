import type { ObjectiveData, AlertData, StatsData, SatelliteData, ProjectDetail, WorkflowTemplateData, WorkflowInstanceData, ValidationItem, TrustScoreData, ContentItemData } from "./types";

export const mockObjectives: ObjectiveData[] = [
  {
    id: "1",
    title: "Facturar 1M€ em 2026",
    targetValue: 1000000,
    currentValue: 120000,
    unit: "€",
    deadline: "2026-12-31",
    health: "yellow",
    history: [
      { date: "2026-01-31", value: 25000 },
      { date: "2026-02-28", value: 58000 },
      { date: "2026-03-31", value: 120000 },
    ],
    relatedTasks: [
      { id: "t1", title: "Fechar proposta iPME Digital", status: "a_fazer", assignee: "Miguel" },
      { id: "t2", title: "Lançar AURA PMS MVP", status: "em_curso", assignee: "Bruno" },
    ],
  },
  {
    id: "2",
    title: "AURA PMS: 50 propriedades até M4",
    targetValue: 50,
    currentValue: 0,
    unit: "propriedades",
    deadline: "2026-07-31",
    project: "AURA PMS",
    projectColor: "#378ADD",
    health: "red",
    history: [
      { date: "2026-01-31", value: 0 },
      { date: "2026-02-28", value: 0 },
      { date: "2026-03-31", value: 0 },
    ],
    relatedTasks: [
      { id: "t3", title: "Setup CI/CD pipeline AURA", status: "em_curso", assignee: "Bruno" },
      { id: "t4", title: "Configurar Trust Score no AURA PMS", status: "backlog", assignee: "Bruno" },
    ],
  },
  {
    id: "3",
    title: "iPME Digital: contrato fechado",
    targetValue: 1,
    currentValue: 0,
    unit: "contrato",
    deadline: "2026-05-31",
    project: "iPME Digital",
    projectColor: "#1D9E75",
    health: "yellow",
    history: [
      { date: "2026-01-31", value: 0 },
      { date: "2026-02-28", value: 0 },
      { date: "2026-03-31", value: 0 },
    ],
    relatedTasks: [
      { id: "t1", title: "Fechar proposta iPME Digital", status: "a_fazer", assignee: "Miguel" },
      { id: "t5", title: "Validar requisitos legais com Nuno", status: "a_fazer", assignee: "Miguel" },
      { id: "t6", title: "Completar módulos 2-7 Canvas", status: "em_curso", assignee: "Bruno" },
    ],
  },
];

export const mockProjectDetails: Record<string, ProjectDetail> = {
  "aura-pms": {
    id: "1", name: "AURA PMS", slug: "aura-pms", type: "interno", status: "ativo", health: "green", progress: 30, color: "#378ADD",
    description: "Property Management System AI-native para gestores de alojamento local",
    activeTasks: 3, overdueTasks: 0, activePhase: "Foundation",
    phases: [
      { id: "p1", name: "Foundation", status: "em_curso", progress: 30, startDate: "2026-01-01", endDate: "2026-03-31" },
      { id: "p2", name: "Conectividade", status: "pendente", progress: 0, startDate: "2026-04-01", endDate: "2026-05-31" },
      { id: "p3", name: "UX e Operações", status: "pendente", progress: 0, startDate: "2026-06-01", endDate: "2026-07-31" },
      { id: "p4", name: "Portal Proprietários", status: "pendente", progress: 0, startDate: "2026-08-01", endDate: "2026-09-30" },
      { id: "p5", name: "AI Agents", status: "pendente", progress: 0, startDate: "2026-10-01", endDate: "2026-10-31" },
    ],
    tasks: [
      { id: "t1", title: "Setup CI/CD pipeline", status: "em_curso", priority: "media", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "manual", devStatus: "em_desenvolvimento", githubBranch: "feature/ci-cd" },
      { id: "t2", title: "Configurar Trust Score", status: "backlog", priority: "media", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "manual" },
      { id: "t3", title: "Implementar auth OAuth", status: "a_fazer", priority: "alta", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "manual", deadline: "2026-04-15" },
      { id: "t4", title: "Design sistema de reservas", status: "backlog", priority: "alta", assignee: "Miguel", assigneeColor: "#378ADD", origin: "call" },
      { id: "t5", title: "Definir schema de propriedades", status: "feito", priority: "alta", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "manual", devStatus: "merged", githubPrNumber: 38, githubPrUrl: "https://github.com/brunojtfontes/aura-pms/pull/38" },
      { id: "t6", title: "Landing page MVP", status: "a_fazer", priority: "media", assignee: "Miguel", assigneeColor: "#378ADD", origin: "manual" },
    ],
    repo: "brunojtfontes/aura-pms",
    github: {
      metrics: { commitsThisMonth: 127, prsOpen: 2, prsMerged: 14, deploysSuccess: 3, deploysFailed: 0, velocity: 8.2, activityByWeek: [32, 28, 41, 26] },
      prs: [
        { number: 42, title: "Integração Booking API", author: "Bruno", status: "open", url: "https://github.com/brunojtfontes/aura-pms/pull/42", filesChanged: 12, openedAt: "2026-03-31", linkedTask: "CC-1 Setup CI/CD pipeline" },
        { number: 43, title: "Fix calendar timezone", author: "Bruno", status: "open", url: "https://github.com/brunojtfontes/aura-pms/pull/43", filesChanged: 3, openedAt: "2026-04-02" },
      ],
      commits: [
        { sha: "abc1234", message: "Fix date parsing in booking module", author: "Bruno", date: "2026-04-02T14:30:00Z" },
        { sha: "def5678", message: "Add booking sync with calendar API", author: "Bruno", date: "2026-04-02T11:15:00Z" },
        { sha: "ghi9012", message: "Update calendar UI components", author: "Bruno", date: "2026-04-01T16:45:00Z" },
        { sha: "jkl3456", message: "Refactor auth middleware", author: "Bruno", date: "2026-04-01T10:20:00Z" },
        { sha: "mno7890", message: "Add property schema migration", author: "Bruno", date: "2026-03-31T18:00:00Z" },
      ],
      deploys: [
        { id: "d1", status: "success", branch: "main", author: "Bruno", date: "2026-04-01T19:00:00Z" },
        { id: "d2", status: "success", branch: "main", author: "Bruno", date: "2026-03-29T17:30:00Z" },
        { id: "d3", status: "success", branch: "main", author: "Bruno", date: "2026-03-26T14:00:00Z" },
      ],
    },
  },
  "ipme-digital": {
    id: "2", name: "iPME Digital", slug: "ipme-digital", type: "cliente", status: "ativo", health: "yellow", progress: 50, color: "#1D9E75",
    description: "Software de gestão e automação contabilística para PMEs",
    activeTasks: 4, overdueTasks: 1, activePhase: "Levantamento de Requisitos",
    phases: [
      { id: "p1", name: "Levantamento de Requisitos", status: "em_curso", progress: 50, startDate: "2026-03-24", endDate: "2026-04-15" },
      { id: "p2", name: "Proposta e Contrato", status: "pendente", progress: 0, startDate: "2026-04-15", endDate: "2026-05-01" },
      { id: "p3", name: "Infraestrutura", status: "pendente", progress: 0, startDate: "2026-05-01", endDate: "2026-05-15" },
      { id: "p4", name: "M0 — Captura Documentos", status: "pendente", progress: 0, startDate: "2026-05-15", endDate: "2026-06-30" },
      { id: "p5", name: "M1 — Conferências", status: "pendente", progress: 0, startDate: "2026-07-01", endDate: "2026-08-31" },
      { id: "p6", name: "M2-M4 — Estudos e Demos", status: "pendente", progress: 0, startDate: "2026-09-01", endDate: "2026-11-30" },
      { id: "p7", name: "Estabilização", status: "pendente", progress: 0, startDate: "2026-12-01", endDate: "2026-12-31" },
    ],
    tasks: [
      { id: "t1", title: "Fechar proposta iPME Digital", status: "a_fazer", priority: "alta", assignee: "Miguel", assigneeColor: "#378ADD", origin: "call", deadline: "2026-04-10", daysStale: 3 },
      { id: "t2", title: "Completar módulos 2-7 Canvas", status: "em_curso", priority: "alta", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "call", devStatus: "em_review", githubBranch: "feature/canvas-modules", githubPrNumber: 15, githubPrUrl: "https://github.com/brunojtfontes/ipme-digital/pull/15" },
      { id: "t3", title: "Validar requisitos legais com Nuno", status: "a_fazer", priority: "media", assignee: "Miguel", assigneeColor: "#378ADD", origin: "call" },
      { id: "t4", title: "Integrar TOC Online", status: "backlog", priority: "alta", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "call", aiExtracted: true, aiConfidence: 0.78 },
      { id: "t5", title: "Preparar demo para Sérgio", status: "feito", priority: "alta", assignee: "Bruno", assigneeColor: "#1D9E75", origin: "call", devStatus: "deployed" },
    ],
    client: {
      companyName: "Fiscomelres / iPME",
      primaryContact: "Sérgio Gonçalves",
      status: "Negociação",
      daysSinceContact: 3,
      contacts: [
        { name: "Sérgio Gonçalves", role: "Proprietário / Contabilidade", color: "#534AB7" },
        { name: "Nuno Gonçalves", role: "Proprietário / Salários", color: "#D4537E" },
        { name: "Márcia Costa", role: "Contabilidade", color: "#BA7517" },
      ],
      nextSteps: [
        { title: "Fechar proposta iPME Digital", assignee: "Miguel", priority: "alta", deadline: "2026-04-10" },
        { title: "Completar módulos 2-7 Canvas", assignee: "Bruno", priority: "alta" },
        { title: "Validar requisitos legais com Nuno", assignee: "Miguel", priority: "media" },
      ],
      interactions: [
        { id: "i1", type: "call", title: "Call de requisitos — módulos 2-7", body: "Sérgio confirmou workflow de reconciliação bancária. Márcia explicou processo actual de conferência manual. Bruno apresentou protótipo do módulo de captura.", date: "2026-03-30T15:00:00Z", participants: ["Sérgio", "Bruno", "Miguel", "Márcia"], source: "google_meet" },
        { id: "i2", type: "decisao", title: "Começar pelo TOC Online", body: "Acordado com Sérgio que a integração com o TOC Online é a prioridade. Permite eliminar dupla entrada de dados já na fase 1.", date: "2026-03-27T16:30:00Z", participants: ["Sérgio", "Bruno"], source: "call" },
        { id: "i3", type: "call", title: "Demo protótipo — captura de faturas", body: "Bruno apresentou protótipo funcional de captura de documentos via OCR. Sérgio ficou impressionado — 'supersónico'. Nuno pediu esclarecimento sobre RGPD.", date: "2026-03-27T15:00:00Z", participants: ["Sérgio", "Bruno", "Miguel", "Nuno"], source: "google_meet" },
        { id: "i4", type: "email", title: "Email resumo enviado à equipa Fiscomelres", body: "Enviado resumo das decisões da call de 27 Mar com próximos passos e timeline proposta.", date: "2026-03-27T18:00:00Z", participants: ["Miguel", "Sérgio"], source: "gmail" },
        { id: "i5", type: "documento", title: "Documento de requisitos v2 criado", body: "Actualizado com os inputs da call de 27 Mar — adicionados requisitos de reconciliação e conferência.", date: "2026-03-26T10:00:00Z", participants: ["Bruno"], source: "google_drive" },
        { id: "i6", type: "call", title: "Primeira call de levantamento", body: "Identificadas dores: matching manual de faturas, reconciliação demorada, falta de visibilidade sobre estado das contas. Sérgio e Nuno explicaram o processo actual.", date: "2026-03-24T15:00:00Z", participants: ["Sérgio", "Nuno", "Miguel", "Bruno"], source: "google_meet" },
        { id: "i7", type: "nota", title: "Nota: Sérgio pareceu hesitante sobre prazo", body: "Conversa informal depois da call — Sérgio quer avançar mas Nuno tem dúvidas sobre a timeline. Pode precisar de mais uma reunião de alinhamento.", date: "2026-03-24T17:00:00Z", participants: ["Miguel"], source: "manual" },
      ],
    },
    repo: "brunojtfontes/ipme-digital",
    github: {
      metrics: { commitsThisMonth: 43, prsOpen: 1, prsMerged: 5, deploysSuccess: 2, deploysFailed: 1, velocity: 3.5, activityByWeek: [8, 12, 15, 8] },
      prs: [
        { number: 15, title: "Canvas modules 2-7 implementation", author: "Bruno", status: "open", url: "https://github.com/brunojtfontes/ipme-digital/pull/15", filesChanged: 24, openedAt: "2026-03-30", linkedTask: "CC-2 Completar módulos 2-7 Canvas" },
      ],
      commits: [
        { sha: "xyz1111", message: "Add module 5: reconciliation", author: "Bruno", date: "2026-04-02T10:00:00Z" },
        { sha: "xyz2222", message: "Fix TOC integration endpoint", author: "Bruno", date: "2026-04-01T15:30:00Z" },
        { sha: "xyz3333", message: "Add module 4: bank statements", author: "Bruno", date: "2026-03-31T14:00:00Z" },
      ],
      deploys: [
        { id: "d1", status: "success", branch: "main", author: "Bruno", date: "2026-03-30T18:00:00Z" },
        { id: "d2", status: "failure", branch: "main", author: "Bruno", date: "2026-03-28T12:00:00Z" },
      ],
    },
  },
  "operacoes": {
    id: "3", name: "Operações", slug: "operacoes", type: "interno", status: "ativo", health: "green", progress: 0, color: "#888780",
    description: "Infraestrutura, admin, tooling interno",
    activeTasks: 1, overdueTasks: 0, activePhase: undefined,
    phases: [],
    tasks: [
      { id: "t1", title: "Criar servidor Discord", status: "a_fazer", priority: "baixa", assignee: "Miguel", assigneeColor: "#378ADD", origin: "manual" },
    ],
  },
  "conteudo": {
    id: "4", name: "Conteúdo", slug: "conteudo", type: "interno", status: "ativo", health: "green", progress: 0, color: "#D85A30",
    description: "Content engine — vídeos, posts, thought leadership",
    activeTasks: 1, overdueTasks: 0, activePhase: undefined,
    phases: [],
    tasks: [
      { id: "t1", title: "Gravar 3 vídeos de demonstração", status: "backlog", priority: "media", assignee: "Miguel", assigneeColor: "#378ADD", origin: "manual" },
    ],
  },
};

// Derived from mockProjectDetails — single source of truth
export const mockProjects = Object.values(mockProjectDetails).map(({ phases, tasks, ...project }) => project);

export const mockAlerts: AlertData[] = [
  {
    id: "1",
    type: "tarefa_atrasada",
    severity: "warning",
    title: '"Fechar proposta iPME" — parada há 3 dias',
    description: "Responsável: Miguel · Prazo: 10 Abr",
  },
  {
    id: "2",
    type: "tarefa_sem_prazo",
    severity: "info",
    title: '"Criar servidor Discord" — sem prazo definido',
    description: "Responsável: Miguel · Projecto: Operações",
  },
  {
    id: "3",
    type: "aprovacao_pendente",
    severity: "info",
    title: '"Integrar TOC Online" — extraída por AI, aguarda confirmação',
    description: "Confiança: 78% · Projecto: iPME Digital",
  },
];

export const mockWorkflowTemplates: WorkflowTemplateData[] = [
  {
    id: "wt1", name: "Onboarding novo colaborador", slug: "onboarding-colaborador",
    description: "Processo de integração de novos membros da equipa — do primeiro dia à revisão dos 30 dias",
    area: "Recursos Humanos", areaColor: "#D4537E", areaIcon: "users",
    triggerType: "manual", estimatedDays: 30, stepsCount: 8, timesUsed: 0,
    steps: [
      { order: 1, title: "Criar conta no sistema (email, Drive, Discord)", assigneeRole: "admin", deadlineDays: 1, priority: "alta", dependsOn: [] },
      { order: 2, title: "Dar acessos aos projetos relevantes", assigneeRole: "admin", deadlineDays: 1, priority: "alta", dependsOn: [1] },
      { order: 3, title: "Atribuir mentor", assigneeRole: "manager", deadlineDays: 1, priority: "alta", dependsOn: [] },
      { order: 4, title: "Enviar manual de boas-vindas", assigneeRole: "rh", deadlineDays: 2, priority: "media", dependsOn: [] },
      { order: 5, title: "Agendar formação inicial", assigneeRole: "mentor", deadlineDays: 3, priority: "media", dependsOn: [3] },
      { order: 6, title: "Revisão primeira semana", assigneeRole: "manager", deadlineDays: 7, priority: "media", dependsOn: [5] },
      { order: 7, title: "Feedback 360°", assigneeRole: "rh", deadlineDays: 14, priority: "baixa", dependsOn: [6], isOptional: true },
      { order: 8, title: "Revisão 30 dias", assigneeRole: "manager", deadlineDays: 30, priority: "alta", dependsOn: [6] },
    ],
  },
  {
    id: "wt2", name: "Setup novo projeto cliente", slug: "setup-projeto-cliente",
    description: "Configuração inicial quando se fecha um novo projeto com cliente",
    area: "Operações", areaColor: "#888780", areaIcon: "cog",
    triggerType: "manual", estimatedDays: 5, stepsCount: 5, timesUsed: 1,
    steps: [
      { order: 1, title: "Criar pasta no Google Drive", assigneeRole: "admin", deadlineDays: 1, priority: "alta", dependsOn: [] },
      { order: 2, title: "Criar canais no Discord", assigneeRole: "admin", deadlineDays: 1, priority: "alta", dependsOn: [] },
      { order: 3, title: "Configurar grupo Telegram", assigneeRole: "admin", deadlineDays: 2, priority: "alta", dependsOn: [1] },
      { order: 4, title: "Criar projeto no Command Center", assigneeRole: "manager", deadlineDays: 2, priority: "alta", dependsOn: [] },
      { order: 5, title: "Agendar kickoff meeting", assigneeRole: "manager", deadlineDays: 5, priority: "alta", dependsOn: [1, 2, 3] },
    ],
  },
  {
    id: "wt3", name: "Fecho mensal contabilidade", slug: "fecho-mensal",
    description: "Processo mensal de fecho de contas e reconciliação",
    area: "Financeiro", areaColor: "#639922", areaIcon: "briefcase",
    triggerType: "recorrente", estimatedDays: 5, stepsCount: 6, timesUsed: 3,
    steps: [
      { order: 1, title: "Reconciliação bancária", assigneeRole: "financeiro", deadlineDays: 2, priority: "alta", dependsOn: [] },
      { order: 2, title: "Verificar faturas pendentes", assigneeRole: "financeiro", deadlineDays: 2, priority: "alta", dependsOn: [] },
      { order: 3, title: "Emitir faturas do mês", assigneeRole: "financeiro", deadlineDays: 3, priority: "alta", dependsOn: [1] },
      { order: 4, title: "Atualizar previsão de tesouraria", assigneeRole: "financeiro", deadlineDays: 4, priority: "media", dependsOn: [1, 2] },
      { order: 5, title: "Enviar dados ao contabilista", assigneeRole: "financeiro", deadlineDays: 5, priority: "alta", dependsOn: [3] },
      { order: 6, title: "Relatório financeiro mensal", assigneeRole: "manager", deadlineDays: 5, priority: "media", dependsOn: [4] },
    ],
  },
  {
    id: "wt4", name: "Processo de contratação", slug: "contratacao",
    description: "Do anúncio à decisão final de contratação",
    area: "Recursos Humanos", areaColor: "#D4537E", areaIcon: "users",
    triggerType: "manual", estimatedDays: 21, stepsCount: 6, timesUsed: 0,
    steps: [
      { order: 1, title: "Definir perfil e requisitos", assigneeRole: "manager", deadlineDays: 2, priority: "alta", dependsOn: [] },
      { order: 2, title: "Criar e publicar anúncio", assigneeRole: "rh", deadlineDays: 3, priority: "alta", dependsOn: [1] },
      { order: 3, title: "Triagem de candidaturas", assigneeRole: "rh", deadlineDays: 10, priority: "media", dependsOn: [2] },
      { order: 4, title: "Entrevistas (primeira ronda)", assigneeRole: "manager", deadlineDays: 14, priority: "alta", dependsOn: [3] },
      { order: 5, title: "Entrevista técnica", assigneeRole: "cto", deadlineDays: 17, priority: "alta", dependsOn: [4] },
      { order: 6, title: "Decisão final e proposta", assigneeRole: "manager", deadlineDays: 21, priority: "alta", dependsOn: [5] },
    ],
  },
];

export const mockWorkflowInstances: WorkflowInstanceData[] = [
  {
    id: "wi1", templateName: "Fecho mensal contabilidade", name: "Fecho mensal — Março 2026",
    area: "Financeiro", areaColor: "#639922", status: "em_curso",
    progress: 33, totalSteps: 6, completedSteps: 2, nextStep: "Emitir faturas do mês", nextStepAssignee: "Miguel",
    startedAt: "2026-04-01",
    steps: [
      { order: 1, title: "Reconciliação bancária", assignee: "Miguel", deadlineDate: "2026-04-03", status: "concluido" },
      { order: 2, title: "Verificar faturas pendentes", assignee: "Miguel", deadlineDate: "2026-04-03", status: "concluido" },
      { order: 3, title: "Emitir faturas do mês", assignee: "Miguel", deadlineDate: "2026-04-04", status: "em_curso" },
      { order: 4, title: "Atualizar previsão de tesouraria", assignee: "Miguel", deadlineDate: "2026-04-05", status: "bloqueado" },
      { order: 5, title: "Enviar dados ao contabilista", assignee: "Miguel", deadlineDate: "2026-04-06", status: "pendente" },
      { order: 6, title: "Relatório financeiro mensal", assignee: "Miguel", deadlineDate: "2026-04-06", status: "pendente" },
    ],
  },
];

export const mockStats: StatsData = {
  totalTasks: 8,
  overdueTasks: 1,
  completedTasks: 0,
  activeProjects: 4,
};

export const mockSatellites: Record<string, SatelliteData> = {
  calls: { value: 3, label: "Calls", sub: "esta semana" },
  content: { value: 1, label: "Conteúdo", sub: "pronto p/ aprovar" },
  discord: { value: 12, label: "Discord", sub: "mensagens hoje" },
  calendar: { value: 2, label: "Calendário", sub: "reuniões hoje" },
  github: { value: "12 commits", label: "GitHub", sub: "2 PRs abertos · 0 deploys falhados" },
};

export const mockValidationItems: ValidationItem[] = [
  { id: "v1", type: "tarefa", title: "Integrar TOC Online", project: "iPME Digital", confidence: 0.78, suggestedAssignee: "Bruno", source: "Call 27 Mar", sourceDate: "2026-03-27" },
  { id: "v2", type: "tarefa", title: "Validar requisitos com Nuno", project: "iPME Digital", confidence: 0.82, suggestedAssignee: "Miguel", source: "Call 30 Mar", sourceDate: "2026-03-30" },
  { id: "v3", type: "decisao", title: "Começar pelo TOC Online", project: "iPME Digital", confidence: 0.91, source: "Call 27 Mar", sourceDate: "2026-03-27" },
  { id: "v4", type: "resumo", title: "Bruno apresentou protótipo funcional de captura OCR", project: "iPME Digital", confidence: 0.88, source: "Call 27 Mar", sourceDate: "2026-03-27" },
  { id: "v5", type: "prioridade", title: "Integração booking API — sugerida como Alta", project: "AURA PMS", confidence: 0.65, source: "Call 31 Mar", sourceDate: "2026-03-31" },
];

export const mockTrustScores: TrustScoreData[] = [
  { type: "tarefa", score: 35, confirmations: 12, edits: 3, rejections: 1 },
  { type: "decisao", score: 12, confirmations: 4, edits: 1, rejections: 2 },
  { type: "resumo", score: 45, confirmations: 18, edits: 2, rejections: 0 },
  { type: "prioridade", score: 8, confirmations: 2, edits: 4, rejections: 3 },
  { type: "responsavel", score: 22, confirmations: 8, edits: 5, rejections: 1 },
  { type: "conteudo", score: 0, confirmations: 0, edits: 0, rejections: 0 },
];

export const mockContentItems: ContentItemData[] = [
  { id: "c1", title: "Supersónico — demo OCR iPME", format: "Call + B-roll", status: "pronto", sourceCallDate: "2026-03-27", platform: "LinkedIn" },
  { id: "c2", title: "Como a AI muda a contabilidade", format: "Avatar AI", status: "em_producao", sourceCallDate: "2026-03-24", platform: "Instagram" },
  { id: "c3", title: "Bastidores: construir um PMS", format: "Mixed", status: "aprovado", sourceCallDate: "2026-03-30", platform: "TikTok" },
  { id: "c4", title: "Property Management em 2026", format: "Avatar AI", status: "proposta", sourceCallDate: "2026-04-01", platform: "LinkedIn" },
  { id: "c5", title: "Reconciliação bancária automática", format: "Call + B-roll", status: "proposta", sourceCallDate: "2026-03-30", platform: "LinkedIn" },
  { id: "c6", title: "AURA PMS — primeiro booking", format: "Mixed", status: "publicado", platform: "LinkedIn", publishedAt: "2026-03-20" },
  { id: "c7", title: "Porquê AI-native?", format: "Avatar AI", status: "publicado", platform: "Instagram", publishedAt: "2026-03-15" },
];
