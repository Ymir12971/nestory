# Nestory — 数据库设计文档

**版本：** v1.8
**日期：** 2026-05-01
**上一版本：** v1.7（2026-04-26）
**来源：** 从技术架构文档 v1.3 §5 拆出
**依赖文档：** PRD v1.7 · PageStructure v1.6 · SubscriptionRules v1.3 · 技术架构 v1.3
**编写者：** Justin
**对应实现：** `apps/nestory-api/prisma/schema.prisma`

### v1.8 变更记录（与 ADR `ARCH-DECISIONS-API-DB-20260501.md` 对齐）

- **`users` 表新增 `updated_at`**（v1.7 遗漏）：与其他表对齐，timezone / active_child_id / name 字段可变更需要审计
- **`users` 表新增 `name VARCHAR(100)`**：mobile 多处使用（SettingsScreen / FeedbackScreen），types/user.ts 已加
- **新增 `linked_providers` 表**：Apple/Google OAuth 绑定列表（取代之前 mobile 用 MOCK_LINKED 的需求）
- **决策 5 双层删除策略落地**：
  - `children` / `raw_assets` / `highlights` 新增 `deleted_at TIMESTAMPTZ`（之前仅 users 有）
  - 30 天 cron 物理清除范围扩大到上述表
  - `audit_log` / `abuse_log` 的 `user_id` 改为 `ON DELETE SET NULL`（永不删，但用户被 hard purge 后变孤儿）
- **`raw_assets.user_id` 补 ON DELETE CASCADE**（v1.7 遗漏 ON DELETE 子句）
- **`stories.status` 增加 `'queued'` 状态**：对齐决策 4 的 BullMQ 状态机 `pending → queued → generating → generated | failed`
- **Highlight 唯一性**：`highlights.asset_id` 加 UNIQUE（一条 Memory 最多一个 Highlight，原文档隐含但无显式约束）
- **API 命名约定**：决策 1 — DB 列名仍 snake_case，TS/JSON 全 camelCase（通过 Prisma `@map`）
- **Subscription `subscription_status`**：决策 2 — 5 态枚举为唯一权威字段，前端不再用 `'free'` 简化别名

### v1.7 变更记录

- **`subscriptions` 表新增 `last_event_at` 和 `last_event_id`**：用于 RevenueCat webhook 乱序处理；`last_event_at` 存 RevenueCat 事件发生时间（`event_timestamp_ms / 1000`），用于 last-write-wins 比较；`last_event_id` 存 event uuid，用于幂等去重；乱序到达的旧事件直接丢弃，不覆盖更新的状态

### v1.6 变更记录

- **`users` 表新增 `deleted_at` 和 `locked_at`**：支持 GDPR 账号软删除（30 天后物理清除）和滥用锁定；所有业务查询通过 Prisma soft-delete middleware 自动注入 `deleted_at IS NULL`
- **新增 `abuse_log` 表**：记录触发限流/滥用的 IP / userId / endpoint，支持自动锁定和运营复核
- **索引补充**：`users(deleted_at) WHERE deleted_at IS NOT NULL`（nightly cron 清理查询）

### v1.5 变更记录

- **`subscriptions` 表新增 `subscription_status` 字段**：五态枚举（`never_paid | trial_active | premium_active | trial_ended | premium_ended`），由 RevenueCat webhook handler 写入，全系统统一读此字段；signup 时随 `subscriptions` 行一起创建，默认 `'never_paid'`
- **`children` 表新增身高体重字段**：`height_cm DECIMAL(5,2) / height_recorded_at / weight_kg DECIMAL(5,2) / weight_recorded_at`，可选，存最新一次测量值（MVP 不保留历史）
- **`story_shares` 单 token 策略**：新增 partial unique index `(story_id) WHERE revoked_at IS NULL`，确保同一 Story 同时只有一个有效分享链接；`POST /shares` 应用层先查有效 token，有则复用
- **修正表关系总览**：移除已删除的 `asset_tags (N:M) → tags` 节点（v1.3 已删），补充 `user_tag_library`
- **修正设计原则**：删除"Tag 独立建表"原则（value 模型下已不适用），新增"业务状态显式落库"和"Tag value 模型"原则

### v1.4 变更记录

- **新增 `audit_log` 表**（对齐安全与合规文档 v1.0 §10）：记录登录、登出、密码修改、删除账户、导出数据、订阅状态变更等操作，保留 1 年
- **新增设计决策条目**：数据分层存储选 Path B（所有用户统一写后端，Never Paid 不提供跨设备同步 UI）

### v1.3 变更记录

