-- AlterTable
ALTER TABLE "feedback_items" ADD COLUMN     "approval_status" VARCHAR(30) NOT NULL DEFAULT 'needs_review',
ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "rejection_origin" VARCHAR(10),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "test_case_id" UUID,
ADD COLUMN     "verified_at" TIMESTAMPTZ,
ADD COLUMN     "verified_by" UUID,
ADD COLUMN     "verify_rejections_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "test_case_id" UUID;

-- CreateTable
CREATE TABLE "test_sheets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "created_by_api_key_id" UUID,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sheet_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "expected_result" TEXT,
    "module" VARCHAR(100),
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "person_id" UUID,
    "token_hash" TEXT NOT NULL,
    "token_prefix" VARCHAR(16) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_test_sheets_tenant_project" ON "test_sheets"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "idx_test_sheets_archived" ON "test_sheets"("archived_at");

-- CreateIndex
CREATE INDEX "test_cases_tenant_id_idx" ON "test_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_test_cases_archived" ON "test_cases"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_sheet_id_code_key" ON "test_cases"("sheet_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "dev_api_keys_token_hash_key" ON "dev_api_keys"("token_hash");

-- CreateIndex
CREATE INDEX "dev_api_keys_tenant_id_revoked_at_idx" ON "dev_api_keys"("tenant_id", "revoked_at");

-- CreateIndex
CREATE INDEX "idx_feedback_items_tenant_approval" ON "feedback_items"("tenant_id", "approval_status");

-- CreateIndex
CREATE INDEX "idx_feedback_items_tenant_test_case" ON "feedback_items"("tenant_id", "test_case_id");

-- CreateIndex
CREATE INDEX "idx_tasks_test_case" ON "tasks"("test_case_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sheets" ADD CONSTRAINT "test_sheets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sheets" ADD CONSTRAINT "test_sheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sheets" ADD CONSTRAINT "test_sheets_created_by_api_key_id_fkey" FOREIGN KEY ("created_by_api_key_id") REFERENCES "dev_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "test_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_api_keys" ADD CONSTRAINT "dev_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_api_keys" ADD CONSTRAINT "dev_api_keys_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: garante 1 Task aberto por TestCase.
-- Usado por approveFeedback (INSERT ... ON CONFLICT DO NOTHING RETURNING id).
-- Permite que tasks "feito" ou arquivadas não bloqueiem um segundo ciclo (regressão).
CREATE UNIQUE INDEX "tasks_open_testcase_unique"
ON "tasks"("test_case_id")
WHERE "status" <> 'feito'
  AND "archived_at" IS NULL
  AND "test_case_id" IS NOT NULL;
