-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "active_child_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "birth_date" DATE NOT NULL,
    "avatar_url" VARCHAR(500),
    "gender" VARCHAR(20),
    "height_value" DECIMAL(6,2),
    "height_unit" VARCHAR(5),
    "height_recorded_at" TIMESTAMPTZ(6),
    "weight_value" DECIMAL(6,2),
    "weight_unit" VARCHAR(5),
    "weight_recorded_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" VARCHAR(10) NOT NULL,
    "text_note" TEXT,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "exif_taken_at" TIMESTAMPTZ(6),
    "ai_description" TEXT,
    "ai_keywords" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_highlight" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_id" UUID NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "byte_size" INTEGER NOT NULL,
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tag_library" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tag_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highlights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "cover_file_id" UUID,
    "title" VARCHAR(100),
    "card_type" VARCHAR(50),
    "rendered_image_url" VARCHAR(500),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "quality_level" VARCHAR(10),
    "quality_score" DECIMAL(4,3),
    "prompt_version" VARCHAR(60),
    "model_name" VARCHAR(60),
    "generated_at" TIMESTAMPTZ(6),
    "is_last_free_story" BOOLEAN NOT NULL DEFAULT false,
    "generated_under_plan" VARCHAR(10),
    "document" JSONB,
    "generation_meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "story_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private_link',
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_status" VARCHAR(20) NOT NULL DEFAULT 'never_paid',
    "plan_type" VARCHAR(10) NOT NULL DEFAULT 'free',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "billing_cycle" VARCHAR(10),
    "story_quota" INTEGER NOT NULL DEFAULT 2,
    "expires_at" TIMESTAMPTZ(6),
    "last_event_at" TIMESTAMPTZ(6),
    "last_event_id" VARCHAR(100),
    "paywall_trigger_log" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "actor_type" VARCHAR(20) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(50),
    "resource_id" VARCHAR(64),
    "metadata" JSONB,
    "ip_addr" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "ip_addr" INET NOT NULL,
    "endpoint" VARCHAR(100) NOT NULL,
    "trigger_type" VARCHAR(30) NOT NULL,
    "detail" JSONB,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_linked_providers_user" ON "linked_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "linked_providers_provider_provider_user_id_key" ON "linked_providers"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "idx_children_user" ON "children"("user_id");

-- CreateIndex
CREATE INDEX "idx_children_deleted_at" ON "children"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_assets_child_captured" ON "raw_assets"("child_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "idx_assets_deleted_at" ON "raw_assets"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_asset_files_asset" ON "asset_files"("asset_id", "display_order");

-- CreateIndex
CREATE INDEX "idx_user_tag_library_user" ON "user_tag_library"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tag_library_user_id_name_key" ON "user_tag_library"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "highlights_asset_id_key" ON "highlights"("asset_id");

-- CreateIndex
CREATE INDEX "idx_highlights_user" ON "highlights"("user_id");

-- CreateIndex
CREATE INDEX "idx_highlights_asset" ON "highlights"("asset_id");

-- CreateIndex
CREATE INDEX "idx_highlights_deleted_at" ON "highlights"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_stories_quality_level" ON "stories"("quality_level");

-- CreateIndex
CREATE INDEX "idx_stories_prompt_version" ON "stories"("prompt_version");

-- CreateIndex
CREATE INDEX "idx_stories_status" ON "stories"("status");

-- CreateIndex
CREATE INDEX "idx_stories_user" ON "stories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stories_child_id_month_key_key" ON "stories"("child_id", "month_key");

-- CreateIndex
CREATE UNIQUE INDEX "story_shares_token_key" ON "story_shares"("token");

-- CreateIndex
CREATE INDEX "idx_shares_story" ON "story_shares"("story_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_id" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_created_at" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "idx_abuse_log_user_id" ON "abuse_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_abuse_log_ip" ON "abuse_log"("ip_addr");

-- CreateIndex
CREATE INDEX "idx_abuse_log_triggered_at" ON "abuse_log"("triggered_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_child_id_fkey" FOREIGN KEY ("active_child_id") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_providers" ADD CONSTRAINT "linked_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_assets" ADD CONSTRAINT "raw_assets_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_assets" ADD CONSTRAINT "raw_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_files" ADD CONSTRAINT "asset_files_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "raw_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tag_library" ADD CONSTRAINT "user_tag_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "raw_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_cover_file_id_fkey" FOREIGN KEY ("cover_file_id") REFERENCES "asset_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_shares" ADD CONSTRAINT "story_shares_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_log" ADD CONSTRAINT "abuse_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

