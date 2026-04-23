-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'membro', 'cliente');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'basic',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'pt-PT',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Lisbon',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "logo_url" VARCHAR(500),
    "onboarding_completed_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_llm_config" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'minimax',
    "endpoint" VARCHAR(500),
    "model" VARCHAR(200) NOT NULL DEFAULT 'default',
    "api_key_encrypted" TEXT,
    "max_tokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_llm_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_catalog" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "label" JSONB NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "route" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_core" BOOLEAN NOT NULL DEFAULT false,
    "tier" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "module_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_module_config" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "module_key" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_module_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_module_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_key" VARCHAR(50) NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(300) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'membro',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "person_id" UUID NOT NULL,
    "telegram_chat_id" VARCHAR(50),
    "whatsapp_phone_id" VARCHAR(20),
    "notification_prefs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_project_access" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_project_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
    "health" VARCHAR(20) NOT NULL DEFAULT 'green',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "color" VARCHAR(7),
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "phase_order" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pendente',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "target_value" DECIMAL(65,30),
    "current_value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50),
    "deadline" DATE,
    "project_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_results" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "target_value" DECIMAL(65,30),
    "current_value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50),
    "weight" INTEGER NOT NULL DEFAULT 1,
    "deadline" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
    "kr_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(300),
    "role" VARCHAR(200),
    "type" VARCHAR(50) NOT NULL,
    "avatar_color" VARCHAR(7),
    "github_username" VARCHAR(100),
    "cost_per_hour" DECIMAL(8,2),
    "weekly_hours" DOUBLE PRECISION DEFAULT 40,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "project_id" UUID,
    "area_id" UUID,
    "phase_id" UUID,
    "assignee_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'backlog',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'media',
    "origin" VARCHAR(100),
    "origin_date" DATE,
    "origin_ref" TEXT,
    "deadline" DATE,
    "completed_at" TIMESTAMPTZ,
    "days_stale" INTEGER NOT NULL DEFAULT 0,
    "kanban_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_extracted" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DECIMAL(65,30),
    "validation_status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "original_data" JSONB,
    "key_result_id" UUID,
    "estimated_hours" DOUBLE PRECISION,
    "github_branch" VARCHAR(300),
    "github_pr_number" INTEGER,
    "github_pr_status" VARCHAR(50),
    "github_pr_url" TEXT,
    "github_last_commit_at" TIMESTAMPTZ,
    "dev_status" VARCHAR(50) NOT NULL DEFAULT 'sem_codigo',

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_name" VARCHAR(300) NOT NULL,
    "project_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
    "last_interaction_at" TIMESTAMPTZ,
    "days_since_contact" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "client_id" UUID,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "source" VARCHAR(100),
    "source_ref" TEXT,
    "participants" UUID[],
    "interaction_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_extracted" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DECIMAL(65,30),
    "validation_status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "original_data" JSONB,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "related_task_id" UUID,
    "related_project_id" UUID,
    "related_client_id" UUID,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "format" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'proposta',
    "source_call_date" DATE,
    "source_call_ref" TEXT,
    "script_path" TEXT,
    "video_path" TEXT,
    "platform" VARCHAR(100),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "project_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_extracted" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DECIMAL(65,30),
    "validation_status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "original_data" JSONB,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_scores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" VARCHAR(100) NOT NULL DEFAULT 'maestro-internal',
    "extraction_type" VARCHAR(100) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "total_confirmations" INTEGER NOT NULL DEFAULT 0,
    "total_edits" INTEGER NOT NULL DEFAULT 0,
    "total_rejections" INTEGER NOT NULL DEFAULT 0,
    "last_interaction_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maestro_actions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" VARCHAR(100) NOT NULL,
    "extraction_type" VARCHAR(100) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "score_delta" INTEGER NOT NULL,
    "score_before" INTEGER NOT NULL,
    "score_after" INTEGER NOT NULL,
    "performed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maestro_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maestro_conversations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'Nova conversa',
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maestro_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maestro_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "tool_results" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maestro_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "area_id" UUID,
    "project_id" UUID,
    "trigger_type" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "trigger_config" JSONB,
    "estimated_duration_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_template_steps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "default_assignee_role" VARCHAR(100),
    "default_assignee_id" UUID,
    "relative_deadline_days" INTEGER,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'media',
    "depends_on" INTEGER[],
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "checklist" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "context" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'em_curso',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "started_by" UUID,
    "project_id" UUID,
    "area_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instance_tasks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "step_id" UUID,
    "task_id" UUID,
    "step_order" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "okr_snapshots" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "okr_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "repo_full_name" VARCHAR(300) NOT NULL,
    "default_branch" VARCHAR(100) NOT NULL DEFAULT 'main',
    "webhook_secret" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "repo_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50),
    "title" VARCHAR(500),
    "description" TEXT,
    "author" VARCHAR(200),
    "author_mapped_id" UUID,
    "branch" VARCHAR(300),
    "pr_number" INTEGER,
    "commit_sha" VARCHAR(40),
    "url" TEXT,
    "task_id" UUID,
    "task_link_method" VARCHAR(50),
    "task_link_confidence" DECIMAL(65,30),
    "raw_payload" JSONB,
    "event_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_metrics_daily" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "repo_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "commits_count" INTEGER NOT NULL DEFAULT 0,
    "prs_opened" INTEGER NOT NULL DEFAULT 0,
    "prs_merged" INTEGER NOT NULL DEFAULT 0,
    "prs_closed" INTEGER NOT NULL DEFAULT 0,
    "issues_opened" INTEGER NOT NULL DEFAULT 0,
    "issues_closed" INTEGER NOT NULL DEFAULT 0,
    "lines_added" INTEGER NOT NULL DEFAULT 0,
    "lines_removed" INTEGER NOT NULL DEFAULT 0,
    "deploys_success" INTEGER NOT NULL DEFAULT 0,
    "deploys_failed" INTEGER NOT NULL DEFAULT 0,
    "active_contributors" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "tester_name" VARCHAR(200) NOT NULL,
    "tester_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
    "start_url" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ NOT NULL,
    "duration_seconds" INTEGER,
    "pages_visited" TEXT[],
    "events_json" JSONB,
    "ai_summary" TEXT,
    "ai_classification" JSONB,
    "items_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "classification" VARCHAR(50),
    "module" VARCHAR(100),
    "priority" VARCHAR(20),
    "timestamp_ms" BIGINT,
    "cursor_position" JSONB,
    "page_url" TEXT,
    "page_title" VARCHAR(300),
    "voice_audio_url" TEXT,
    "voice_transcript" TEXT,
    "ai_summary" TEXT,
    "context_snapshot" JSONB,
    "task_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "stage_id" VARCHAR(50) NOT NULL,
    "kanban_order" INTEGER NOT NULL DEFAULT 0,
    "value" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "contact_id" UUID,
    "owner_id" UUID,
    "company_name" VARCHAR(300),
    "company_nif" VARCHAR(20),
    "expected_close" DATE,
    "closed_at" TIMESTAMPTZ,
    "source" VARCHAR(100),
    "converted_project_id" UUID,
    "stage_entered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validation_status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "ai_confidence" DECIMAL(65,30),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "task_id" UUID,
    "project_id" UUID,
    "area_id" UUID,
    "date" DATE NOT NULL,
    "duration" INTEGER NOT NULL,
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,
    "description" TEXT,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "origin" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "gmail_id" VARCHAR(200) NOT NULL,
    "thread_id" VARCHAR(200),
    "from" VARCHAR(500) NOT NULL,
    "to" VARCHAR(500)[],
    "cc" VARCHAR(500)[],
    "subject" VARCHAR(1000) NOT NULL,
    "snippet" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL,
    "direction" VARCHAR(10) NOT NULL DEFAULT 'inbound',
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "project_id" UUID,
    "client_id" UUID,
    "person_id" UUID,
    "opportunity_id" UUID,
    "categorization_method" VARCHAR(50),
    "validation_status" VARCHAR(20) NOT NULL DEFAULT 'por_confirmar',
    "ai_confidence" DECIMAL(65,30),
    "interaction_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_maps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "total_budget" DECIMAL(14,2) NOT NULL,
    "funding_source" VARCHAR(200),
    "funding_percentage" DECIMAL(5,2),
    "start_date" DATE,
    "end_date" DATE,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_rubrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "investment_map_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "budget_allocated" DECIMAL(14,2) NOT NULL,
    "budget_executed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "area_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "html_content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "audience_filter" JSONB NOT NULL DEFAULT '{}',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "template_id" UUID,
    "created_by" UUID,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "html_content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "person_id" UUID,
    "email" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_llm_config_tenant_id_key" ON "tenant_llm_config"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_catalog_key_key" ON "module_catalog"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_module_config_tenant_id_module_key_key" ON "tenant_module_config"("tenant_id", "module_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_access_user_id_module_key_key" ON "user_module_access"("user_id", "module_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_person_id_key" ON "users"("person_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "user_project_access_tenant_id_idx" ON "user_project_access"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_project_access_user_id_project_id_key" ON "user_project_access"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_slug_key" ON "projects"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "project_phases_tenant_id_idx" ON "project_phases"("tenant_id");

