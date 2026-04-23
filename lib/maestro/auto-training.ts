import "server-only";
import { recordValidation } from "./score-engine";
import { MAESTRO_CHAT_AGENT_ID } from "./trust-rules";

interface TaskSnapshot {
  id: string;
  aiExtracted: boolean;
  validationStatus: string;
  status: string;
}

/**
 * Auto-training: quando uma tarefa `aiExtracted=true` com
 * `validationStatus=auto_confirmado` é concluída pelo humano sem edição
 * prévia, isso é um sinal implícito de que a AI acertou — regista um
 * "confirmar" silencioso no trust score da categoria `tarefa`.
 *
 * Chamado fora do hot-path (best-effort, fire-and-forget).
 */
export function hookAutoTrainingFromTask(
  task: TaskSnapshot,
  newStatus: string,
  performedById: string | null
): void {
  if (!task.aiExtracted) return;
  if (task.validationStatus !== "auto_confirmado") return;
  if (newStatus !== "feito" || task.status === "feito") return;

  recordValidation({
    agentId: MAESTRO_CHAT_AGENT_ID,
    extractionType: "tarefa",
    action: "confirmar",
    entityType: "task",
    entityId: task.id,
    performedById,
  }).catch((err) => {
    console.error("Auto-training recordValidation failed:", err);
  });
}
