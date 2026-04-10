# Nestory — 技术栈与架构设计文档

**版本：** v1.1
**日期：** 2026-04-04
**上一版本：** v1.0（2026-04-03）
**作者：** Justin（后端开发）、Vicol（产品设计）
**状态：** 已批准，可进入 MVP 实现阶段

### v1.1 变更记录

基于 PRD v1.6 + PageStructure v1.4 的架构影响分析，本次更新不改变技术栈选型，主要将架构从"概念成立"推进到"必须实现"：

- **§2 系统架构**：新增时区感知调度器说明；更新 Renderer 说明，FooterBrandBlock 进入 StoryRenderer 本体
- **§5 数据库 Schema**：users 表新增 `timezone`；stories 表新增 `is_last_free_story`、`generated_under_plan`；subscriptions 表新增 `story_quota`；raw_assets 重构 Tag 为独立关联表；`captured_at` 与 `created_at` 区分说明
- **§7 订阅与付费转化**：更新为 2 份配额模型；新增触发点 C / D；补充降级处理规则；Paywall 参数化设计
- **§8 开发路线图**：Sprint 1 新增时区调度、Story 状态机、来源感知路由；Sprint 3 新增 Paywall C/D
- **§9 非工程任务**：样本写作时间要求前移至 Sprint 1 并行
- **§10 新增埋点事件清单**
- **§11 关键设计决策日志**：新增 5 条（时区调度、Tag 数据模型、captured_at、水印固化、Paywall 参数化）

---

## 0. 核心设计哲学

> **规则主导，模型表达；结构优先，生成其次。**

Nestory 不是一个普通的 App 项目，而是一套**内容生成操作系统**，更准确的描述是：

> 一个以**时区调度、内容状态机、统一 Renderer、上下文付费、可追溯生成链路**为核心的内容生成产品。

- **Schema** 固定结构
- **Planner** 控制范围
- **NarrativeBrief** 控制叙事
- **LLM** 负责表达
- **GenerationMeta** 保证可解释性

核心不是 UI，也不是模型，而是：
**结构化内容（Story Schema）+ 受控 AI 生成（Constrained Generation）+ 稳定渲染（Stable Renderer）**

---

## 1. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 移动端 App | React Native + Expo | TS 统一，Expo 简化发布流程，RN 覆盖上传/输入场景 |
| H5 渲染 | Next.js + Framer Motion | SSR 支持 Open Graph，Framer Motion 实现动效，Vercel 零运维 |
| 后端 API + 队列 | Fastify + TypeScript + BullMQ | 轻量无样板，逻辑分层但单服务部署 |
| 数据库 | PostgreSQL + Prisma | JSONB 存 document/meta，Prisma 类型安全 |
| Auth + 存储 | Supabase | DB + Auth + Storage 三合一，托管省心 |
| 订阅支付 | RevenueCat | 同时处理 App Store / Google Play，不自己碰收款逻辑 |
| 部署 | Vercel + Railway | 两个部署单元，运维成本最低 |

**不引入 Python。** AI 调用使用 OpenAI TypeScript SDK，图片处理使用 `sharp`，EXIF 解析使用 `exifr`，无本地模型推理需求。

### 部署结构

```
Vercel   → Next.js  （H5 渲染 + 分享页）
Railway  → Fastify  （API + BullMQ Jobs + Worker）
Supabase → PostgreSQL + Auth + Storage
```

---

## 2. 系统架构

```
┌─────────────────────────────────────────────┐
│          React Native App (Expo)            │
│   Home │ Stories │ Highlights │ Profile     │
│             WebView（Story H5）              │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│          Fastify API（TypeScript）           │
│                                             │
│  /assets  /stories  /highlights             │
│  /children  /subscriptions  /shares         │
│                                             │
│  ┌────────────────────────────────────┐     │
│  │    BullMQ 任务队列（Redis）         │     │
│  │    story-generation worker         │     │
│  │    timezone-aware scheduler        │     │
│  └────────────────────────────────────┘     │
└──────────┬────────────────┬─────────────────┘
           │                │
    ┌──────▼──────┐   ┌─────▼──────┐
    │  Supabase   │   │  OpenAI    │
    │  PG + S3    │   │  API       │
    └─────────────┘   └────────────┘

┌─────────────────────────────────────────────┐
│           Next.js（H5 渲染层）               │
│  /story/[id]     → App WebView 加载          │
│  /share/[token]  → 外部分享页                │
│  SSR generateMetadata → OG meta 输出         │
└─────────────────────────────────────────────┘
```

