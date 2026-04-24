-- AlterTable
ALTER TABLE "decisions" ADD COLUMN     "reopened_by" UUID;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_reopened_by_fkey" FOREIGN KEY ("reopened_by") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