-- CreateIndex
CREATE INDEX "objectives_tenant_id_idx" ON "objectives"("tenant_id");

-- CreateIndex
CREATE INDEX "key_results_tenant_id_idx" ON "key_results"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_key_results_objective" ON "key_results"("objective_id");

-- CreateIndex
CREATE INDEX "people_tenant_id_idx" ON "people"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_people_archived" ON "people"("archived_at");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_idx" ON "tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tasks_project" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "idx_tasks_assignee" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_priority" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "idx_tasks_archived" ON "tasks"("archived_at");

-- CreateIndex
CREATE INDEX "idx_tasks_kanban" ON "tasks"("project_id", "status", "kanban_order");

-- CreateIndex
CREATE UNIQUE INDEX "clients_project_id_key" ON "clients"("project_id");

-- CreateIndex
CREATE INDEX "clients_tenant_id_idx" ON "clients"("tenant_id");

-- CreateIndex
CREATE INDEX "client_contacts_tenant_id_idx" ON "client_contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "interactions_tenant_id_idx" ON "interactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_interactions_project" ON "interactions"("project_id");

-- CreateIndex
CREATE INDEX "idx_interactions_client" ON "interactions"("client_id");

-- CreateIndex
CREATE INDEX "idx_interactions_date" ON "interactions"("interaction_date" DESC);