- **`highlights` 表补充缺失字段**（对齐 PRD v1.7 §4.3）：新增 `cover_file_id`（用户选定的封面照片，引用 `asset_files`）和 `title`（AI 提取标题，可由用户覆写）
- **移除 `raw_assets.highlight_note`**（对齐 PRD v1.7 2026-04-21 补丁）：Highlight 长文 Note 字段已废弃，标题改由 AI 从 `text_note + tags` 提取后写入 `highlights.title`
- **R-10 降级通知从 Toast 改为常驻 Notify**（对齐 SubscriptionRules v1.3）：移除 `users.has_seen_downgrade_toast` 字段；降级 Notify 由前端读 `subscription_status` 直接渲染，后端无需额外标记
- **Tag 存储模型从 reference 改为 value**（对齐 PRD v1.7 §4.1.1）：
  - 移除 `tags` 独立表和 `asset_tags` 关联表
  - `raw_assets` 新增 `tags TEXT[]` 字段，save 时做字符串快照，独立于任何 tag library
  - 新增 `user_tag_library` 表，仅用于 Tag Picker 的可复用列表；与 Memory.tags 无外键关系
  - 8 个预设 Tag 移入 `packages/config/nestory/tags.ts`，不再存 DB；`GET /tags` 从 config 返回
  - 实现"orphan chip"语义：删除 custom tag 只删 user_tag_library 行，已存入 raw_assets.tags 的字符串不受影响

### v1.2 变更记录

- 拆 `raw_assets.file_url` → `asset_files` 子表，支持 1 条 Memory N 张照片（解决与 API `POST /assets photos[]` 的模型不一致）
- `users.email` 加 `NOT NULL UNIQUE`
- `users` 新增 `active_child_id` 字段，落库当前活跃档案（解决 `GET /children` 返回 `is_active` 但表无字段的问题）
- `highlights` 与 `subscriptions.story_quota` 加并发控制说明
- `story_shares.token` 明确生成方式（`crypto.randomBytes(32).toString('base64url')`，43 字符 token）
- 全文同步到产品文档最新版本（PRD v1.7 / PageStructure v1.6 / SubscriptionRules v1.3）

### v1.0 变更记录

- 从架构文档 v1.2 §5 拆出独立成文

---

## 设计原则

**显式列 + JSONB 混合存储**
高频查询/统计字段冗余为显式列（可索引），结构会演进的复杂对象存为 JSONB。

**时间字段双轨**
- `captured_at`：用户本地时间（客户端传入），用于业务逻辑（月份归档、可编辑窗口、时间线排序）
- `created_at`：服务端 UTC 时间，仅用于系统审计

**VARCHAR 优于 enum**
`status`、`plan_type`、`asset_type` 等字段使用 VARCHAR，支持未来扩展无需 migration。

**Tag value 模型**
Tag 以字符串数组存于 `raw_assets.tags TEXT[]`，save 时做字符串快照；`user_tag_library` 仅服务 Picker 可复用列表，与 Memory.tags 无外键关系。

**业务状态显式落库**
派生状态（如 `subscription_status` 五态）不在运行时计算，而是由 webhook handler 写入后落库，全系统统一读一个字段，避免多端派生逻辑不一致。

---

## 表关系总览

```
users
  ├── children (1:N)
  │     ├── raw_assets (1:N)
  │     │     └── asset_files (1:N)        ← 多张照片拆子表
  │     ├── highlights (1:N) → raw_assets
  │     └── stories (1:N)
  │           └── story_shares (1:N)
  ├── subscriptions (1:1)
  └── user_tag_library (1:N)              ← Tag Picker 可复用列表，与 raw_assets.tags 无外键
```

---

## 表详细定义

### users