### 时区感知调度器

Story 生成触发时间为**用户本地时区次月 1 日 00:00**，不使用全局 UTC cron。

```
hourly cron job
  ↓
查询：当前 UTC 时间落在哪些用户时区的"次月 1 日 00:00~01:00"
  ↓
过滤：本月 story 尚未生成（status != completed/fallback_generated）
  ↓
按配额判断：
  Premium → 加入生成队列（无水印）
  Free quota > 0 → 加入生成队列（带水印），quota - 1
  Free quota = 0 → 跳过，S-01 当月卡片展示锁定态
```

`users.timezone` 是业务关键字段，不仅用于展示。所有月份边界计算（素材归档范围、Memory 可编辑窗口、生成倒计时）均以用户本地时区为准。

### Renderer 架构：一套渲染器，两个 Shell

核心原则：同一个 renderer 组件，不同的 runtime shell。

```tsx
// App 内（通过 WebView 加载）
<AppStoryShell>
  {/* 注入 auth token、处理返回导航、
      桥接原生分享、埋点上报 */}
  <StoryRenderer document={doc} runtime="app" />
</AppStoryShell>

// 外部分享页
<PublicShareShell>
  {/* 校验 shareToken、输出 OG meta、
      控制公开字段可见性 */}
  <StoryRenderer document={doc} runtime="public" />
</PublicShareShell>
```

**共用部分：** 所有视觉渲染——section 布局、主题样式、动效、字体排版、水印展示、**FooterBrandBlock**。

**FooterBrandBlock** 是标准渲染组件，进入 `StoryRenderer` 本体，App 内和外部分享页均展示：

```tsx
// StoryRenderer 内部结构
<StoryContent sections={doc.sections} theme={doc.theme} />
<FooterBrandBlock />   // Nestory 品牌标识 + App Store / Google Play 下载链接
                       // 视觉权重低，不干扰阅读体验
                       // 两端均渲染，不区分 runtime
```

**不共用部分：** Auth 注入、shareToken 校验、埋点、原生桥接、OG meta 输出。

### Story List 状态机

Stories List 的视图逻辑不能只靠"有没有 story 数据"渲染，需要明确的状态枚举：

```typescript
type StoryListItemState =
  | "current_collecting"        // 当月无上传，收集中
  | "current_in_progress"       // 当月有上传，等待月末生成
  | "current_quota_exhausted"   // Free 配额 = 0，锁定态，可点击 → Paywall C
  | "historical_generated"      // 历史已生成，可点击进入 S-02
  | "historical_not_generated"  // 历史有 Memory 但未生成，不可点击
```

前后端共享同一套状态判断规则，不允许前端自行推断。

### 来源感知路由

H-02（Add Memory）和 H-04（Memory Detail）从不同入口进入，Save/返回目标不同，需要路由层传递来源参数：

```typescript
// 导航时传入来源
router.push('/add-memory', { source: 'home' | 'memory-list' | 'stories-list' })

// Save 后根据 source 决定返回目标
const returnTarget = {
  'home':          '/memory-list',
  'memory-list':   '/memory-list',
  'stories-list':  '/stories-list',
}
```

---

## 3. AI Pipeline

### 总览

```
素材库（assets）
  ↓
[1] Planner          （规则引擎）
  ↓
[2] Narrative Brief  （规则 + 一次小 LLM 调用）
  ↓
[3] 主 LLM 生成       （一次完整调用 → 结构化 JSON 输出）
  ↓
[4] Validator        （轻校验：schema + anchor + 字数）
  ↓
[5] 持久化 + 渲染
```

### 核心原则：先验约束优于后验纠错

| ❌ 不采用 | ✅ 采用 |
|---|---|
| 自由生成 → validator 事后修补 | Planner + prompt 约束 → LLM 在框架内填空 |
| 生成后检测 hallucination | 生成前限制每个 section 的可写范围 |
| validator 承担主要防错职责 | validator 只做 sanity check |

**关键规则：** 靠近"事实"的内容必须**选择**，不能**生成**。抽象主题词可以生成。

---

### [1] Planner（规则引擎）

