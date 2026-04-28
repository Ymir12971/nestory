# Nestory — 技术栈与架构设计文档

**版本：** v1.3
**日期：** 2026-04-12
**上一版本：** v1.2（2026-04-12）
**作者：** Justin（后端开发）、Vicol（产品设计）
**状态：** 已批准，可进入 MVP 实现阶段

### v1.3 变更记录

- **§5 数据库 Schema**：拆分为独立文档 `Nestory_数据库设计.md`，本章保留表清单和关键设计原则摘要

### v1.2 变更记录

基于 SubscriptionRules v1.2 的架构影响分析：

- **§5 数据库 Schema**：`users` 表新增 `has_seen_downgrade_toast`；`highlights` 表新增 `user_id` 索引；`subscriptions` 表补充 `paywall_trigger_log` 格式说明
- **§7 订阅与付费转化**：新增权限拦截位置总览表（来自 SubscriptionRules 第四章）；补充 R-05 后端校验边界（切换拦截，创建不拦截）；补充 R-10 降级 Toast 一次性触发逻辑；补充 R-11 Free Trial CTA 动态文案
- **§10 埋点事件清单**：新增用户状态链路（`downgrade_toast_shown`、`profile_switch_blocked`、`highlight_removed`）
- **§11 关键设计决策日志**：新增 3 条（R-05 后端边界、R-10 Toast、R-11 Trial）

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
按配额判断（R-01）：
  Free quota = 0 → 跳过，S-01 当月卡片展示锁定态
  Premium / Free quota > 0 → 继续
  ↓
INSERT stories(status='pending', child_id, month_key, ...)
ON CONFLICT (child_id, month_key) DO NOTHING
RETURNING id
  ↓
  有返回行（真正插入）→ enqueue BullMQ job
  无返回行（已有行）  → 跳过，不入队