-- CreateIndex
CREATE INDEX "alerts_tenant_id_idx" ON "alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_alerts_dismissed" ON "alerts"("is_dismissed");

-- CreateIndex
CREATE INDEX "content_items_tenant_id_idx" ON "content_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_content_status" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "trust_scores_tenant_id_idx" ON "trust_scores"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_trust_scores_agent" ON "trust_scores"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "trust_scores_tenant_agent_type_unique" ON "trust_scores"("tenant_id", "agent_id", "extraction_type");

-- CreateIndex
CREATE INDEX "maestro_actions_tenant_id_idx" ON "maestro_actions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_maestro_actions_agent_type" ON "maestro_actions"("agent_id", "extraction_type");

-- CreateIndex
CREATE INDEX "idx_maestro_actions_date" ON "maestro_actions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "maestro_conversations_tenant_id_idx" ON "maestro_conversations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_maestro_conversations_owner" ON "maestro_conversations"("owner_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "maestro_messages_tenant_id_idx" ON "maestro_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_maestro_messages_conversation" ON "maestro_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "sync_log_tenant_id_idx" ON "sync_log"("tenant_id");

-- CreateIndex
CREATE INDEX "areas_tenant_id_idx" ON "areas"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_areas_status" ON "areas"("status");

-- CreateIndex
CREATE INDEX "idx_areas_archived" ON "areas"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "areas_tenant_id_slug_key" ON "areas"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "workflow_templates_tenant_id_idx" ON "workflow_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_workflow_templates_area" ON "workflow_templates"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_tenant_id_slug_key" ON "workflow_templates"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "workflow_template_steps_tenant_id_idx" ON "workflow_template_steps"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_idx" ON "workflow_instances"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_workflow_instances_status" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "idx_workflow_instances_template" ON "workflow_instances"("template_id");