**输入：** assets（当月，按用户本地时区归档）、childAgeMonths、monthKey
**输出：** `SectionPlan[]`、`qualityLevel`、`candidateMomentGroups`

#### 素材质量分档

| 档位 | 判断标准 | Section 数量 |
|---|---|---|
| `low` | 素材 < 5 个，无文字备注 | 3 个 |
| `medium` | 素材 5–15 个，有少量文字 | 4–5 个 |
| `rich` | 素材 15+ 个，有文字备注 | 5–6 个 |

> 内部计算连续值 `qualityScore`（0–1）并存入数据库。`qualityLevel` 从 score 映射，采用软边界（综合考虑 `text_richness` 和 `temporal_spread`，而非纯靠素材数量）。

#### SectionIntent × 质量档位映射

```
low:    [scene_setting, age_context, closing_callback]
medium: [scene_setting, anchored_event, reflection, closing_callback]
rich:   [scene_setting, routine_texture, anchored_event, reflection, closing_callback]
```

#### 候选叙事峰值组

```typescript
candidateMomentGroups: [
  { groupId: "g1", assetIds: ["img_002"], reason: "highlight_marked" },
  { groupId: "g2", assetIds: ["img_005", "img_006"], reason: "user_text_specific" },
  { groupId: "g3", assetIds: ["img_009"], reason: "highest_salience" }
]
```

> `reason` 枚举：`highlight_marked`（用户主动标为 Highlight）/ `user_text_specific`（有具体文字备注）/ `highest_salience`（系统判断显著性）。原 `milestone_tagged` 已移除（Milestone Picker 在 PRD v1.5 中删除）。

---

### [2] Narrative Brief（叙事控制层）

**来源：规则生成 + 一次小 LLM 调用。**

```typescript
type NarrativeBrief = {
  ruleGenerated: {
    sectionIntents: SectionIntent[]
    callbackAssetId: string
    avoidRepetition: string[]
    candidateMomentGroups: CandidateMomentGroup[]
  }
  llmGenerated: {
    themePhrase: string              // 3–8 个词，仅用于叙事凝聚
    selectedMomentGroupId?: string   // 从候选中选择，不自由生成
  }
}
```

**themePhrase 约束：**
- 最多 8 个词
- 不得引入未经素材证实的情绪或事件
- 描述可观察的内容质感，不做意义解读
- ✅ 好的例子：`"learning to pull herself up"` / `"a quieter month at home"`
- ❌ 坏的例子：`"discovering the joy of independence"`（解读了意义）

---

### [3] 主 LLM 生成

**一次调用，整篇输出，强制结构化 JSON。**

Prompt 结构示意：

```
Story plan（写作框架）:
[Section 1] type: cover | intent: scene_setting
  - 只描述 img_001 中可见的内容
  - contentSource: visual_literal_only
  - 最多 60 词

[Section 2] type: narrative | intent: anchored_event
  - 只使用父母备注 + img_002、img_004 中可见内容
  - contentSource: visual_and_text
  - 最多 150 词

[Section 3] type: age_context | intent: age_context
  - {X} 个月的通用发育背景
  - contentSource: context_with_disclaimer
  - 必须使用模糊语气："around this age"、"many babies"
  - 最多 80 词

Narrative brief:
  theme: "{themePhrase}"
  情绪弧线: [scene_setting → anchored_event → reflection → closing_callback]
  结尾必须回扣: img_001
  避免重复的词: [词表]

素材信息:
  img_001: {vision 描述} | 父母备注: "无"
  img_002: {vision 描述} | 父母备注: "她今天第一次爬过来找我"

语气示例（严格参照这种风格）:
  [正样本片段]

绝对不要写成这样:
  [反样本片段]

只输出合法 JSON，不输出散文，不输出 markdown，不输出前言。
```

#### 内容来源类型（contentSource）

| 类型 | 含义 |
|---|---|
| `visual_literal_only` | 只描述照片中肉眼可见的内容 |
| `user_claim_only` | 只复述父母明确写下的内容 |
| `visual_and_text` | 照片内容 + 父母备注均可使用 |
| `context_with_disclaimer` | 月龄通用发育背景，必须使用模糊语气 |

---

### [4] Validator（轻校验）

Validator **不是**主要的 hallucination 防线——Planner 和 prompt 才是。

