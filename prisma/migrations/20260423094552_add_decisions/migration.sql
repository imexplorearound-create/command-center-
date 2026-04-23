-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "context" TEXT,
    "kind" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "crew_role_id" UUID,
    "due_at" TIMESTAMPTZ,
    "snoozed_until" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,
    "resolution_note" TEXT,
    "project_id" UUID,
    "opportunity_id" UUID,
    "task_id" UUID,
    "source_maestro_action_id" UUID,
    "feedback_item_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_decisions_tenant_resolved" ON "decisions"("tenant_id", "resolved_at");

-- CreateIndex
CREATE INDEX "idx_decisions_tenant_crew_resolved" ON "decisions"("tenant_id", "crew_role_id", "resolved_at");

-- CreateIndex
CREATE INDEX "idx_decisions_tenant_due" ON "decisions"("tenant_id", "due_at");

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "crew_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_source_maestro_action_id_fkey" FOREIGN KEY ("source_maestro_action_id") REFERENCES "maestro_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_feedback_item_id_fkey" FOREIGN KEY ("feedback_item_id") REFERENCES "feedback_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
