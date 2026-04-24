-- F3 (B1): 1 Task pode ter N FeedbackItems (múltiplos feedbacks do mesmo
-- TestCase agrupam na mesma task aberta). Antes taskId era @unique (1:1).
-- Os consumidores existentes (/api/agent/handoffs, /api/agent/handoffs/:id/bundle)
-- foram adaptados para lidar com array (take: 1).
DROP INDEX IF EXISTS "feedback_items_task_id_key";

-- Após dropar o @unique, restam 3 hot queries a traversar task → feedbackItems
-- (defer-task-draft, /api/agent/handoffs list + bundle). Index regular evita
-- seq scan em feedback_items.
CREATE INDEX IF NOT EXISTS "idx_feedback_items_task" ON "feedback_items"("task_id");