Validator 只检查：
- Schema 结构合法性（必填字段存在，类型正确）
- `anchorAssetIds` 引用的素材存在于输入集合中
- 各 section 字数未超过 `maxWords`
- `themePhrase` 长度 ≤ 8 词

---

### 失败处理策略

```
主生成失败
  → retry 一次（相同 prompt）

retry 仍失败
  → fallback 生成
     （cover + age_context + ending 使用固定模板）
     status: "fallback_generated"

fallback 失败
  → status: "failed"
     前端展示："This month's story is being prepared ❤️"
```

失败信息记录在 `generation_meta.failureTracking` 中。

---

## 4. 核心数据结构

### 枚举类型

```typescript
type SectionIntent =
  | "scene_setting"      // 开场白，锚定封面图，确立本月基调
  | "anchored_event"     // 有具体素材支撑的叙事，写真实发生的事
  | "routine_texture"    // 日常氛围，多素材拼贴，无需单一事件锚点
  | "age_context"        // 月龄发育背景，通用补全，需模糊语气
  | "reflection"         // 父母视角的情感感受，主观表达
  | "closing_callback"   // 回扣封面图收尾，首尾呼应

type SectionOutputType =
  | "cover"              // 封面块，大图 + 标题
  | "summary"            // 统计卡片，本月照片数/文字数/记录天数
  | "narrative"          // 叙事文字块，主要的故事段落
  | "photo_group"        // 多图拼贴块，single/grid_2/grid_3 布局
  | "age_context"        // 月龄背景文字块，通用发育说明
  | "reflection"         // 父母感受文字块，情感段落
  | "closing_callback"   // 结尾块，回扣封面图
  | "low_input_hint"     // 素材不足提示块，引导下月多记录
  | "milestone"          // 里程碑块，第一次走路/说话等关键节点

type StoryStatus =
  | "pending"            // 等待生成，任务已创建但尚未开始
  | "generating"         // 生成中，Worker 正在执行 pipeline
  | "completed"          // 生成成功，StoryDocument 已就绪
  | "failed"             // 全部失败，主生成 + retry + fallback 均失败
  | "fallback_generated" // 降级成功，主生成失败但 fallback 版本已生成
```

> `intent` = 这个 section 的叙事角色（为什么存在）
> `outputType` = 这个 section 的渲染形态（如何展示）

---

### SectionPlan

```typescript
type SectionPlan = {
  id: string
  intent: SectionIntent
  outputType: SectionOutputType
  allowedAssetIds: string[]        // 空数组 = 不允许引用具体素材
  supportsAgeContext: boolean      // 是否允许月龄通用叙事
  requiresAnchor: boolean          // 必须有至少一个素材锚点
  maxWords: number
  required: boolean
}
```

---

### StorySection（联合类型）

```typescript
type StorySection =
  | { id: string; type: "cover"; intent: "scene_setting"
      imageUrl: string; headline: string }

  | { id: string; type: "summary"
      photosCount: number; wordsCount: number; daysRecorded: number }

  | { id: string; type: "narrative"
      intent: "anchored_event" | "routine_texture"
      text: string; anchorAssetIds: string[]
      generatedFrom: "user_input" | "age_context" | string }  // string 留扩展口

  | { id: string; type: "photo_group"; intent: "routine_texture"
      layout: "single" | "grid_2" | "grid_3"
      photos: { assetId: string; imageUrl: string; caption?: string }[] }

  | { id: string; type: "age_context"; intent: "age_context"
      text: string; ageMonths: number }

  | { id: string; type: "reflection"; intent: "reflection"
      text: string; anchorAssetIds: string[] }

  | { id: string; type: "closing_callback"; intent: "closing_callback"
      text: string; callbackAssetId: string }

  | { id: string; type: "low_input_hint"
      message: string; photosCount: number; wordsCount: number }

  | { id: string; type: "milestone"
      intent: "anchored_event"
      tag: string; imageUrl?: string; text: string }
```

> `generatedFrom` 在数据库中存为 `VARCHAR`（非 enum），避免未来扩展时需要 migration。

---

### StoryDocument

