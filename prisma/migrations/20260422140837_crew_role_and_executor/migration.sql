-- AlterTable
ALTER TABLE "feedback_items" ADD COLUMN     "attributed_crew_role_id" UUID,
ADD COLUMN     "attributed_executor_id" UUID;

-- AlterTable
ALTER TABLE "maestro_actions" ADD COLUMN     "crew_role_id" UUID,
ADD COLUMN     "executor_id" UUID;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "crew_role_id" UUID,
ADD COLUMN     "executor_id" UUID;

-- AlterTable
ALTER TABLE "opportunity_activities" ADD COLUMN     "executor_id" UUID;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "handoff_executor_id" UUID;

-- AlterTable
ALTER TABLE "trust_scores" ADD COLUMN     "executor_id" UUID;

-- CreateTable
CREATE TABLE "crew_roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "color" VARCHAR(7) NOT NULL,
    "glyph_key" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crew_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "crew_role_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "note" VARCHAR(500),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "person_id" UUID,
    "api_client_id" VARCHAR(100),
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crew_roles_tenant_id_idx" ON "crew_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "crew_roles_tenant_slug_unique" ON "crew_roles"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "executors_tenant_id_idx" ON "executors"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_executors_crew_role" ON "executors"("crew_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "executors_tenant_api_client_unique" ON "executors"("tenant_id", "api_client_id");

-- CreateIndex
CREATE INDEX "idx_maestro_actions_executor" ON "maestro_actions"("executor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_maestro_actions_crew_role" ON "maestro_actions"("crew_role_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_opportunities_crew_role" ON "opportunities"("crew_role_id");

-- CreateIndex
CREATE INDEX "idx_trust_scores_executor_type" ON "trust_scores"("executor_id", "extraction_type");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_handoff_executor_id_fkey" FOREIGN KEY ("handoff_executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_actions" ADD CONSTRAINT "maestro_actions_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "crew_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_actions" ADD CONSTRAINT "maestro_actions_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_roles" ADD CONSTRAINT "crew_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executors" ADD CONSTRAINT "executors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executors" ADD CONSTRAINT "executors_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "crew_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executors" ADD CONSTRAINT "executors_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_attributed_crew_role_id_fkey" FOREIGN KEY ("attributed_crew_role_id") REFERENCES "crew_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_attributed_executor_id_fkey" FOREIGN KEY ("attributed_executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "crew_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "executors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