-- CreateIndex
CREATE INDEX "workflow_instance_tasks_tenant_id_idx" ON "workflow_instance_tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_workflow_instance_tasks_instance" ON "workflow_instance_tasks"("instance_id");

-- CreateIndex
CREATE INDEX "okr_snapshots_tenant_id_idx" ON "okr_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_okr_snapshots_entity" ON "okr_snapshots"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "okr_snapshots_entity_type_entity_id_snapshot_date_key" ON "okr_snapshots"("entity_type", "entity_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "github_repos_repo_full_name_key" ON "github_repos"("repo_full_name");

-- CreateIndex
CREATE INDEX "github_repos_tenant_id_idx" ON "github_repos"("tenant_id");

-- CreateIndex
CREATE INDEX "github_events_tenant_id_idx" ON "github_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_github_events_repo" ON "github_events"("repo_id");

-- CreateIndex
CREATE INDEX "idx_github_events_task" ON "github_events"("task_id");

-- CreateIndex
CREATE INDEX "idx_github_events_type" ON "github_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_github_events_date" ON "github_events"("event_at" DESC);

-- CreateIndex
CREATE INDEX "idx_github_events_author" ON "github_events"("author_mapped_id");

-- CreateIndex
CREATE INDEX "dev_metrics_daily_tenant_id_idx" ON "dev_metrics_daily"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_dev_metrics_date" ON "dev_metrics_daily"("date" DESC);

-- CreateIndex
CREATE INDEX "idx_dev_metrics_repo" ON "dev_metrics_daily"("repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "dev_metrics_daily_repo_id_date_key" ON "dev_metrics_daily"("repo_id", "date");

-- CreateIndex
CREATE INDEX "feedback_sessions_tenant_id_idx" ON "feedback_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_feedback_sessions_project" ON "feedback_sessions"("project_id");

-- CreateIndex
CREATE INDEX "idx_feedback_sessions_status" ON "feedback_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_items_task_id_key" ON "feedback_items"("task_id");

-- CreateIndex
CREATE INDEX "feedback_items_tenant_id_idx" ON "feedback_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_feedback_items_session" ON "feedback_items"("session_id");

-- CreateIndex
CREATE INDEX "idx_feedback_items_classification" ON "feedback_items"("classification");

-- CreateIndex
CREATE INDEX "idx_feedback_items_module" ON "feedback_items"("module");

-- CreateIndex
CREATE INDEX "idx_feedback_items_status" ON "feedback_items"("status");

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_idx" ON "opportunities"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_opportunities_stage" ON "opportunities"("stage_id");

-- CreateIndex
CREATE INDEX "idx_opportunities_owner" ON "opportunities"("owner_id");

-- CreateIndex
CREATE INDEX "idx_opportunities_archived" ON "opportunities"("archived_at");

-- CreateIndex
CREATE INDEX "idx_opportunities_kanban" ON "opportunities"("tenant_id", "stage_id", "kanban_order");

-- CreateIndex
CREATE INDEX "opportunity_activities_tenant_id_idx" ON "opportunity_activities"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_opp_activities_opp" ON "opportunity_activities"("opportunity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_idx" ON "time_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_time_entries_person_date" ON "time_entries"("person_id", "date");

-- CreateIndex
CREATE INDEX "idx_time_entries_project" ON "time_entries"("project_id");

-- CreateIndex
CREATE INDEX "idx_time_entries_task" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "idx_time_entries_status" ON "time_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_records_gmail_id_key" ON "email_records"("gmail_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_records_interaction_id_key" ON "email_records"("interaction_id");

-- CreateIndex
CREATE INDEX "email_records_tenant_id_idx" ON "email_records"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_records_processed" ON "email_records"("is_processed");

-- CreateIndex
CREATE INDEX "idx_email_records_project" ON "email_records"("project_id");

-- CreateIndex
CREATE INDEX "idx_email_records_client" ON "email_records"("client_id");

-- CreateIndex
CREATE INDEX "idx_email_records_date" ON "email_records"("received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "investment_maps_project_id_key" ON "investment_maps"("project_id");

-- CreateIndex
CREATE INDEX "investment_maps_tenant_id_idx" ON "investment_maps"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "investment_maps_tenant_id_project_id_key" ON "investment_maps"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "investment_rubrics_tenant_id_idx" ON "investment_rubrics"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_investment_rubrics_map" ON "investment_rubrics"("investment_map_id");

-- CreateIndex
CREATE INDEX "email_campaigns_tenant_id_idx" ON "email_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_campaigns_status" ON "email_campaigns"("status");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_idx" ON "email_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "campaign_recipients_tenant_id_idx" ON "campaign_recipients"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_campaign_recipients_campaign" ON "campaign_recipients"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_campaign_recipients_status" ON "campaign_recipients"("campaign_id", "status");

-- AddForeignKey
ALTER TABLE "tenant_llm_config" ADD CONSTRAINT "tenant_llm_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_module_config" ADD CONSTRAINT "tenant_module_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_module_config" ADD CONSTRAINT "tenant_module_config_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "module_catalog"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_access" ADD CONSTRAINT "user_module_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_access" ADD CONSTRAINT "user_module_access_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "module_catalog"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_project_access" ADD CONSTRAINT "user_project_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_project_access" ADD CONSTRAINT "user_project_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_project_access" ADD CONSTRAINT "user_project_access_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_key_result_id_fkey" FOREIGN KEY ("key_result_id") REFERENCES "key_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_task_id_fkey" FOREIGN KEY ("related_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_project_id_fkey" FOREIGN KEY ("related_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_related_client_id_fkey" FOREIGN KEY ("related_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_actions" ADD CONSTRAINT "maestro_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_actions" ADD CONSTRAINT "maestro_actions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_conversations" ADD CONSTRAINT "maestro_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_conversations" ADD CONSTRAINT "maestro_conversations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_messages" ADD CONSTRAINT "maestro_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maestro_messages" ADD CONSTRAINT "maestro_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "maestro_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_template_steps" ADD CONSTRAINT "workflow_template_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_template_steps" ADD CONSTRAINT "workflow_template_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_template_steps" ADD CONSTRAINT "workflow_template_steps_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_tasks" ADD CONSTRAINT "workflow_instance_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_tasks" ADD CONSTRAINT "workflow_instance_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_tasks" ADD CONSTRAINT "workflow_instance_tasks_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_template_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_tasks" ADD CONSTRAINT "workflow_instance_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "okr_snapshots" ADD CONSTRAINT "okr_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_events" ADD CONSTRAINT "github_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_events" ADD CONSTRAINT "github_events_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_events" ADD CONSTRAINT "github_events_author_mapped_id_fkey" FOREIGN KEY ("author_mapped_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_events" ADD CONSTRAINT "github_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_metrics_daily" ADD CONSTRAINT "dev_metrics_daily_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_metrics_daily" ADD CONSTRAINT "dev_metrics_daily_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_sessions" ADD CONSTRAINT "feedback_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_sessions" ADD CONSTRAINT "feedback_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_sessions" ADD CONSTRAINT "feedback_sessions_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "feedback_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_maps" ADD CONSTRAINT "investment_maps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_maps" ADD CONSTRAINT "investment_maps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rubrics" ADD CONSTRAINT "investment_rubrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rubrics" ADD CONSTRAINT "investment_rubrics_investment_map_id_fkey" FOREIGN KEY ("investment_map_id") REFERENCES "investment_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rubrics" ADD CONSTRAINT "investment_rubrics_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

