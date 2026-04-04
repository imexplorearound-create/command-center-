export type Health = "green" | "yellow" | "red";
export type Severity = "info" | "warning" | "critical";
export type Priority = "critica" | "alta" | "media" | "baixa";
export type ProjectType = "interno" | "cliente";
export type TaskStatus = "backlog" | "a_fazer" | "em_curso" | "em_revisao" | "feito";
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
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  assigneeColor: string;
  origin?: string;
  deadline?: string;
  daysStale?: number;
  aiExtracted?: boolean;
  aiConfidence?: number;
  devStatus?: DevStatus;
  githubBranch?: string;
  githubPrNumber?: number;
  githubPrUrl?: string;
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
  source?: string;
  sourceRef?: string;
}

export interface ClientData {
  companyName: string;
  primaryContact: string;
  status: string;
  daysSinceContact: number;
  contacts: { name: string; role: string; color: string }[];
  nextSteps: { title: string; assignee: string; priority: Priority; deadline?: string }[];
  interactions: InteractionData[];
}

export type ValidationStatus = "por_confirmar" | "auto_confirmado" | "confirmado" | "editado" | "rejeitado";
export type ExtractionType = "tarefa" | "decisao" | "resumo" | "prioridade" | "responsavel" | "conteudo";

export interface ValidationItem {
  id: string;
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
