-- Nestory — post-init SQL
-- 在 `prisma migrate deploy` 之后手动执行（或并入 CI deploy 脚本）
-- 包含 Prisma DSL 不支持的：
--   1. 部分索引（partial indexes，含 WHERE 子句）
--   2. GIN 索引（tags TEXT[] 全文/数组查询）
--   3. Supabase Realtime publication
--
-- 幂等：所有 CREATE 都用 IF NOT EXISTS / OR REPLACE

-- ============================================================================
-- 1. 部分索引
-- ============================================================================

-- users(deleted_at) 部分索引：仅索引待 cron 清理的软删行
CREATE INDEX IF NOT EXISTS idx_users_deleted_at_partial
  ON users(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- raw_assets(deleted_at) 部分索引：cron 清理 + trash list 查询
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at_partial
  ON raw_assets(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- children(deleted_at) 部分索引
CREATE INDEX IF NOT EXISTS idx_children_deleted_at_partial
  ON children(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- highlights(deleted_at) 部分索引
CREATE INDEX IF NOT EXISTS idx_highlights_deleted_at_partial
  ON highlights(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- stories.is_last_free_story 部分索引：仅索引 TRUE 行（Paywall A 检查）
CREATE INDEX IF NOT EXISTS idx_stories_is_last_free
  ON stories(is_last_free_story)
  WHERE is_last_free_story = TRUE;

-- story_shares(story_id) 部分 UNIQUE：同一 Story 同时只能有一个有效 token
CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_story_active
  ON story_shares(story_id)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- 2. GIN 索引（tags TEXT[] 数组查询）
-- ============================================================================

-- 按 Tag 筛选 Memory（WHERE 'Outdoor' = ANY(tags) 之类）
CREATE INDEX IF NOT EXISTS idx_assets_tags_gin
  ON raw_assets USING GIN (tags);

-- ============================================================================
-- 3. Supabase Realtime publication
-- ============================================================================

-- stories 表开启 Realtime，前端订阅 status 变化（pending → generating → generated）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- 已经在 publication 里，忽略
  NULL;
END
$$;

-- ============================================================================
-- 4. user_tag_library UNIQUE 约束基于 normalize 后的 name
-- ============================================================================
-- Prisma 的 @@unique([userId, name]) 是字面相等；文档 §5 要求按 LOWER(TRIM(name))
-- 改建 functional unique index 后删除原 unique 约束
-- 应用层写入前必须 normalize（否则会拿到 unique violation）

DROP INDEX IF EXISTS user_tag_library_user_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tag_library_user_normalized_name
  ON user_tag_library (user_id, LOWER(TRIM(name)));

-- ============================================================================
-- 5. 2026-07 redesign / storyGen v3 / push 新增列与表
-- ============================================================================
-- 这些此前通过 `prisma db execute` 直接加到 dev 库(migrate dev 因漂移要求
-- 全库 reset,不可接受)。此迁移把它们正式收编进历史。全部幂等。

ALTER TABLE stories  ADD COLUMN IF NOT EXISTS memories_changed_at timestamptz(6);
ALTER TABLE children ADD COLUMN IF NOT EXISTS relationship varchar(30);

ALTER TABLE asset_files ADD COLUMN IF NOT EXISTS sharpness decimal(10,2);
ALTER TABLE asset_files ADD COLUMN IF NOT EXISTS quality_tier varchar(10);
ALTER TABLE asset_files ADD COLUMN IF NOT EXISTS blurhash varchar(50);

ALTER TABLE users ADD COLUMN IF NOT EXISTS story_notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_reminders_enabled    boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  token      varchar(200) NOT NULL UNIQUE,
  platform   varchar(10) NOT NULL,
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
