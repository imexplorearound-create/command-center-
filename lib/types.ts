export type Health = "green" | "yellow" | "red";
export type Severity = "info" | "warning" | "critical";
export type Priority = "critica" | "alta" | "media" | "baixa";
export type ProjectType = "interno" | "cliente";
import type { TaskStatusInput } from "@/lib/validation/task-schema";
export type TaskStatus = TaskStatusInput;
export type AlertType = "tarefa_atrasada" | "tarefa_sem_prazo" | "cliente_sem_contacto" | "objectivo_risco" | "aprovacao_pendente" | "sobrecarga" | "fase_sem_planeamento";

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  type: ProjectType;
  status: string;
  health: Health;
  progress: number;
  color: string;
  description: string;
  activeTasks: number;
  overdueTasks: number;
  activePhase?: string;
}

export interface ObjectiveData {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  project?: string;
  projectColor?: string;
  health?: Health;
  relatedTasks?: { id: string; title: string; status: TaskStatus; assignee: string }[];
  history?: { date: string; value: number }[];
}

export interface AlertData {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  description?: string;
}

export interface StatsData {
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  activeProjects: number;
}

export interface SatelliteData {
  value: string | number;
  label: string;
  sub?: string;
}

export interface PhaseData {
  id: string;
  name: string;
  status: "pendente" | "em_curso" | "concluida";
  progress: number;
  startDate: string;
  endDate: string;
}

export type DevStatus = "sem_codigo" | "em_desenvolvimento" | "em_review" | "merged" | "deployed";

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  assigneeId?: string;
  assigneeColor: string;
  phaseId?: string;
  areaId?: string;
  origin?: string;
  deadline?: string;
  daysStale?: number;
  aiExtracted?: boolean;
  aiConfidence?: number;
  validationStatus?: ValidationStatus;
  devStatus?: DevStatus;
  githubBranch?: string;
  githubPrNumber?: number;
  githubPrUrl?: string;
}

export interface PersonOption {
  id: string;
  name: string;
  avatarColor: string;
}

export interface AreaOption {
  id: string;
  name: string;
  color: string;
}

export interface PersonInitial {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  type: string;
  avatarColor: string | null;
  githubUsername: string | null;
}

export interface AreaInitial {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  ownerId: string | null;
}

export interface GithubPR {
  number: number;
  title: string;
  author: string;
  status: "open" | "draft" | "merged" | "closed";
  url: string;
  filesChanged: number;
  openedAt: string;
  linkedTask?: string;
}

export interface GithubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface GithubDeploy {
  id: string;
  status: "success" | "failure";
  branch: string;
  author: string;
  date: string;
}

export interface DevMetrics {
  commitsThisMonth: number;
  prsOpen: number;
  prsMerged: number;
  deploysSuccess: number;
  deploysFailed: number;
  velocity: number;
  activityByWeek: number[];
}

export type WorkflowTrigger = "manual" | "recorrente" | "evento";
export type WorkflowInstanceStatus = "em_curso" | "concluido" | "cancelado" | "pausado";
export type WorkflowStepStatus = "pendente" | "em_curso" | "concluido" | "bloqueado" | "saltado";

export interface WorkflowTemplateData {
  id: string;
  name: string;
  slug: string;
  description: string;
  area: string;
  areaColor: string;
  areaIcon: string;
  triggerType: WorkflowTrigger;
  estimatedDays: number;
  stepsCount: number;
  timesUsed: number;
  steps: WorkflowStepData[];
}

export interface WorkflowStepData {
  order: number;
  title: string;
  assigneeRole: string;
  deadlineDays: number;
  priority: Priority;
  dependsOn: number[];
  isOptional?: boolean;
}

export interface WorkflowInstanceData {
  id: string;
  templateName: string;
  name: string;
  area: string;
  areaColor: string;
  status: WorkflowInstanceStatus;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  nextStep: string;
  nextStepAssignee: string;
  startedAt: string;
  steps: InstanceStepData[];
}

export interface InstanceStepData {
  order: number;
  title: string;
  assignee: string;
  deadlineDate: string;
  status: WorkflowStepStatus;
}

export type InteractionType = "call" | "email" | "decisao" | "documento" | "tarefa" | "nota";

export interface InteractionData {
  id: string;
  type: InteractionType;
  title: string;
  body?: string;
  date: string;
  participants: string[];
  participantIds: string[];
  source?: string;
  sourceRef?: string;
  clientId: string;
  projectId?: string;
}

export interface ClientData {
  id: string;
  companyName: string;
  primaryContact: string;
  status: string;
  daysSinceContact: number;
  contacts: { name: string; role: string; color: string }[];
  nextSteps: { title: string; assignee: string; priority: Priority; deadline?: string }[];
  interactions: InteractionData[];
}

export type ValidationStatus = "por_confirmar" | "auto_confirmado" | "confirmado" | "editado" | "rejeitado";
// Source of truth: lib/maestro/trust-rules.ts. Re-export para uso geral.
import type { ExtractionType } from "./maestro/trust-rules";
export type { ExtractionType };

export interface ValidationItem {
  id: string;
  kind: "task" | "feedback";
  type: ExtractionType;
  title: string;
  project: string;
  confidence: number;
  suggestedAssignee?: string;
  source: string;
  sourceDate: string;
}