```typescript
type StoryDocument = {
  storyId: string
  childId: string
  monthKey: string           // "2026-03"
  locale: "en-US"

  meta: {
    title: string            // "March · 8 months"
    coverImageUrl: string
    childAgeMonths: number
  }

  theme: {
    themeId: string          // 如 "winter_infant"，生成时固化，不再变动
    assignedAt: string
    version: number
  }

  watermark: {
    enabled: boolean         // 生成时按订阅状态写入，之后永久固化
    text: string             // "Made with Nestory"
  }

  shareMeta: {
    ogTitle: string
    ogDescription: string
    ogImageUrl: string
    // shareToken 不存在这里，在 story_shares 表中独立管理
  }

  qualityLevel: "low" | "medium" | "rich"  // 面向产品逻辑 / UI 行为
  sections: StorySection[]
}
```

---

### StoryGenerationMeta

```typescript
type StoryGenerationMeta = {
  // 输入快照
  assetCount: number
  textWordCount: number
  qualityScore: number
  qualityLevel: "low" | "medium" | "rich"

  // Planner 输出
  sectionPlan: SectionPlan[]
  candidateMomentGroups: CandidateMomentGroup[]

  // Narrative Brief 完整快照
  narrativeBrief: NarrativeBrief

  // 锚点审计
  anchorAudit: {
    sectionId: string
    assetIds: string[]
    anchorTypes: ("user_text" | "user_photo" | "age_context")[]
  }[]

  // 生成追踪
  promptVersion: string          // 如 "planner-v1.0_brief-v1.0_gen-v1.0"
  modelName: string              // 如 "gpt-4o-2024-08-06"
  generatedAt: string
  generationDurationMs: number

  // 失败追踪
  failureTracking: {
    retries: number
    failedReason?: string
    usedFallback: boolean
  }
}
```

> `StoryDocument.qualityLevel` = 面向产品逻辑，renderer/UI 使用
> `StoryGenerationMeta.qualityLevel` = 生成时内部快照，调试/分析使用

---

## 5. 数据库 Schema

### users 表

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255),
  timezone    VARCHAR(50) NOT NULL DEFAULT 'UTC',
  -- timezone 是业务关键字段，用于：
  --   1. Story 生成调度（次月 1 日本地时区触发）
  --   2. 素材月份归档范围计算
  --   3. Memory 可编辑窗口判断
  --   4. 生成倒计时展示
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### stories 表

```sql
CREATE TABLE stories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             UUID NOT NULL REFERENCES children(id),
  user_id              UUID NOT NULL REFERENCES users(id),
  month_key            VARCHAR(7) NOT NULL,    -- "2026-03"（用户本地时区月份）
  status               VARCHAR(30) NOT NULL DEFAULT 'pending',

  -- 可索引的显式列（高频查询/统计）
  quality_level        VARCHAR(10),
  quality_score        DECIMAL(4,3),
  prompt_version       VARCHAR(60),
  model_name           VARCHAR(60),
  generated_at         TIMESTAMPTZ,
  is_last_free_story   BOOLEAN DEFAULT FALSE,  -- 配额归零时生成的最后一份，触发 Paywall A
  generated_under_plan VARCHAR(10),            -- "free" | "premium"，水印永久固化的依据

  -- JSONB 列
  document        JSONB,                       -- StoryDocument
  generation_meta JSONB,                       -- StoryGenerationMeta

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(child_id, month_key)
);

CREATE INDEX idx_stories_quality_level      ON stories(quality_level);
CREATE INDEX idx_stories_prompt_version     ON stories(prompt_version);
CREATE INDEX idx_stories_status             ON stories(status);
CREATE INDEX idx_stories_is_last_free       ON stories(is_last_free_story) WHERE is_last_free_story = TRUE;
```

### subscriptions 表

```sql
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) UNIQUE,
  plan_type           VARCHAR(10) NOT NULL DEFAULT 'free',  -- "free" | "premium"
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  story_quota         INT NOT NULL DEFAULT 2,
  -- story_quota 规则：
  --   新 Free 用户初始值 = 2
  --   每次生成消耗 1（Premium 不消耗）
  --   Premium 降级后归零，不重置
  expires_at          TIMESTAMPTZ,
  paywall_trigger_log JSONB DEFAULT '{}',   -- 记录已触发的转化点，防止重复弹出
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### story_shares 表

```sql
CREATE TABLE story_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID NOT NULL REFERENCES stories(id),
  token       VARCHAR(64) NOT NULL UNIQUE,
  visibility  VARCHAR(20) NOT NULL DEFAULT 'private_link',
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### tags 表（关联表，非 enum）

