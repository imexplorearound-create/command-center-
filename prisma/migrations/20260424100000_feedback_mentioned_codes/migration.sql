-- Códigos T-NNN mencionados na transcrição mas não resolvidos para testCaseId.
-- Separado de contextSnapshot para preservar a shape array que os consumidores
-- existentes (extractExtraScreenshots, session-view timeline) assumem.
ALTER TABLE "feedback_items"
  ADD COLUMN "mentioned_test_case_codes" TEXT[] DEFAULT ARRAY[]::TEXT[];