```sql
CREATE TABLE users (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    VARCHAR(255) NOT NULL UNIQUE,
  -- 与 Supabase Auth 同步，DB 层强约束兜底
  name                     VARCHAR(100) NOT NULL,
  -- 用户显示名（来自 OAuth profile 或用户编辑）；mobile Settings/Feedback 页使用
  timezone                 VARCHAR(50)  NOT NULL DEFAULT 'UTC',
  -- 业务关键字段，用于：
  --   · Story 生成调度（次月 1 日本地时区触发）
  --   · 素材月份归档范围计算
  --   · Memory 可编辑窗口判断
  --   · 生成倒计时本地化展示
  active_child_id          UUID         REFERENCES children(id) ON DELETE SET NULL,
  -- 当前活跃档案，GET /children 的 is_active 由此字段计算
  -- ON DELETE SET NULL：档案被删则用户回到无活跃态，下次进入 Home 重新选最早 created_at
  -- 注意循环外键：先建 users 再建 children，最后 ALTER TABLE 加约束（迁移见 prisma/migrations）
  deleted_at               TIMESTAMPTZ,
  -- 软删除时间戳（NULL = 正常账号）
  -- DELETE /users/me → 写入 deleted_at = now() + 立即 Supabase signOut
  -- nightly cron：deleted_at < now() - interval '30 days' → 物理删除
  --   物理删除顺序：Storage 文件 → Supabase Auth 用户 → RevenueCat → users 行（CASCADE 子表）
  -- 所有业务查询通过 Prisma soft-delete middleware 自动注入 WHERE deleted_at IS NULL
  locked_at                TIMESTAMPTZ,
  -- 滥用锁定时间戳（NULL = 未锁定）
  -- 触发：客服 admin tool 手动锁定，或自动检测（24h 上传 > 1000 张）
  -- auth middleware：locked_at IS NOT NULL → 403 ACCOUNT_LOCKED（不区分原因）
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 初始化方式：PostgreSQL trigger on_auth_user_created（见技术架构文档 §5）
-- Supabase Auth 新用户注册时自动触发，原子创建本行 + subscriptions 行
-- 客户端注册后立即 PATCH /users/me { timezone } 写入本地时区
```

---

### children

```sql
CREATE TABLE children (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(50)  NOT NULL,
  birth_date         DATE         NOT NULL,
  avatar_url         VARCHAR(500),
  gender             VARCHAR(20),             -- 'boy' | 'girl' | 'prefer_not_to_say'
  height_value       DECIMAL(6,2),            -- 身高数值，可选（存用户原始输入，不做单位转换）
  height_unit        VARCHAR(5),              -- 身高单位：'cm' | 'in'
  height_recorded_at TIMESTAMPTZ,             -- 该次身高的记录时间（非 updated_at，是测量时间）
  weight_value       DECIMAL(6,2),            -- 体重数值，可选
  weight_unit        VARCHAR(5),              -- 体重单位：'kg' | 'lb'
  weight_recorded_at TIMESTAMPTZ,             -- 该次体重的记录时间
  -- 注：MVP 只保留最新一次测量值；历史记录如需保留，v1.1 加 child_measurements 子表
  -- 单位由客户端传入，后端原样存储；AI 上下文拼接时按 unit 字段选对应描述
  deleted_at         TIMESTAMPTZ,             -- v1.8：误删恢复 30 天窗口（决策 5）
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_children_user ON children(user_id);

-- 默认活跃档案：进入 Home 时激活 created_at 最早的档案
-- 后端不限制创建数量（R-05/R-09），限制仅在切换时生效
```

---

### raw_assets

```sql
CREATE TABLE raw_assets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- v1.8 补 ON DELETE
  asset_type     VARCHAR(10) NOT NULL,   -- 'photo' | 'text' | 'mixed'
                                         -- mixed：同时含照片与文字（最常见场景）
  text_note      TEXT,                   -- 文字备注，上限 500 字符
  captured_at    TIMESTAMPTZ NOT NULL,
  -- 客户端传入的用户本地时间，业务逻辑依据：
  --   · 月份归档（判断素材属于哪个月）
  --   · Memory 可编辑窗口（是否为当月）
  --   · Story 时间线排序
  exif_taken_at  TIMESTAMPTZ,            -- EXIF 时间，次要参考（多张照片取首张 EXIF）
  ai_description TEXT,                   -- Vision API 生成的图片描述，异步写入（多张照片合并描述）
  ai_keywords    JSONB,                  -- AI 提取关键词，如 ["笑", "公园"]
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  -- value 模型：存储字符串快照（如 '{"Outdoor","第一次独站"}'），save 时由服务端写入
  -- 预设 Tag 和自定义 Tag 混合存储，不依赖任何关联表或外键
  -- 删除 user_tag_library 中的 custom tag 不影响此字段（orphan chip 语义）
  is_highlight   BOOLEAN     DEFAULT FALSE,
  deleted_at     TIMESTAMPTZ,                   -- v1.8："最近删除"30 天（决策 5）
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  -- 服务端 UTC 时间，仅用于系统审计，不用于业务判断
);

-- 注：`highlight_note VARCHAR(100)` 字段已于 PRD v1.7（2026-04-21）废弃移除。
-- Highlight 标题改由 AI 从 text_note + tags 提取，存入 highlights.title。

CREATE INDEX idx_assets_child_captured ON raw_assets(child_id, captured_at DESC);
-- 覆盖：月份聚合查询、Memory List 时间线分组
```

