-- Sprint 6d — Maestro Briefing diário automático.
-- Inclui também test_case_code_raw (Sprint feedback-loop) que tinha sido
-- aplicado via db push sem migration, ficando aqui registado para prod.

ALTER TABLE "feedback_items"
  ADD COLUMN IF NOT EXISTS "test_case_code_raw" VARCHAR(50);

CREATE TABLE IF NOT EXISTS "maestro_briefings" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "user_id"          UUID         NOT NULL,
  "briefing_date"    DATE         NOT NULL,
  "generated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "locale"           VARCHAR(10)  NOT NULL DEFAULT 'pt-PT',
  "content"          TEXT         NOT NULL,
  "data_snapshot"    JSONB        NOT NULL,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "channel"          VARCHAR(20),
  "delivered_at"     TIMESTAMPTZ,
  "read_at"          TIMESTAMPTZ,
  "error_message"    TEXT,
  "llm_model"        VARCHAR(200),
  "llm_usage_input"  INT,
  "llm_usage_output" INT,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "maestro_briefings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maestro_briefings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION,
  CONSTRAINT "maestro_briefings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "maestro_briefings_user_date_unique"
  ON "maestro_briefings" ("user_id", "briefing_date");

CREATE INDEX IF NOT EXISTS "maestro_briefings_tenant_id_idx"
  ON "maestro_briefings" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_briefings_user_date"
  ON "maestro_briefings" ("user_id", "briefing_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_briefings_status"
  ON "maestro_briefings" ("status", "generated_at");