```sql
CREATE TABLE tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50) NOT NULL UNIQUE,  -- "Playtime", "Mealtime"...
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE asset_tags (
  asset_id UUID NOT NULL REFERENCES raw_assets(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id),
  PRIMARY KEY (asset_id, tag_id)
);

-- MVP 预置 8 个固定 tag，后续可增删排序，无需 migration
-- INSERT INTO tags (name, display_order) VALUES
--   ('Playtime', 1), ('Mealtime', 2), ('Bedtime', 3), ('Bath Time', 4),
--   ('Outdoor', 5), ('Family Time', 6), ('Funny Moment', 7), ('Learning', 8);
```

### raw_assets 表

```sql
CREATE TABLE raw_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES children(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  asset_type      VARCHAR(10) NOT NULL,        -- "photo" | "text"
  file_url        VARCHAR(500),
  text_note       TEXT,
  captured_at     TIMESTAMPTZ NOT NULL,
  -- captured_at：用户本地时间（客户端传入），用于：
  --   1. 月份归档（判断素材属于哪个月）
  --   2. Memory 可编辑窗口（是否为当月）
  --   3. story 时间线排序
  exif_taken_at   TIMESTAMPTZ,                 -- EXIF 时间，次要参考
  ai_description  TEXT,
  ai_keywords     JSONB,
  is_highlight    BOOLEAN DEFAULT FALSE,
  highlight_note  VARCHAR(100),                -- Highlight 时的自定义描述（≤100字符）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  -- created_at：服务端 UTC 时间，仅用于系统审计
);

CREATE INDEX idx_assets_child_captured ON raw_assets(child_id, captured_at DESC);
```

### children 表

```sql
CREATE TABLE children (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  name        VARCHAR(50) NOT NULL,
  birth_date  DATE NOT NULL,
  avatar_url  VARCHAR(500),
  gender      VARCHAR(20),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### highlights 表

```sql
CREATE TABLE highlights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  child_id          UUID NOT NULL REFERENCES children(id),
  asset_id          UUID NOT NULL REFERENCES raw_assets(id),
  card_type         VARCHAR(50),
  rendered_image_url VARCHAR(500),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. 视觉主题系统

主题在**生成时固化，随 story 一起存储**，之后不再变动。圣诞节前生成的 story，圣诞节后打开依然是圣诞主题。

```typescript
function resolveTheme(monthKey: string, childAgeMonths: number): ThemeAssignment {
  const month = monthKey.slice(5, 7)

  // 优先级：节日 > 季节 > 月龄阶段
  const holidays: Record<string, string> = {
    "12": "christmas", "10": "halloween",
    "02": "valentine", "01": "newyear"
  }
  if (holidays[month]) return buildTheme(holidays[month], childAgeMonths)

  const seasons: Record<string, string> = {
    "03": "spring", "04": "spring", "05": "spring",
    "06": "summer", "07": "summer", "08": "summer",
    "09": "autumn", "10": "autumn", "11": "autumn",
    "12": "winter", "01": "winter", "02": "winter"
  }

  const ageStage =
    childAgeMonths < 3  ? "newborn"   :
    childAgeMonths < 12 ? "infant"    :
    childAgeMonths < 24 ? "toddler"   : "preschool"

  return buildTheme(`${seasons[month]}_${ageStage}`, childAgeMonths)
}
```

---

## 7. 订阅与付费转化

### 订阅方案对比

| 功能 | Free | Premium |
|---|---|---|
| 上传素材 | 不限量 | 不限量 |
| Story 生成 | 2 份配额（用完即止） | 持续生成 |
| Story 水印 | 有（"Made with Nestory"） | 去除 |
| Highlights | 最多 10 个 | 不限量 |
| 孩子档案 | 1 个活跃档案 | 不限量 |
| 附加特色功能 | — | Birthday Celebration Push 等 |

### 降级处理规则

用户从 Premium 降级为 Free 后：

- **已生成的所有历史 Story 保持原状且可正常访问**：付费期间生成的无水印 Story 永久无水印（`watermark.enabled` 已在生成时固化为 false）；Free 期间生成的带水印 Story 保持带水印
- **当月及后续月份 Story 不再生成**：`story_quota` 归零，不重置
- **Highlights**：超出 10 个的已有记录保留展示，但无法新增标记
- **孩子档案**：超出 1 个的档案数据保留，非活跃档案切换入口置灰不可选