> **v1.2 变更**：原 `file_url VARCHAR(500)` 字段移除，照片改由 `asset_files` 子表承载，支持 1 条 Memory 含多张照片（最多 10 张，对齐 R-07 与 `POST /assets photos[]`）。

---

### asset_files

```sql
CREATE TABLE asset_files (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID        NOT NULL REFERENCES raw_assets(id) ON DELETE CASCADE,
  file_url     VARCHAR(500) NOT NULL,   -- Supabase Storage URL
  storage_path VARCHAR(500) NOT NULL,   -- Supabase bucket 内路径，便于物理删除/迁移
  mime_type    VARCHAR(50)  NOT NULL,   -- 'image/jpeg' | 'image/png' | 'image/heif'
  width_px     INT,                     -- 解码后写入，渲染时避免 layout shift
  height_px    INT,
  byte_size    INT          NOT NULL,   -- 用于配额统计（即使 R-07 暂不限）
  display_order SMALLINT    NOT NULL DEFAULT 0,
  -- 一条 Memory 内的展示顺序（0..9），由客户端上传顺序决定
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_files_asset ON asset_files(asset_id, display_order);
-- 覆盖：按 Memory 取所有照片并保持顺序

-- 业务约束（应用层强制）：
--   · 单个 raw_assets 最多 10 个 asset_files（R-07）
--   · 单个 file 不超过 10MB（R-07，写入前 byte_size 校验）
--   · mime_type 仅允许 JPEG / PNG / HEIF
--   · DELETE raw_assets 自动级联删除 asset_files 行；Storage 物理文件由后台 cleanup job 异步处理 storage_path
```

---

### user_tag_library

```sql
CREATE TABLE user_tag_library (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  -- display form，以用户首次输入为准（如 "第一次独站"）
  -- matching key = LOWER(TRIM(name))，由应用层在写入前 normalize，UNIQUE 约束基于此
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
  -- 注：UNIQUE 约束基于 LOWER(TRIM(name)) 的 normalize 结果，实际落库前应用层处理
);

CREATE INDEX idx_user_tag_library_user ON user_tag_library(user_id);
```

**用途说明：**
- 仅服务于 Tag Picker 的"可复用自定义 Tag 列表"，与 `raw_assets.tags` **无外键关系**
- 用户创建新 custom tag → 写入本表（如不存在）+ 追加到 `raw_assets.tags` 字符串数组
- 用户删除 custom tag → 仅删除本表行，已存入任何 Memory 的 `raw_assets.tags` 字符串**不受影响**（orphan chip 语义）
- 8 个预设 Tag（Playtime / Mealtime / Bedtime / Bath Time / Outdoor / Family Time / Funny Moment / Learning）**不存本表**，维护在 `packages/config/nestory/tags.ts`，`GET /tags` 接口从 config 静态返回

---

### highlights

```sql
CREATE TABLE highlights (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- v1.8 补
  child_id           UUID         NOT NULL REFERENCES children(id) ON DELETE CASCADE, -- v1.8 补
  asset_id           UUID         NOT NULL UNIQUE REFERENCES raw_assets(id) ON DELETE CASCADE, -- v1.8: 加 UNIQUE
  cover_file_id      UUID         REFERENCES asset_files(id) ON DELETE SET NULL,
  -- 用户选定的封面照片（引用 asset_files 某一行）
  -- 单张照片时默认该张；多张时由 "Select Highlight Cover" Sheet 选定
  -- ON DELETE SET NULL：若该照片被删，封面置空；应用层 fallback 取 asset_files 第一张
  title              VARCHAR(100),
  -- AI 从 raw_assets.text_note + tags 提取后异步写入；用户可在 HL-02 "Edit Highlight Title" Sheet 覆写
  -- 生成前为 null，前端展示占位态
  card_type          VARCHAR(50),          -- 卡片模板类型，按 Tag 匹配
  rendered_image_url VARCHAR(500),         -- 渲染为图片后的 URL，用于分享
  deleted_at         TIMESTAMPTZ,          -- v1.8：取消 highlight 软删（决策 5）
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_highlights_user ON highlights(user_id);
-- R-04 高频查询：SELECT COUNT(*) FROM highlights WHERE user_id = $1
-- Free 用户上限 10 个，Toggle 点击时前端预检，Save 时后端兜底

-- Remove Highlight：所有用户可操作，取消 is_highlight 标记，Memory 不删除
-- 对应接口：DELETE /highlights/:id → 删除 highlights 行，raw_assets.is_highlight = false

-- 并发控制：Free 用户在 9/10 边界并发 Save，COUNT(*) 预检可能两个请求都通过。
-- 写入路径必须包在事务里并加 advisory lock：
--   BEGIN;
--   SELECT pg_advisory_xact_lock(hashtext('highlight_count:' || $user_id));
--   SELECT COUNT(*) FROM highlights WHERE user_id = $1;
--   -- 若 ≥ 10 → 抛 HIGHLIGHT_LIMIT_REACHED
--   INSERT INTO highlights ...;
--   COMMIT;
-- advisory lock 在事务结束自动释放，无死锁风险。
```