```

**去重逻辑由 DB UNIQUE constraint 承担，调度器无需理解 story 的各种 status。** 已有行（任何状态：pending / generating / completed / failed）均被 `ON CONFLICT DO NOTHING` 静默忽略，只有真正插入新行时才入队。

```typescript
// apps/nestory-api/src/jobs/schedulers/story.scheduler.ts
for (const { childId, userId, monthKey, planType } of eligible) {
  const inserted = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO stories (child_id, user_id, month_key, status)
    VALUES (${childId}, ${userId}, ${monthKey}, 'pending')
    ON CONFLICT (child_id, month_key) DO NOTHING
    RETURNING id
  `
  if (inserted.length === 0) continue  // 已有行，跳过

  await storyQueue.add(
    'story-generation',
    { storyId: inserted[0].id, planType },
    {
      jobId:    `story-${childId}-${monthKey}`,
      // 相同 jobId 已在队列中时 BullMQ 静默忽略，双重保险
      attempts: 3,
      backoff:  { type: 'exponential', delay: 60_000 },
      // 失败后 1min / 2min / 4min 自动重试，三次全败才写 status='failed'
      timeout:  5 * 60 * 1000,
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail:     false,
    }
  )
}
```

**`pending` 行插入即触发 Supabase Realtime**，前端无需刷新即可感知生成开始。

`users.timezone` 是业务关键字段。所有月份边界计算（素材归档范围、Memory 可编辑窗口、生成倒计时）均以用户本地时区为准。

### Renderer 架构：一套渲染器，两个 Shell

```tsx
<AppStoryShell>      // 注入 token、埋点、原生桥接
  <StoryRenderer document={doc} runtime="app" />
</AppStoryShell>

<PublicShareShell>   // 校验 shareToken、OG meta、访问控制
  <StoryRenderer document={doc} runtime="public" />
</PublicShareShell>
```

**FooterBrandBlock** 进入 `StoryRenderer` 本体，两端均渲染：

```tsx
<StoryContent sections={doc.sections} theme={doc.theme} />
<FooterBrandBlock />   // 品牌标识 + App Store / Google Play 下载链接
```

### Story List 状态机

```typescript
type StoryListItemState =
  | "current_collecting"        // 当月无上传，收集中
  | "current_in_progress"       // 当月有上传，等待月末生成
  | "current_quota_exhausted"   // Free 配额 = 0，锁定态，可点击 → Paywall C
  | "historical_generated"      // 历史已生成，可点击进入 S-02
  | "historical_not_generated"  // 历史有 Memory 但未生成，不可点击
```

前后端共享同一套状态判断规则，不允许前端自行推断。

### Story 生成完成通知（Supabase Realtime）

Story 生成由调度器异步触发，前端需要感知 `stories.status` 变化。使用 **Supabase Realtime**（PostgreSQL LISTEN/NOTIFY + WebSocket），不使用轮询。

#### 为什么不用轮询

轮询有两个根本缺陷：
1. **时机问题**：用户已在 Stories 屏幕时，调度器才触发写入 `pending` 行，前端的初始 GET 已结束，不知道要开始轮询
2. **退出条件**：若 job 卡住，状态停在 `pending/generating`，前端无限轮询，用户体验差

#### BullMQ Worker 必须保证终态

Worker 必须保证每个 story 最终落入 `completed` / `fallback_generated` / `failed`，不允许永久停在 `pending/generating`：

```typescript
// apps/nestory-api/src/jobs/workers/story-generation.worker.ts
const worker = new Worker('story-generation', async (job) => {
  const { storyId } = job.data

  // 原子抢占：只有 status='pending' 的行才能被认领
  // 防止两个 worker 同时处理同一个 story（BullMQ jobId 之外的第二道保险）
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE stories SET status = 'generating'
    WHERE id = ${storyId} AND status = 'pending'
    RETURNING id
  `
  if (claimed.length === 0) return  // 已被其他 worker 认领或已完成，直接退出

  try {
    const result = await runAIPipeline(storyId)
    await prisma.stories.update({
      where: { id: storyId },
      data: { status: 'completed', document: result.document, generated_at: new Date() }
    })
  } catch (err) {
    await prisma.stories.update({ where: { id: storyId }, data: { status: 'failed' } })
    throw err
    // BullMQ 收到 throw → 按 attempts 配置自动重试（backoff: 1min / 2min / 4min）
    // 三次全败 → job 进 BullMQ failed 队列，status 保持 'failed'，不再自动重试
  }
}, { connection: redis })
```

**`timeout: 5min` 在入队时配置**（见调度器代码），超时后 BullMQ 将 job 标记为失败，触发 catch 块写 `status='failed'`，同样走重试流程。

#### 前端订阅（React Native + supabase-js）

```typescript
// apps/nestory-mobile/src/screens/StoriesScreen.tsx
useEffect(() => {
  const channel = supabase
    .channel(`story-${childId}-${monthKey}`)
    .on(
      'postgres_changes',
      {
        event: '*',  // 监听 INSERT（pending 行出现）和 UPDATE（状态流转）
        schema: 'public',
        table: 'stories',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const story = payload.new as Story
        if (story.child_id !== childId || story.month_key !== monthKey) return
        // 过滤当前档案当月的事件
        setStory(story)
        // UI 根据 story.status 自动渲染：
        //   pending / generating → 加载动画
        //   completed / fallback_generated → 渲染 Story
        //   failed → 错误提示 + 重试 CTA
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId, childId, monthKey])
```

**订阅在进入 Stories 屏幕时建立，离开时销毁。** supabase-js 自动处理 WebSocket 重连和 App 前后台切换。

#### Supabase 配置

```sql
-- 1. 开启 stories 表的 Realtime（Supabase Dashboard 或 SQL）
ALTER PUBLICATION supabase_realtime ADD TABLE stories;

-- 2. RLS 策略：用户只能订阅自己的 story 变更
CREATE POLICY "users can subscribe to own stories"
ON stories FOR SELECT
USING (user_id = auth.uid());
```

#### 完整通知路径

```
调度器 INSERT stories(status='pending')
  ↓ Supabase Realtime 广播（< 1s）
前端收到 INSERT 事件 → 渲染加载动画

Worker UPDATE stories(status='generating')
  ↓ Supabase Realtime 广播
前端继续显示加载动画

Worker UPDATE stories(status='completed', document=...)
  ↓ Supabase Realtime 广播
前端收到 → 渲染 Story

-- 用户不在 App 时：Worker 完成后额外触发 Push Notification
-- Push 路径：worker → packages/push → Expo Push Service → FCM/APNs
```

### 来源感知路由

```typescript
router.push('/add-memory', { source: 'home' | 'memory-list' | 'stories-list' })

const returnTarget = {
  'home':          '/memory-list',
  'memory-list':   '/memory-list',
  'stories-list':  '/stories-list',
}
```

---

## 3. AI Pipeline

```
素材库（assets）
  ↓ [1] Planner（规则引擎）
  ↓ [2] Narrative Brief（规则 + 小 LLM）
  ↓ [3] 主 LLM 生成（整篇 JSON）
  ↓ [4] Validator（轻校验）
  ↓ [5] 持久化 + 渲染
```

**核心原则：先验约束优于后验纠错。** 靠近"事实"的内容必须选择，不能生成。

### [1] Planner

| 档位 | 判断标准 | Section 数量 |
|---|---|---|
| `low` | 素材 < 5，无文字 | 3 个 |
| `medium` | 素材 5–15，有少量文字 | 4–5 个 |
| `rich` | 素材 15+，有文字 | 5–6 个 |

```
low:    [scene_setting, age_context, closing_callback]
medium: [scene_setting, anchored_event, reflection, closing_callback]
rich:   [scene_setting, routine_texture, anchored_event, reflection, closing_callback]
```

候选叙事峰值组 reason 枚举：`highlight_marked` / `user_text_specific` / `highest_salience`

### [2] Narrative Brief

```typescript
type NarrativeBrief = {
  ruleGenerated: {
    sectionIntents: SectionIntent[]
    callbackAssetId: string
    avoidRepetition: string[]
    candidateMomentGroups: CandidateMomentGroup[]
  }
  llmGenerated: {
    themePhrase: string              // 3–8 词，不引入未证实事实
    selectedMomentGroupId?: string   // 从候选选择，不自由生成
  }
}
```

### [3] 主 LLM 生成

一次调用，整篇输出，强制结构化 JSON。contentSource 类型：`visual_literal_only` / `user_claim_only` / `visual_and_text` / `context_with_disclaimer`

### [4] Validator

只检查：Schema 结构合法性、anchorAssetIds 引用存在、字数未超 maxWords、themePhrase ≤ 8 词。

### 失败处理

```
主生成失败 → retry 一次
retry 失败 → fallback（cover + age_context + ending 固定模板），status: "fallback_generated"
fallback 失败 → status: "failed"，前端展示占位文案
```

---

## 4. 核心数据结构

```typescript
type SectionIntent =
  | "scene_setting"    // 开场白，锚定封面图
  | "anchored_event"   // 有具体素材支撑的叙事
  | "routine_texture"  // 日常氛围，多素材拼贴
  | "age_context"      // 月龄发育背景，需模糊语气
  | "reflection"       // 父母视角的感受
  | "closing_callback" // 回扣封面图收尾

type SectionOutputType =
  | "cover" | "summary" | "narrative" | "photo_group"
  | "age_context" | "reflection" | "closing_callback"
  | "low_input_hint" | "milestone"

type StoryStatus =
  | "pending" | "generating" | "completed"
  | "failed" | "fallback_generated"

type SectionPlan = {
  id: string
  intent: SectionIntent
  outputType: SectionOutputType
  allowedAssetIds: string[]
  supportsAgeContext: boolean
  requiresAnchor: boolean
  maxWords: number
  required: boolean
}

type StorySection =
  | { id: string; type: "cover"; intent: "scene_setting"
      imageUrl: string; headline: string }
  | { id: string; type: "summary"
      photosCount: number; wordsCount: number; daysRecorded: number }
  | { id: string; type: "narrative"
      intent: "anchored_event" | "routine_texture"
      text: string; anchorAssetIds: string[]
      generatedFrom: "user_input" | "age_context" | string }
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
  | { id: string; type: "milestone"; intent: "anchored_event"
      tag: string; imageUrl?: string; text: string }

type StoryDocument = {
  storyId: string; childId: string; monthKey: string; locale: "en-US"
  meta: { title: string; coverImageUrl: string; childAgeMonths: number }
  theme: { themeId: string; assignedAt: string; version: number }
  watermark: { enabled: boolean; text: string }  // 生成时固化，永不动态计算（R-02）
  shareMeta: { ogTitle: string; ogDescription: string; ogImageUrl: string }
  qualityLevel: "low" | "medium" | "rich"
  sections: StorySection[]
}

type StoryGenerationMeta = {
  assetCount: number; textWordCount: number
  qualityScore: number; qualityLevel: "low" | "medium" | "rich"
  sectionPlan: SectionPlan[]
  candidateMomentGroups: CandidateMomentGroup[]
  narrativeBrief: NarrativeBrief
  anchorAudit: { sectionId: string; assetIds: string[]
    anchorTypes: ("user_text" | "user_photo" | "age_context")[] }[]
  promptVersion: string; modelName: string
  generatedAt: string; generationDurationMs: number
  failureTracking: { retries: number; failedReason?: string; usedFallback: boolean }
}
```

---

## 5. 数据库 Schema

> **本章已拆分为独立文档：`Nestory_数据库设计.md`**
> 包含完整 DDL、索引汇总、字段设计决策说明。

### 表清单

| 表 | 职责 |
|---|---|
| `users` | 用户账户；`timezone`（调度关键）、`active_child_id`（活跃档案）、`deleted_at`（软删除）、`locked_at`（滥用锁定） |
| `children` | 孩子档案；含身高体重（value + unit 分开存）；创建不限数量，切换受 R-05 约束 |
| `raw_assets` | Memory 主表；`tags TEXT[]` value 模型存字符串快照；`captured_at` 为业务依据，`created_at` 仅审计 |
| `asset_files` | 单条 Memory 的多张照片（最多 10 张，R-07）；含 storage_path、display_order、宽高、字节数 |
| `user_tag_library` | 用户自定义 Tag 可复用列表（Picker 用）；与 raw_assets.tags 无外键，orphan chip 语义 |
| `highlights` | Highlight 记录；per-user 上限 10（R-04，advisory lock 防并发）；含 cover_file_id、title |
| `stories` | Story 主表；JSONB 存 document（含水印固化）+ generation_meta |
| `story_shares` | 单 token 策略（partial unique index）；256 bit 熵 base64url token |
| `subscriptions` | 含 `subscription_status` 五态（webhook 写入）、`story_quota`（原子扣减）、`paywall_trigger_log` |
| `audit_log` | 登录/删账/订阅变更等操作审计；保留 1 年 |
| `abuse_log` | 限流/滥用事件记录；联动 `users.locked_at`；保留 90 天 |

### 关键设计原则

- **显式列 + JSONB 混合**：高频查询字段冗余为显式列，复杂对象存 JSONB
- **`captured_at` vs `created_at`**：前者客户端本地时间用于业务，后者服务端 UTC 仅审计
- **VARCHAR 优于 enum**：`status`、`plan_type` 等使用 VARCHAR，支持扩展无需 migration
- **Tag value 模型**：`raw_assets.tags TEXT[]` 存字符串快照，`user_tag_library` 仅服务 Picker
- **业务状态显式落库**：`subscription_status` 五态由 webhook handler 写入，不在运行时派生
- **软删除 + Prisma middleware**：`users.deleted_at` 软删除，middleware 全局注入 `WHERE deleted_at IS NULL`，防止 AI 生成的代码漏掉过滤条件
- **水印状态固化**：`stories.document.watermark.enabled` 生成时写入，永不动态修改（R-02）
- **`month_key` 格式**：`"2026-03"`，对应用户本地时区月份，非 UTC

### 用户注册初始化（Supabase Auth trigger）

Supabase Auth 和业务 DB 在同一个 PostgreSQL 实例，通过 trigger 原子创建业务行，无双写风险：

```sql
-- packages/db/prisma/migrations/xxx_create_user_trigger.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建业务用户行（timezone 默认 UTC，客户端首次启动时更新）
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  -- 同步创建订阅行（初始状态 never_paid，story_quota = 2）
  INSERT INTO public.subscriptions (user_id, subscription_status)
  VALUES (NEW.id, 'never_paid');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER：函数以 owner 权限执行，允许跨 schema（auth → public）写入

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**trigger 失败 → auth user 创建整体回滚，不产生孤儿账号。**

客户端注册成功后（Supabase `signUp` 返回），立即调用 `PATCH /users/me { timezone }` 写入本地时区，这是 Story 生成调度的关键字段。

### Prisma Soft-Delete Middleware

所有业务查询自动过滤已删除账号，无需每个 query 手写：

```typescript
// packages/db/src/middleware/softDelete.ts
prisma.$use(async (params, next) => {
  const modelsWithSoftDelete = ['User']
  if (modelsWithSoftDelete.includes(params.model ?? '')) {
    if (params.action === 'findFirst' || params.action === 'findMany') {
      params.args.where = {
        ...params.args.where,
        deleted_at: null,
      }
    }
    // findUnique 降级为 findFirst 以支持 where 注入
    if (params.action === 'findUnique') {
      params.action = 'findFirst'
      params.args.where = { ...params.args.where, deleted_at: null }
    }
  }
  return next(params)
})
```

**例外**：auth middleware 本身校验 `locked_at` 时需要绕过此 middleware（用 `prisma.$queryRaw` 或单独的 admin client）。

---

## 6. 视觉主题系统

主题**生成时固化**，历史 story 打开时样式永不变动。

```typescript
function resolveTheme(monthKey: string, childAgeMonths: number): ThemeAssignment {
  const month = monthKey.slice(5, 7)
  const holidays: Record<string, string> = {
    "12": "christmas", "10": "halloween", "02": "valentine", "01": "newyear"
  }
  if (holidays[month]) return buildTheme(holidays[month], childAgeMonths)
  const seasons: Record<string, string> = {
    "03": "spring", "04": "spring", "05": "spring",
    "06": "summer", "07": "summer", "08": "summer",
    "09": "autumn", "10": "autumn", "11": "autumn",
    "12": "winter", "01": "winter", "02": "winter"
  }
  const ageStage =
    childAgeMonths < 3  ? "newborn"  :
    childAgeMonths < 12 ? "infant"   :
    childAgeMonths < 24 ? "toddler"  : "preschool"
  return buildTheme(`${seasons[month]}_${ageStage}`, childAgeMonths)
}
```

---

## 7. 订阅与付费转化

### 订阅方案对比

| 功能 | Free | Premium |
|---|---|---|
| 上传素材 | 不限量（R-07） | 不限量 |
| Story 生成 | 2 份配额（R-01） | 持续生成 |
| Story 水印 | 有，生成时固化（R-02） | 无，生成时固化 |
| Story 访问 | 所有已生成均可读（R-03） | 同左 |
| Highlights | 最多 10 个（R-04） | 不限量 |
| 孩子档案 | 1 个活跃（R-05） | 不限量 |
| 特色功能 | 无（R-06） | Birthday Celebration Push 等 |
| Memory 编辑 | 当月可编辑（R-08） | 同左 |

### 权限拦截位置总览（SubscriptionRules 第四章）

| 规则 | 前端拦截 | 后端拦截 | 说明 |
|---|---|---|---|
| R-01 Story 生成 | — | ✅ 生成任务判断 | 纯后端，前端只展示结果 |
| R-02 水印 | — | ✅ 生成时写入固化 | 永久锁定，不动态计算 |
| R-03 Story 访问 | — | — | 无需校验，所有已生成均开放 |
| R-04 Highlights | ✅ Toggle 点击时预检 | ✅ Save 时兜底 + Remove 接口 | 双重校验 |
| R-05 档案切换 | ✅ Profile Switcher 三变体（Free / Premium / Ended）；Ended 非活跃档案视觉同 Free 但可点击 | ✅ 切换接口仅对 `never_paid` 返回 403；`Ended` 放行（创建不拦截） | 后端只拦截 Never Paid 切换，Ended 切换不拦 |
| R-06 特色功能 | — | ✅ 事件触发时校验 | 静默处理，Free 无感知 |
| R-07 Memory 上传 | ✅ 单条约束（10张/10MB/格式） | ✅ 文件校验 | 非权限规则，技术约束 |
| R-08 Memory 编辑 | ✅ UI 隐藏 Edit 入口 | ✅ 写入时校验月份 | 以 captured_at 判断当月 |
| R-09 Onboarding | ✅ inline 提示 | — | 后端全程不拦截 Onboarding 创建 |
| R-10 降级常驻 Notify | ✅ 读 `subscription_status` 渲染 Notify（无需后端额外字段） | — | 纯前端渲染条件；Toast 方案已废弃 |
| R-11 Free Trial | ✅ CTA 动态文案 | — | 依赖平台 SDK，后端不介入 |
| Paywall A | ✅ 返回时检查标记 | — | is_last_free_story 后端写，前端读 |
| Paywall B | ✅ Toggle 时检查 | ✅ Save 时兜底 | 同 R-04 |
| Paywall C | ✅ 锁定卡片点击 | — | 前端根据 story_quota 展示 |
| Paywall D | ✅ 入口点击时检查 | ✅ 切换时兜底 | 同 R-05 |

### RevenueCat Webhook Handler

#### Event → subscription_status 映射

| RevenueCat event_type | 新 subscription_status | 说明 |
|---|---|---|
| `INITIAL_PURCHASE` | `premium_active` | 首次付费订阅激活 |
| `TRIAL_STARTED` | `trial_active` | Free Trial 开始 |
| `TRIAL_CONVERTED` | `premium_active` | Trial 转付费 |
| `RENEWAL` | `premium_active` | 续费成功 |
| `CANCELLATION` | 不变（保持当前状态） | 取消续订，但当前周期仍有效，**不降级**；等 EXPIRATION 事件才降级 |
| `EXPIRATION` | `trial_ended` 或 `premium_ended` | 订阅/Trial 真正到期；根据 `plan_type` 区分 `trial_ended` / `premium_ended` |
| `BILLING_ISSUE` | 不变 | 扣款失败，保持当前状态，等待平台重试或 EXPIRATION |
| `UNCANCELLATION` | 不变 | 用户撤回取消，状态未变，无需更新 |
| `TRANSFER` | `premium_active` | 订阅在设备间迁移，仍有效 |

> **关键规则**：CANCELLATION ≠ 立即降级。用户取消续订后仍有当前订阅周期的访问权，`subscription_status` 维持 `premium_active` / `trial_active` 不动，直到 EXPIRATION 事件到来才更新为 `*_ended`。

#### Webhook 处理伪代码

```typescript
// apps/nestory-api/src/routes/subscriptions/webhook.ts
async function handleRevenueCatWebhook(payload: RevenueCatEvent) {
  const { id: eventId, event_type, app_user_id, event_timestamp_ms, plan_type } = payload

  // 1. 幂等去重：同一 event 只处理一次
  const existing = await prisma.$queryRaw<{ last_event_id: string }[]>`
    SELECT last_event_id FROM subscriptions WHERE user_id = ${app_user_id} FOR UPDATE
  `
  // FOR UPDATE：行级锁，防止并发 webhook 同时修改同一行

  if (!existing.length) return  // 用户不存在，忽略

  const { last_event_id, last_event_at } = existing[0]

  if (last_event_id === eventId) {
    return  // 重复投递，直接返回 200，不重复处理
  }

  // 2. 乱序保护：旧事件直接丢弃
  const eventOccurredAt = new Date(event_timestamp_ms)  // RevenueCat 事件发生时间
  if (last_event_at && eventOccurredAt <= last_event_at) {
    return  // 这条事件比已处理的更旧，丢弃，不覆盖更新的状态
  }

  // 3. 计算新 subscription_status
  const newStatus = resolveStatus(event_type, plan_type)
  if (newStatus === null) {
    // CANCELLATION / BILLING_ISSUE / UNCANCELLATION：不修改 subscription_status
    // 只更新 last_event_at / last_event_id，避免后续更新的事件被误判为旧事件
    await prisma.$executeRaw`
      UPDATE subscriptions
      SET last_event_at = ${eventOccurredAt},
          last_event_id = ${eventId},
          updated_at    = now()
      WHERE user_id = ${app_user_id}
    `
    return
  }

  // 4. 写入新状态
  await prisma.$executeRaw`
    UPDATE subscriptions
    SET subscription_status = ${newStatus},
        plan_type           = ${plan_type},
        expires_at          = ${payload.expiration_at_ms ? new Date(payload.expiration_at_ms) : null},
        last_event_at       = ${eventOccurredAt},
        last_event_id       = ${eventId},
        updated_at          = now()
    WHERE user_id = ${app_user_id}
  `

  // 5. 降级后处理（仅 *_ended）
  if (newStatus === 'trial_ended' || newStatus === 'premium_ended') {
    await prisma.$executeRaw`
      UPDATE subscriptions SET story_quota = 0 WHERE user_id = ${app_user_id}
    `
    // story_quota 归零不重置（R-01）
  }
}

function resolveStatus(eventType: string, planType: string): string | null {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'TRIAL_CONVERTED':
    case 'RENEWAL':
    case 'TRANSFER':
      return 'premium_active'
    case 'TRIAL_STARTED':
      return 'trial_active'
    case 'EXPIRATION':
      return planType === 'trial' ? 'trial_ended' : 'premium_ended'
    case 'CANCELLATION':
    case 'BILLING_ISSUE':
    case 'UNCANCELLATION':
      return null  // 不修改 subscription_status
    default:
      return null
  }
}
```

**并发安全**：`FOR UPDATE` 保证同一时刻只有一个 webhook 在处理同一用户的订阅行，整个事务结束后锁释放，下一个 webhook 才读取最新的 `last_event_at` 做乱序判断。

### 降级处理规则

- 已生成 Story 水印状态永久不变（`watermark.enabled` 生成时固化）
- `story_quota` 归零，不重置
- 超出 10 个的 Highlights 保留展示，但无法新增
- 超出 1 个的档案保留数据，**切换放行**（`Ended` 用户可正常切换，UI 层通过 Profile Switcher Ended 变体 + Notify Type=Info 引导 Renew，后端不拦截）

### R-05 后端校验边界

```
切换档案（PATCH /children/active）
  → 检查 subscription_status
  → never_paid → 403 + PROFILE_SWITCH_RESTRICTED
  → trial_active / premium_active / trial_ended / premium_ended → 允许切换

创建档案（POST /children）
  → 不做身份校验，所有订阅状态均可创建多个
```

### R-10 降级常驻 Notify

Toast 方案已废弃（SubscriptionRules v1.3），改为常驻 Notify，后端无需任何额外标记。

```
前端渲染条件：
  subscription_status in (trial_ended, premium_ended)
    → S-01 / HL-01 / ST-03a 顶部渲染 Notify Type=Warning（带挽回 CTA）
    → Profile Switcher Ended 顶部渲染 Notify Type=Info（无 CTA，CTA 在 sheet 底部按钮）
    → 文案中 {kind} 运行时替换：trial_ended → "Trial"，premium_ended → "Premium"
  subscription_status 变回 premium_active / trial_active
    → Notify 自动消失
```

`has_seen_downgrade_toast` 字段已从 `users` 表移除；`GET /subscriptions/me` 不再返回 `downgrade_toast` 标记。

### R-11 Free Trial CTA 动态文案

```typescript
// PaywallModal.tsx — 后端不介入，完全依赖平台 SDK
const hasFreeTrial = await RevenueCat.checkTrialEligibility()
const ctaText = hasFreeTrial ? "Start Free Trial" : "Subscribe Now"
```

### Contextual Paywall（参数化引擎）

```typescript
type PaywallTrigger = "A" | "B" | "C" | "D"
<PaywallModal trigger="A" onClose={...} onUpgrade={...} />
```

| 触发点 | 条件 | 频率 | 利益点顺序 |
|---|---|---|---|
| A | is_last_free_story + Free + 从 S-02 返回 | 同一 Story 周期仅一次，延迟 0.5–1s | 持续生成 → 无水印 → 无限 Highlights → Extra |
| B | Highlight count ≥ 10 + Toggle 点击 | 每次点击均触发 | 无限 Highlights → 持续生成 → 无水印 → Extra |
| C | story_quota = 0 + 点击锁定卡片 | 每次点击均触发 | 持续生成 → 无水印 → 无限 Highlights → Extra |
| D | 点击切换/添加档案 Upgrade CTA | 每次点击均触发 | 无限档案 → 持续生成 → 无限 Highlights → 无水印 |

**订阅状态必须以后端为准**，前端有同步刷新机制。

---

## 8. 开发路线图

### Sprint 1 — 核心闭环

- [ ] Prisma schema + TypeScript 类型定义（含 timezone、subscription_status 五态、user_tag_library、audit_log）
- [ ] 素材上传（照片 + 文字 + Tag）
- [ ] 时区感知 Story 调度器（hourly cron）
- [ ] Planner 规则引擎（三档）
- [ ] Story 生成（接入 OpenAI，整篇 JSON 输出）
- [ ] Story 状态机（五种状态枚举）
- [ ] 来源感知路由（H-02 / H-04）
- [ ] 基础 H5 renderer（单一主题，含 FooterBrandBlock）
- [ ] App WebView 接入
- [ ] 基础 Open Graph meta
- [ ] **Story 样本写作（与 Sprint 1 并行，不得推迟）**

### Sprint 2 — 产品差异化

- [ ] 视觉主题系统（3–4 套主题）
- [ ] Highlights 功能（count 限制 + Remove 操作 + 双重校验）
- [ ] 水印系统（渲染层控制，生成时固化）
- [ ] Open Graph 完整配置
- [ ] story_shares 表 + token 访问控制
- [ ] Memory List 时间线（H-03，时区感知月份分组）
- [ ] Story 生成完成推送通知
- [ ] R-05 档案切换后端校验（切换接口 403）
- [ ] 降级常驻 Notify 组件（S-01 / HL-01 / ST-03a Type=Warning；Profile Switcher Ended Type=Info；{kind} 运行时替换）

### Sprint 3 — 商业化

- [ ] Paywall A + B + C + D（参数化组件 + R-11 Trial CTA 动态文案）
- [ ] RevenueCat 接入（订阅状态后端同步）
- [ ] 配额模型完整实现（quota 消耗、降级归零）
- [ ] Failure mode 完整处理
- [ ] 埋点体系（见 §10）

---

## 9. 开工前必须完成的非工程任务

**Story 样本写作已前移至 Sprint 1 并行，不得推迟。**

| 类型 | 数量 | 用途 |
|---|---|---|
| 正样本 | 12–15 篇 | 建立语气、风格、具体性的审美锚点 |
| 反样本 | 8–10 篇 | 明确绝对不能产出的内容 |
| Writing Rubric | 1 份文档 | 判断标准文字化，可持续调优 |

覆盖：三档质量、多月龄、有/无里程碑月份、照片多文字少、照片少文字详细。

Writing Rubric 必须回答：情感温度来自哪里、什么让一句话"像父母写的"、low-input 补全边界、结尾的感觉、永久禁用词列表。

---

## 10. 埋点事件清单

埋点 schema 在 Sprint 1 设计，不在 Sprint 3 补。

### Story 生成链路

| 事件 | 关键属性 |
|---|---|
| `story_generation_started` | story_id, user_id, quality_level |
| `story_generation_completed` | story_id, duration_ms, prompt_version |
| `story_generation_failed` | story_id, failed_reason, retries |
| `story_generation_fallback` | story_id |

### 付费转化链路

| 事件 | 关键属性 |
|---|---|
| `paywall_shown` | trigger: A/B/C/D, user_id |
| `paywall_dismissed` | trigger, time_on_paywall_ms |
| `paywall_converted` | trigger, plan_type |
| `story_locked_state_viewed` | user_id |
| `highlight_limit_hit` | user_id |

### 分享与获客

| 事件 | 关键属性 |
|---|---|
| `story_share_created` | story_id, user_id |
| `share_link_opened` | story_id, referrer |
| `footer_appstore_clicked` | story_id, source: app/public |
| `footer_googleplay_clicked` | story_id, source: app/public |

### 用户状态链路（v1.2 新增）

| 事件 | 触发时机 | 关键属性 |
|---|---|---|
| `downgrade_toast_shown` | 降级后首次打开 App | user_id |
| `profile_switch_blocked` | Free 用户尝试切换档案被拦截 | user_id |
| `highlight_removed` | HL-02 执行 Remove Highlight | user_id, asset_id |

---

## 11. 关键设计决策日志

| 决策点 | 最终选择 | 被否决的选项 | 理由 |
|---|---|---|---|
| 开发语言 | 全栈 TypeScript | Python Worker | 无本地模型需求 |
| 后端框架 | Fastify | NestJS | 样板开销对小团队不合理 |
| 生成策略 | 整篇一次生成 | 分段生成 | 分段破坏叙事连贯性 |
| Hallucination 控制 | Planner + prompt 先验约束 | 事后 validator 纠错 | Validator 只能删，不能修 |
| highlight_moment | 从候选选择 | LLM 自由生成 | 事实内容必须选择 |
| shareToken 位置 | story_shares 独立表 | 放入 StoryDocument | 生命周期不同 |
| sourceAnchors 位置 | generation_meta.anchorAudit | StoryDocument 顶层 | 仅用于审计 |
| Theme 解析时机 | 生成时固化 | 实时计算 | 历史 story 视觉必须一致 |
| generatedFrom 字段 | DB 存 VARCHAR | DB enum | 支持未来扩展，无需 migration |
| qualityLevel 阈值 | 软边界（综合文字丰富度） | 硬性素材数量 | 详细备注比大量无说明照片更 rich |
| Story 生成调度 | hourly 时区感知 cron | 全局 UTC 月末 cron | 用户遍布全球时区 |
| Tag 数据模型 | `raw_assets.tags TEXT[]` value 模型 + `user_tag_library` 表 | 独立关联表（reference 模型） | PRD v1.7 §4.1.1 要求字符串快照（orphan chip 语义）；MVP 无跨 Memory tag 查询，reference 模型带来复杂度无收益；见数据库设计 v1.4 |
| captured_at vs created_at | captured_at 用于业务逻辑 | created_at | 月份归档必须按用户上传时间 |
| 水印状态固化 | 生成时写入 StoryDocument | 渲染时动态读取 | 降级后历史 story 水印永久不变（R-02） |
| Paywall 设计 | 参数化组件 | 四个独立弹窗 | 便于维护和 A/B 测试 |
| R-05 后端边界 | 只拦截切换，不拦截创建 | 创建也拦截 | SubscriptionRules 明确后端不限制创建 |
| R-10 降级通知 | 前端常驻 Notify（读 `subscription_status`） | DB 字段 `has_seen_downgrade_toast` + 一次性 Toast | Toast 方案废弃；`subscription_status` 已包含所有判断信息，无需额外 DB 存储 |
| R-11 Trial 资格 | 前端读平台 SDK | 后端维护状态 | 平台管理资格，Nestory 后端不介入 |
| 数据分层存储（云同步） | Path B：所有用户统一写后端，Never Paid 不提供跨设备同步 UI | Path A：Never Paid 严格 device-only，升级时 bulk upload | MVP 工程成本不值得；Never Paid 换设备后数据仍在云端属意外惊喜而非问题；PRD §4.6 "device-only" 的意图是 UX 区分，非架构约束 |
| RevenueCat webhook 乱序 | `last_event_at`（事件时间戳）+ `last_event_id`（幂等 key）+ `FOR UPDATE` 行锁；last-write-wins，旧事件丢弃 | 按 delivery 顺序直接写 | RevenueCat 不保证投递顺序；`event_timestamp_ms` 是事件在 RC 侧的发生时间（与投递无关），是唯一可靠的排序信号；CANCELLATION 不降级，只有 EXPIRATION 才触发状态变更 |
| Story 生成完成通知 | Supabase Realtime（postgres_changes 订阅） | 前端轮询 | 轮询有两个根本缺陷：①用户已在屏幕时无法感知调度器新插入的 pending 行；②job 卡住时无退出条件。Supabase Realtime 已含于现有基础设施（supabase-js 已引入），无新依赖，前端订阅 ~15 行 |
| BullMQ job 去重 | `ON CONFLICT DO NOTHING`（调度器）+ jobId（BullMQ）+ 原子抢占（Worker）| Scheduler 过滤 status + 独立 retry cron | DB 行是单一事实源：调度器无需理解 status 含义，ON CONFLICT 静默忽略已有行；Worker 原子抢占防并发；BullMQ `attempts: 3 + backoff` 替代 retry cron，零额外代码 |

---

*本文档反映经系统性技术评审后确定的设计决策。后续变更需基于此基线提供充分理由。*
*PRD 依据：v1.7 + PageStructure v1.6 + SubscriptionRules v1.3（2026-04-26）*
