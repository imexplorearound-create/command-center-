-- AlterTable
ALTER TABLE "feedback_items" ADD COLUMN "repro_steps" TEXT[],
ADD COLUMN "expected_result" TEXT,
ADD COLUMN "actual_result" TEXT,
ADD COLUMN "acceptance_criteria" JSONB,
ADD COLUMN "screenshot_url" TEXT,
ADD COLUMN "ai_drafted_at" TIMESTAMPTZ,
ADD COLUMN "triaged_at" TIMESTAMPTZ,
ADD COLUMN "triaged_by" UUID;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_triaged_by_fkey" FOREIGN KEY ("triaged_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