---

### stories

```sql
CREATE TABLE stories (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             UUID        NOT NULL REFERENCES children(id),
  user_id              UUID        NOT NULL REFERENCES users(id),
  month_key            VARCHAR(7)  NOT NULL,
  -- 格式："2026-03"（用户本地时区月份，不是 UTC）
  status               VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- v1.8（决策 4 BullMQ 状态机）：
  -- 'pending' | 'queued' | 'generating' | 'generated' | 'failed' | 'fallback_generated'

  -- 可索引显式列（高频查询/统计，冗余自 JSONB）
  quality_level        VARCHAR(10),          -- 'low' | 'medium' | 'rich'
  quality_score        DECIMAL(4,3),         -- 连续值 0-1，存原始值
  prompt_version       VARCHAR(60),          -- 如 'planner-v1.0_brief-v1.0_gen-v1.0'
  model_name           VARCHAR(60),          -- 如 'gpt-4o-2024-08-06'
  generated_at         TIMESTAMPTZ,
  is_last_free_story   BOOLEAN     DEFAULT FALSE,
  -- 配额归零时生成的最后一份（quota 从 1 → 0 时标记）
  -- 用于触发 Paywall A：Free 用户从 S-02 返回时检查此标记
  generated_under_plan VARCHAR(10),
  -- 'free' | 'premium'
  -- R-02 水印永久固化依据：生成时写入，之后不再修改

  -- JSONB 列（完整对象，结构演进不需要 migration）
  document             JSONB,   -- StoryDocument（renderer 消费）
  generation_meta      JSONB,   -- StoryGenerationMeta（调试/回溯）

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(child_id, month_key)
  -- 每个孩子每个月最多一份 Story
);

CREATE INDEX idx_stories_quality_level  ON stories(quality_level);
CREATE INDEX idx_stories_prompt_version ON stories(prompt_version);
CREATE INDEX idx_stories_status         ON stories(status);
CREATE INDEX idx_stories_user           ON stories(user_id);
CREATE INDEX idx_stories_is_last_free   ON stories(is_last_free_story)
  WHERE is_last_free_story = TRUE;
  -- 部分索引，只索引 true 行，查询高效

-- Realtime：开启此表的 Supabase Realtime，供前端订阅 story 状态变更（见技术架构 §4 Story 生成完成通知）
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
```

**JSONB 字段说明：**

`document` 存储 `StoryDocument`，包含：
- `sections[]`：各 section 内容，renderer 直接消费
- `watermark.enabled`：生成时固化，永不动态修改（R-02）
- `theme`：视觉主题，生成时固化，历史 story 样式永不漂移
- `shareMeta`：OG 标题/描述/封面图

`generation_meta` 存储 `StoryGenerationMeta`，包含：
- `sectionPlan`、`narrativeBrief`：生成过程中间产物快照
- `anchorAudit`：每段内容的素材锚点，供审计
- `promptVersion`、`modelName`：调优和事故排查依据
- `failureTracking`：retry 次数、失败原因、是否使用 fallback

---

### story_shares

```sql
CREATE TABLE story_shares (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private_link',
  -- 'private_link'（当前唯一模式，未来可扩展 'public'）
  expires_at TIMESTAMPTZ,   -- 预留，MVP 暂不设过期
  revoked_at TIMESTAMPTZ,   -- NULL = 有效；非 NULL = 已撤销
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_shares_story_active
  ON story_shares(story_id)
  WHERE revoked_at IS NULL;
-- 同一 Story 最多一个有效 token（单 token 策略）
-- revoke 后可再 INSERT 新行；此约束不影响历史已撤销记录

CREATE INDEX idx_shares_story ON story_shares(story_id);

-- shareToken 独立存放，不在 StoryDocument 内
-- 原因：token 可撤销/轮换/过期，生命周期与 story 内容不同
-- Public H5 分享页通过 token 查找 story，校验 revoked_at IS NULL
-- POST /shares 应用层逻辑：先查有效 token，有则复用返回，无则 INSERT 新行

-- token 生成方式：
--   crypto.randomBytes(32).toString('base64url')
--   = 43 字符 URL-safe 字符串，256 bit 熵，碰撞概率可忽略
--   不允许用 uuid / nanoid / 自增 ID（uuid 熵不足以抗枚举攻击，分享链接是 public-by-token 模型的唯一防线）
```

