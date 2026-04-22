-- AlterTable
ALTER TABLE "feedback_items" ADD COLUMN "archived_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "idx_feedback_items_archived" ON "feedback_items"("archived_at");