### Contextual Paywall（参数化引擎）

P-01 不是固定弹窗，是接收触发上下文的参数化组件：

```typescript
type PaywallTrigger = "A" | "B" | "C" | "D"

<PaywallModal trigger="A" onClose={...} onUpgrade={...} />
// 组件内部根据 trigger 决定：
//   - 顶部情感化标题
//   - 利益点排序
//   - 埋点事件名称
```

**触发点 A — 第 2 份 Story 看完后返回 S-01 时（情感峰值 + 损失厌恶叠加）**

触发条件：`story.is_last_free_story = true` + 用户为 Free + 首次触发（同一 story 周期内仅一次）

利益点排序：① 持续生成，不中断成长记录 → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features

**触发点 B — Highlights 触达 10 个上限时（损失厌恶）**

触发时机：Toggle 点击时前端检查 count ≥ 10，不等到 Save 时

利益点排序：① 无限 Highlights → ② 持续生成 Story → ③ Watermark-Free Sharing → ④ Extra Features

**触发点 C — Free 用户第 3 月起当月 Story 锁定（配额 = 0）**

触发位置：S-01 当月状态卡片（锁定态可点击）

利益点排序：① 持续生成，不中断成长记录 → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features

**触发点 D — Free 用户尝试切换 / 添加孩子档案**

触发位置：H-01 切换入口 Bottom Sheet / ST-03a 添加按钮

利益点排序：① 无限孩子档案 → ② 持续生成 Story → ③ 无限 Highlights → ④ Watermark-Free Sharing

**文案原则：** 所有付费引导文案必须以"你可以拥有更多"为出发点，而非"你即将失去什么"。

**订阅状态必须以后端为准**，前端有同步刷新机制，不允许只靠前端缓存判断权益。

---

## 8. 开发路线图

### Sprint 1 — 核心闭环

- [ ] Prisma schema + TypeScript 类型定义（含 timezone、tag 关联表）
- [ ] 素材上传（照片 + 文字 + Tag）
- [ ] 时区感知 Story 调度器（hourly cron）
- [ ] Planner 规则引擎（三档）
- [ ] Story 生成（接入 OpenAI，整篇 JSON 输出）
- [ ] Story 状态机（五种状态枚举）
- [ ] 来源感知路由（H-02 / H-04）
- [ ] 基础 H5 renderer（单一主题，含 FooterBrandBlock）
- [ ] App WebView 接入
- [ ] 基础 Open Graph meta
- [ ] **Story 样本写作（与 Sprint 1 并行，不得推迟至 Sprint 2）**

### Sprint 2 — 产品差异化

- [ ] 视觉主题系统（3–4 套主题）
- [ ] Highlights 功能（含 count 限制和 Remove 操作）
- [ ] 水印系统（渲染层控制，生成时固化）
- [ ] Open Graph 完整配置
- [ ] story_shares 表 + token 访问控制
- [ ] Memory List 时间线（H-03，时区感知月份分组）
- [ ] Story 生成完成推送通知

### Sprint 3 — 商业化

- [ ] Paywall A + B + C + D（参数化组件）
- [ ] RevenueCat 接入（订阅状态后端同步）
- [ ] 配额模型完整实现（quota 消耗、降级归零）
- [ ] Failure mode 完整处理
- [ ] 埋点体系（见 §10）

---

## 9. 开工前必须完成的非工程任务

**Story 样本写作已前移至 Sprint 1 并行任务，不得推迟。**

### Story 样本集

| 类型 | 数量 | 用途 |
|---|---|---|
| 正样本 | 12–15 篇 | 建立语气、风格、具体性的审美锚点 |
| 反样本 | 8–10 篇 | 明确绝对不能产出的内容 |
| Writing Rubric | 1 份文档 | 将判断标准文字化，可持续调优 |

样本需覆盖：
- 三个质量档位（low / medium / rich）
- 多个月龄阶段（newborn / infant / toddler）
- 有里程碑的月份 vs 普通平淡月份
- 有大量照片但无文字的情况
- 有少量照片但文字详细的情况

### Writing Rubric 必须回答的问题

- 情感温度来自哪里（不是来自形容词堆砌）
- 什么让一句话"像父母写的"而不是"像 AI 写的"
- low-input 档位下，月龄通用叙事补全的边界在哪里
- 结尾应该是什么感觉——不是营销文案，不是鸡汤
- 永久禁用词列表（具体列出来）

