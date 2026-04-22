-- AlterTable: handoff fields para produtor externo (Bruno etc.)
ALTER TABLE "tasks" ADD COLUMN "handoff_status" VARCHAR(20),
ADD COLUMN "handoff_agent_id" VARCHAR(100),
ADD COLUMN "handoff_sent_at" TIMESTAMPTZ,
ADD COLUMN "handoff_claimed_at" TIMESTAMPTZ,
ADD COLUMN "handoff_resolved_at" TIMESTAMPTZ,
ADD COLUMN "handoff_resolution" JSONB;

-- CreateIndex
CREATE INDEX "idx_tasks_handoff" ON "tasks"("handoff_status", "handoff_agent_id");