---

### subscriptions

```sql
CREATE TABLE subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) UNIQUE,
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'never_paid',
  -- 五态枚举（业务层身份，全系统统一读此字段）：
  --   'never_paid'     — 从未订阅/从未享受 Free Trial 的原生 Free 用户
  --   'trial_active'   — 当前在 Free Trial 期内，权益同 Premium
  --   'premium_active' — 当前订阅有效（已付费）
  --   'trial_ended'    — 试用结束未转付费，回到 Free；{kind}=Trial
  --   'premium_ended'  — 订阅到期回到 Free；{kind}=Premium
  -- 由 RevenueCat webhook handler 在每次订阅事件时写入；
  -- signup 时随本行一起创建，初始值 'never_paid'
  plan_type           VARCHAR(10) NOT NULL DEFAULT 'free',
  -- 'free' | 'premium'（RevenueCat 当前计划类型，与 subscription_status 冗余存储）
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  -- RevenueCat 合同状态：'active' | 'cancelled' | 'expired'
  story_quota         INT         NOT NULL DEFAULT 2,
  -- R-01 规则：
  --   · 新 Free 用户初始值 = 2
  --   · 每次 Story 生成消耗 1（Premium 不消耗，走 plan_type 判断分支）
  --   · Premium 降级后 SET story_quota = 0，不重置
  --   · 升级为 Premium 后不再依赖 quota，按 plan_type 判断
  expires_at          TIMESTAMPTZ,
  -- Premium 订阅到期时间，由 RevenueCat webhook 写入
  last_event_at       TIMESTAMPTZ,
  -- RevenueCat 事件发生时间（= payload.event_timestamp_ms / 1000），用于乱序保护
  -- 新到的 webhook：若 payload.event_timestamp_ms < last_event_at → 直接丢弃（旧事件），不写 DB
  last_event_id       VARCHAR(100),
  -- RevenueCat event uuid，用于幂等去重：若 last_event_id = payload.id → 直接返回 200，不重复处理
  paywall_trigger_log JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- 格式：{ "A": "2026-03-01T10:00:00Z" }
  -- 记录 Paywall A 的首次触发时间
  -- 用途：判断同一 Story 周期内是否已触发过（不重复弹出）
  -- 触发点 B/C/D 每次点击均触发，无需记录
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 并发控制：story_quota 扣减必须用 UPDATE ... WHERE story_quota > 0 RETURNING 原子操作，
-- 不允许 SELECT 后 UPDATE。RevenueCat webhook 与 Story 生成 worker 都可能触发更新。
```

---

### linked_providers (v1.8 新增)

```sql
CREATE TABLE linked_providers (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(20)  NOT NULL,    -- 'apple' | 'google'
  provider_user_id  VARCHAR(255) NOT NULL,    -- OAuth provider 返回的 sub/sub_id
  provider_email    VARCHAR(255),             -- NULL = 用户撤销 email 共享（如 Apple Hide My Email）
  connected_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_linked_providers_user ON linked_providers(user_id);
```

**用途说明：**
- 一个 user 可绑定多个 provider（typical：Apple + Google）
- mobile Settings · Account 屏读此表生成"已连接"列表
- 解绑只删 row；最后一个 provider 不允许解绑（应用层校验）

---

### audit_log

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  -- NULL 表示系统操作（webhook / cron）；或用户被 hard purge 后由 v1.8 决策 5 SET NULL 留快照
  actor_type  VARCHAR(20)  NOT NULL,
  -- 'user' | 'system' | 'webhook'
  action      VARCHAR(50)  NOT NULL,
  -- 'login' | 'logout' | 'password_change' | 'delete_account'
  -- 'export_data' | 'subscription_change' | 'admin_lock' ...
  resource    VARCHAR(50),
  -- 被操作的资源类型，如 'story' | 'highlight' | 'subscription'
  resource_id VARCHAR(64),
  -- 被操作的资源 ID（UUID / slug，可空）
  metadata    JSONB,
  -- 附加上下文，如 { "old_status": "trial_active", "new_status": "trial_ended" }
  ip_addr     INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