---

## 10. 埋点事件清单

埋点事件在 Sprint 1 就需要设计好 schema，不在 Sprint 3 补。

### Story 生成链路

| 事件 | 触发时机 | 关键属性 |
|---|---|---|
| `story_generation_started` | Worker 开始处理 | story_id, user_id, quality_level |
| `story_generation_completed` | 生成成功 | story_id, duration_ms, prompt_version |
| `story_generation_failed` | retry 仍失败 | story_id, failed_reason, retries |
| `story_generation_fallback` | 使用 fallback 模板 | story_id |

### 付费转化链路

| 事件 | 触发时机 | 关键属性 |
|---|---|---|
| `paywall_shown` | P-01 弹出 | trigger: A/B/C/D, user_id |
| `paywall_dismissed` | 点击关闭 | trigger, time_on_paywall_ms |
| `paywall_converted` | 订阅成功 | trigger, plan_type |
| `story_locked_state_viewed` | S-01 锁定态卡片曝光 | user_id |
| `highlight_limit_hit` | Highlight count ≥ 10 触发 | user_id |

### 分享与获客

| 事件 | 触发时机 | 关键属性 |
|---|---|---|
| `story_share_created` | 生成分享链接 | story_id, user_id |
| `share_link_opened` | 外部 H5 分享页被打开 | story_id, referrer |
| `footer_appstore_clicked` | H5 底部 App Store 点击 | story_id, source: app/public |
| `footer_googleplay_clicked` | H5 底部 Google Play 点击 | story_id, source: app/public |

---

## 11. 关键设计决策日志

| 决策点 | 最终选择 | 被否决的选项 | 理由 |
|---|---|---|---|
| 开发语言 | 全栈 TypeScript | 引入 Python Worker | 无本地模型需求，OpenAI TS SDK 已足够 |
| 后端框架 | Fastify | NestJS | NestJS 样板开销对小团队不合理 |
| 生成策略 | 整篇一次生成 | 按 section 分段生成 | 分段生成破坏叙事连贯性，像拼接的独立段落而非一篇日记 |
| Hallucination 控制 | Planner + prompt 先验约束 | 事后 validator 纠错 | Validator 只能删，不能修；删后文本断裂，体验崩坏 |
| highlight_moment | 从候选中选择 | LLM 自由生成 | 靠近事实的内容必须选择，不能发明 |
| shareToken 位置 | story_shares 独立表 | 放入 StoryDocument | 生命周期不同：token 可撤销/轮换，不应污染 story 内容 |
| sourceAnchors 位置 | generation_meta.anchorAudit | StoryDocument 顶层 | 仅用于审计，renderer 使用 section 内的 anchorAssetIds |
| Theme 解析时机 | 生成时固化存入 story | 每次打开实时计算 | 历史 story 必须每次打开都呈现一致的样式 |
| generatedFrom 字段 | 数据库存 VARCHAR | 数据库 enum | VARCHAR 允许未来扩展，无需 migration |
| qualityLevel 阈值 | 软边界（综合文字丰富度） | 硬性素材数量阈值 | 3 张照片 + 2 条详细备注，可能比 20 张无说明照片更 rich |
| Story 生成调度 | hourly 时区感知 cron | 全局 UTC 月末 cron | 用户遍布全球时区，生成时间必须对齐用户本地月初 |
| Tag 数据模型 | 独立关联表（tags + asset_tags） | asset 表内存 enum | 支持未来增删排序，无需 migration |
| captured_at vs created_at | captured_at 用于业务逻辑 | created_at 用于月份判断 | 月份归档和可编辑窗口必须按用户上传时间，不能按服务端时间 |
| 水印状态固化 | 生成时写入 StoryDocument | 渲染时动态读取订阅状态 | 降级后历史 story 水印状态永久不变，必须在生成时固化 |
| Paywall 设计 | 参数化组件（接收 trigger） | 四个独立弹窗 | 利益点排序随上下文变化，参数化更易维护和 A/B 测试 |

---

*本文档反映经系统性技术评审后确定的设计决策。后续变更需基于此基线提供充分理由。*
*PRD 依据：v1.6（2026-04-03）+ PageStructure v1.4（2026-04-03）*