export interface TrustScoreData {
  type: ExtractionType;
  score: number;
  confirmations: number;
  edits: number;
  rejections: number;
}

export type ContentStatus = "proposta" | "aprovado" | "em_producao" | "pronto" | "publicado";

export interface ContentItemData {
  id: string;
  title: string;
  format: string;
  status: ContentStatus;
  sourceCallDate?: string;
  platform?: string;
  approvedBy?: string;
  publishedAt?: string;
  projectId?: string;
}

// ─── OKR Types ─────────────────────────────────────────────

export interface KeyResultData {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  deadline: string;
  status: string;
  health?: Health;
  linkedTasks: { id: string; title: string; status: TaskStatus; assignee: string }[];
}

export interface OkrObjectiveData extends ObjectiveData {
  description?: string;
  projectSlug?: string;
  keyResults: KeyResultData[];
  computedProgress: number;
}

export interface OkrSnapshotData {
  date: string;
  value: number;
}

export interface RoadmapItem {
  id: string;
  type: "phase" | "objective" | "key_result";
  title: string;
  project?: string;
  projectColor?: string;
  startDate: string;
  endDate: string;
  progress: number;
  health?: Health;
}

// ─── Feedback Loop ─────────────────────────────────────────

export type FeedbackSessionStatus = "processing" | "ready" | "reviewed" | "archived";
export type FeedbackItemType = "voice_note" | "interaction_anomaly" | "navigation_issue";
export type FeedbackClassification = "bug" | "suggestion" | "question" | "praise";
export type FeedbackItemStatus = "pending" | "accepted" | "rejected" | "converted";

export interface FeedbackSessionData {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  testerName: string;
  status: FeedbackSessionStatus;
  startUrl?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds?: number;
  pagesVisited: string[];
  aiSummary?: string;
  aiClassification?: { themes: string[]; modules: string[]; severity: string };
  itemsCount: number;
  items?: FeedbackItemData[];
  createdAt: string;
}

export interface FeedbackItemData {
  id: string;
  sessionId: string;
  type: FeedbackItemType;
  classification?: FeedbackClassification;
  module?: string;
  priority?: string;
  timestampMs?: number;
  cursorPosition?: { x: number; y: number };
  pageUrl?: string;
  pageTitle?: string;
  voiceAudioUrl?: string;
  voiceTranscript?: string;
  aiSummary?: string;
  taskId?: string;
  status: FeedbackItemStatus;
  reviewedAt?: string;
  createdAt: string;
}

// ─── Project Detail ────────────────────────────────────────

export interface ProjectDetail extends ProjectData {
  phases: PhaseData[];
  tasks: TaskData[];
  client?: ClientData;
  repo?: string;
  github?: {
    prs: GithubPR[];
    commits: GithubCommit[];
    deploys: GithubDeploy[];
    metrics: DevMetrics;
  };
}

// ─── CRM ────────────────────────────────────────────────────

export type OpportunityStage = "contacto_inicial" | "qualificacao" | "proposta" | "negociacao" | "ganho" | "perdido";

export interface OpportunityData {
  id: string;
  title: string;
  stageId: OpportunityStage;
  kanbanOrder: number;
  value: number | null;
  currency: string;
  probability: number;
  contactId: string | null;
  contactName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerColor: string;
  companyName: string | null;
  companyNif: string | null;
  expectedClose: string | null;
  source: string | null;
  daysInStage: number;
  createdAt: string;
}

export interface OpportunityDetailData extends OpportunityData {
  closedAt: string | null;
  convertedProjectId: string | null;
  activities: OpportunityActivityData[];
}

export interface OpportunityActivityData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

// ─── Timetracking ───────────────────────────────────────────

export type TimeEntryStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimeEntryData {
  id: string;
  personId: string;
  personName: string;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  areaId: string | null;
  date: string;
  duration: number;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  isBillable: boolean;
  status: TimeEntryStatus;
  origin: string;
}

export interface WeekSummary {
  days: { date: string; totalMinutes: number; entries: TimeEntryData[] }[];
  weekTotal: number;
  contractedHours: number;
  billableMinutes: number;
}

// ─── Email Records ──────────────────────────────────────────

export interface EmailRecordData {
  id: string;
  gmailId: string;
  threadId: string | null;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  snippet: string | null;
  receivedAt: string;
  direction: string;
  isProcessed: boolean;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  personId: string | null;
  personName: string | null;
  opportunityId: string | null;
  validationStatus: string;
  categorizationMethod: string | null;
}

// ─── Investment Maps ────────────────────────────────────────

export interface InvestmentRubricData {
  id: string;
  name: string;
  budgetAllocated: number;
  budgetExecuted: number;
  executionPercent: number;
  areaId: string | null;
  areaName: string | null;
  sortOrder: number;
}

export interface InvestmentMapData {
  id: string;
  projectId: string;
  projectName: string;
  totalBudget: number;
  totalExecuted: number;
  executionPercent: number;
  fundingSource: string | null;
  fundingPercentage: number | null;
  startDate: string | null;
  endDate: string | null;
  rubrics: InvestmentRubricData[];
}

export interface CrossDepartmentSummary {
  areaId: string;
  areaName: string;
  totalAllocated: number;
  totalExecuted: number;
  executionPercent: number;
  projectCount: number;
}