-- 保留策略：1 年；超期行由 nightly cron 按 created_at < now() - interval '1 year' 批量删除
```

---

### abuse_log

```sql
CREATE TABLE abuse_log (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  ip_addr      INET         NOT NULL,
  endpoint     VARCHAR(100) NOT NULL,
  -- 触发限流/滥用检测的接口路径
  trigger_type VARCHAR(30)  NOT NULL,
  -- 'rate_limit_429'  : 单 IP/用户触发 429 累计达阈值
  -- 'upload_abuse'    : 24h 上传量 > 1000 张自动锁定
  -- 'manual_lock'     : 客服手动锁定
  detail       JSONB,
  -- 附加上下文，如 { "count": 1001, "window": "24h" }
  triggered_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_abuse_log_user_id ON abuse_log(user_id);
CREATE INDEX idx_abuse_log_ip ON abuse_log(ip_addr);
CREATE INDEX idx_abuse_log_triggered_at ON abuse_log(triggered_at);

-- 联动逻辑：
--   trigger_type = 'upload_abuse' → 同步写 users.locked_at = now()
--   trigger_type = 'rate_limit_429'（同 IP 1h 内 5 次 429）→ 仅记录，不自动锁定（人工复核）
--   trigger_type = 'manual_lock' → 由 admin 操作写入，users.locked_at 已由 admin tool 设置
-- 保留策略：90 天；超期行由 nightly cron 清理
```

---

## 索引汇总

| 表 | 索引 | 用途 |
|---|---|---|
| `users` | `(email)` UNIQUE | 登录查找、Auth 校验 |
| `raw_assets` | `(child_id, captured_at DESC)` | Memory List 时间线分组、月份归档查询 |
| `raw_assets` | GIN `(tags)` | 按 Tag 筛选 Memory（`WHERE 'Outdoor' = ANY(tags)`），可选，按实际查询需求启用 |
| `asset_files` | `(asset_id, display_order)` | 取一条 Memory 的所有照片并保持顺序 |
| `stories` | `(quality_level)` | 质量分布统计 |
| `stories` | `(prompt_version)` | prompt 版本效果分析 |
| `stories` | `(status)` | 待生成/失败任务查询 |
| `stories` | `(user_id)` | 用户 Story 列表查询 |
| `stories` | `(is_last_free_story) WHERE true` | Paywall A 标记查询（部分索引） |
| `highlights` | `(user_id)` | Highlight count 查询（R-04 高频） |
| `highlights` | `(asset_id)` | 按 Memory 查关联 Highlight（Remove 时使用） |
| `story_shares` | `(token)` UNIQUE | Public 分享页按 token 查 story |
| `story_shares` | `(story_id)` | Story 分享链接查询 |
| `children` | `(user_id)` | 用户档案列表查询 |
| `user_tag_library` | `(user_id)` | Tag Picker 加载用户自定义 tag 列表 |
| `users` | `(deleted_at) WHERE deleted_at IS NOT NULL` | nightly cron 清理软删除账号（部分索引，只索引待清理行） |
| `abuse_log` | `(user_id)` | 按用户查滥用记录 |
| `abuse_log` | `(ip_addr)` | 按 IP 查滥用记录 |
| `abuse_log` | `(triggered_at)` | 时间窗口聚合查询（24h 上传量统计） |

---

## 关键字段设计决策

| 字段 | 决策 | 理由 |
|---|---|---|
| `users.email` | NOT NULL UNIQUE | 与 Supabase Auth 同步，DB 层兜底 |
| `users.active_child_id` | 用 users 字段记录，不在 children 加 is_active | 单字段更新原子，避免多档案并发置位竞争 |
| `users.timezone` | VARCHAR，非数据库时区类型 | 存 IANA 时区名（如 `Asia/Shanghai`），业务逻辑在应用层处理 |
| R-10 降级通知 | 无需 DB 字段 | 改为常驻 Notify，前端直接读 `subscription_status` 渲染；`has_seen_downgrade_toast` 字段已移除 |
| `raw_assets` 多照片 | 拆 `asset_files` 子表 | 1 条 Memory 含多张照片需可索引、可保序、可记宽高/字节数；JSONB 数组无法满足 |
| `asset_files.storage_path` | 与 file_url 并存 | URL 用于客户端展示，path 用于 Storage 物理操作（删除/迁移）|
| `story_shares.token` | crypto.randomBytes(32) base64url | UUID 熵不足以抗枚举；token 是 public-by-token 模型的唯一防线 |
| `subscriptions.story_quota` 扣减 | UPDATE ... WHERE story_quota > 0 RETURNING | 原子操作，避免 webhook 与 worker 并发 |
| `highlights` 写入 | advisory lock + 事务 | 9/10 边界并发 Save 防超额 |
| `stories.watermark` | 存于 JSONB document，生成时固化 | 降级后历史 story 水印状态永不变（R-02） |
| `stories.month_key` | VARCHAR(7)，非 DATE | 格式 "2026-03"，直接对应用户本地时区月份，避免时区转换歧义 |
| `stories.generated_under_plan` | VARCHAR，非外键 | 快照性质，记录生成时的身份，不随用户订阅状态变化 |
| `raw_assets.captured_at` | 客户端传入 | 月份归档必须按用户感知时间，不能按服务端 UTC |
| `raw_assets.created_at` | 服务端 UTC | 仅审计用，不参与业务逻辑 |
| `subscriptions.story_quota` | INT，归零不重置 | 降级后不重置是产品规则（R-01），DB 层直接体现 |
| `subscriptions.paywall_trigger_log` | JSONB | 只需记录 Paywall A，结构简单，JSONB 足够 |
| Tag 存储模型 | `raw_assets.tags TEXT[]` value 模型 + 独立 `user_tag_library` 表 | PRD v1.7 §4.1.1 明确要求字符串快照，保证 tag 库变动和降级行为不伤已有 Memory；orphan chip 语义自然实现；MVP 无跨 Memory tag 查询需求，reference 模型复杂度无收益 |
| 预设 Tag | 移入 `packages/config/nestory/tags.ts`，不存 DB | 静态配置，不需要 migration；`GET /tags` 从 config 返回 |
| `highlights.cover_file_id` | 引用 `asset_files`，ON DELETE SET NULL | 封面是具体某张照片，需明确指向；照片删除后 fallback 取第一张，不级联删 Highlight |
| `highlights.title` | 可空 VARCHAR | AI 异步写入，生成前 null；用户可覆写；不在 `raw_assets` 存（Highlight 专属字段） |
| `highlights` count | 实时 COUNT 查询 | 数量不大（上限 10），无需 denormalized counter |
| 数据分层存储（云同步） | Path B：所有用户统一写后端，无 DB 层区分 | Path A：Never Paid 数据不落后端，升级时 bulk upload | Never Paid 和付费用户使用同一写路径；"device-only" 是 UX 区分（不提供跨设备同步入口），非 DB 约束；MVP 工程成本更低，用户换设备后数据仍在云端属意外惊喜而非问题 |
| `subscriptions.subscription_status` | 显式五态字段，webhook 写入 | 运行时从 plan_type+status+expires_at 派生 | 派生逻辑在 webhook / API / 前端三处都要写，容易出不一致；显式落库后全系统只需读一个字段 |
| RevenueCat webhook 乱序保护 | `last_event_at`（事件时间）+ `last_event_id`（幂等 key），`FOR UPDATE` 行锁，last-write-wins | 仅用 `updated_at` 或不处理乱序 | RevenueCat 不保证 delivery 顺序；`event_timestamp_ms` 是事件在 RevenueCat 侧发生的时间（稳定），用它比较可正确丢弃旧事件；幂等 key 防止网络重试重复写；`FOR UPDATE` 防并发 webhook 竞争 |
| `subscriptions` 行创建时机 | signup 时由后端同步创建，初始值 `never_paid` | 首次订阅时按需创建 | 保证所有 user 都有对应 subscriptions 行，查询无需处理 NULL |
| `story_shares` 单 token | partial unique index `(story_id) WHERE revoked_at IS NULL`；`POST /shares` 复用有效 token | 每次分享生成新 token | 用户分享行为语义上是"获取分享链接"而非"生成多个链接"；单 token 实现简单，撤销后可再创建新链接 |
| `children` 身高体重 | value + unit 分开存（`height_value / height_unit / height_recorded_at / weight_value / weight_unit / weight_recorded_at`），保留最新一次 | 仅存 cm/kg 固定单位 | 支持英制（in/lb）；单位原样存储，AI 上下文拼接时按 unit 字段选描述；无需客户端转换，无精度损失 |
| Highlight 上限 | per-user（跨档案共享 10 个） | per-child（每档案各 10 个） | per-child 会导致多档案用户无需订阅即享受大量 Highlight 配额，失去付费转化压力 |
| `users.deleted_at` | 软删除字段，30 天后 cron 物理清除 | 直接物理删除 | GDPR 允许 30 天宽限期；防误删；宽限期内用户可申诉恢复 |
| `users.locked_at` | 单字段时间戳，NULL = 正常 | 独立 `status` 枚举 | 锁定是临时状态，时间戳天然记录锁定时间；解锁只需 SET locked_at = NULL |
| Soft-delete 查询注入 | Prisma middleware 全局注入 `WHERE deleted_at IS NULL` | 每个查询手动加条件 | middleware 一处维护，AI 生成的代码不会漏掉这个条件 |

---

*本文档为独立数据库设计参考，与架构文档 v1.3 §5 保持同步。*
*如两文档出现歧义，以本文档为准。*
