# Nestory — 项目目录结构

**版本：** v1.0
**日期：** 2026-04-04
**依赖文档：** 技术架构文档 v1.1

---

## 总览：Monorepo 结构

Nestory 采用 **monorepo**，三个工程单元统一管理，共享 TypeScript 类型定义和工具函数。

```
nestory/
├── apps/
│   ├── mobile/          # React Native + Expo（移动端 App）
│   ├── web/             # Next.js（H5 渲染 + 分享页）
│   └── api/             # Fastify + BullMQ（后端 API + 任务队列）
├── packages/
│   ├── types/           # 共享 TypeScript 类型（StoryDocument、SectionPlan 等）
│   ├── utils/           # 共享工具函数（时区计算、月份边界等）
│   └── config/          # 共享配置（ESLint、TypeScript base config 等）
├── package.json         # 根 package.json（pnpm workspaces）
├── pnpm-workspace.yaml
└── turbo.json           # Turborepo 构建编排
```

**选择 monorepo 的理由：**
- `packages/types` 在三个 app 之间共享，`StoryDocument`、`SectionPlan` 等类型只维护一份
- `packages/utils` 共享时区计算逻辑，前后端行为一致
- 类型变更时，三个 app 同步更新，不会出现前后端类型不一致的问题

---

## packages/types — 共享类型定义

```
packages/types/
├── src/
│   ├── story.ts             # StoryDocument、StorySection、StoryStatus
│   ├── generation.ts        # StoryGenerationMeta、SectionPlan、NarrativeBrief
│   ├── asset.ts             # RawAsset、CandidateMomentGroup
│   ├── subscription.ts      # SubscriptionPlan、PaywallTrigger
│   ├── enums.ts             # SectionIntent、SectionOutputType、StoryListItemState
│   └── index.ts             # 统一导出
└── package.json
```

> 这是整个系统的**内容合同**。所有跨服务的数据结构从这里导入，不允许各 app 自定义同名类型。

---

## packages/utils — 共享工具函数

```
packages/utils/
├── src/
│   ├── timezone.ts          # 时区边界计算（月份起止、可编辑窗口判断）
│   ├── monthKey.ts          # monthKey 生成与解析（"2026-03"）
│   ├── storyState.ts        # StoryListItemState 判断逻辑（前后端共享）
│   └── index.ts
└── package.json
```

---

## apps/api — 后端服务

```
apps/api/
├── src/
│   ├── index.ts                     # 服务入口，注册插件和路由
│   │
│   ├── routes/                      # HTTP 路由层（薄层，只做参数校验和调用 service）
│   │   ├── assets.ts                # POST /assets（上传素材）
│   │   ├── stories.ts               # GET /stories、GET /stories/:id
│   │   ├── highlights.ts            # POST/GET/DELETE /highlights
│   │   ├── children.ts              # POST/GET/PATCH /children
│   │   ├── subscriptions.ts         # GET /subscriptions、POST /subscriptions/sync
│   │   └── shares.ts                # POST /shares（生成 share token）
│   │
│   ├── services/                    # 业务逻辑层
│   │   ├── asset.service.ts         # 素材上传、EXIF 解析、ai_description 异步触发
│   │   ├── story.service.ts         # Story 查询、状态更新
│   │   ├── highlight.service.ts     # Highlight CRUD、count 校验
│   │   ├── subscription.service.ts  # 配额查询、RevenueCat 状态同步
│   │   └── share.service.ts         # Share token 生成、校验、撤销
│   │
│   ├── jobs/                        # BullMQ 任务定义
│   │   ├── queues.ts                # 队列实例（story-generation、asset-description）
│   │   ├── workers/
│   │   │   ├── story-generation.worker.ts   # Story 生成完整 pipeline
│   │   │   └── asset-description.worker.ts  # 素材 AI 描述（上传后异步）
│   │   └── scheduler/
│   │       └── story-scheduler.ts   # Hourly cron：时区感知触发生成任务
│   │
│   ├── pipeline/                    # AI Story 生成 Pipeline（核心）
│   │   ├── planner/
│   │   │   ├── index.ts             # Planner 入口
│   │   │   ├── quality-scorer.ts    # qualityScore 计算（连续值 0-1）
│   │   │   ├── section-mapper.ts    # qualityLevel → SectionPlan[]
│   │   │   └── moment-groups.ts     # candidateMomentGroups 识别
│   │   ├── brief/
│   │   │   ├── index.ts             # NarrativeBrief 入口
│   │   │   ├── rule-generator.ts    # 规则生成部分（sectionIntents、callback 等）
│   │   │   └── llm-generator.ts     # 小 LLM 调用（themePhrase、selectedMomentGroupId）
│   │   ├── generator/
│   │   │   ├── index.ts             # 主 LLM 生成入口
│   │   │   ├── prompt-builder.ts    # 组装完整 prompt（plan + brief + assets + few-shot）
│   │   │   └── few-shot/
│   │   │       ├── positive/        # 正样本（12-15 篇，按 low/medium/rich 分档）
│   │   │       │   ├── low/
│   │   │       │   ├── medium/
│   │   │       │   └── rich/
│   │   │       ├── negative/        # 反样本（8-10 篇）
│   │   │       └── rubric.md        # Writing Rubric
│   │   ├── validator/
│   │   │   └── index.ts             # 轻校验（schema + anchor + 字数）
│   │   └── theme/
│   │       └── resolver.ts          # resolveTheme（节日 > 季节 > 月龄）
│   │
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 数据库 schema（source of truth）
│   │   │   └── migrations/          # Prisma migration 文件
│   │   └── client.ts                # Prisma client 单例
│   │
│   ├── lib/
│   │   ├── openai.ts                # OpenAI client 初始化
│   │   ├── supabase.ts              # Supabase storage client
│   │   └── revenuecat.ts            # RevenueCat webhook 处理
│   │
│   └── config/
│       └── env.ts                   # 环境变量校验（zod）
│
├── prisma/                          # Prisma schema 软链接（指向 src/db/prisma）
├── package.json
└── tsconfig.json
```

### pipeline/ 目录说明

这是后端最核心的目录，对应架构文档中的 AI Pipeline 五个阶段：

```
pipeline/
  planner/      → [1] Planner（规则引擎）
  brief/        → [2] Narrative Brief（规则 + 小 LLM）
  generator/    → [3] 主 LLM 生成
  validator/    → [4] Validator（轻校验）
  theme/        → 视觉主题解析（生成时固化）
```

`few-shot/` 目录存放 Writing Rubric 和所有正/反样本，是 prompt 工程的核心资产，与代码一起进版本控制。

---

## apps/web — H5 渲染层

```
apps/web/
├── app/                             # Next.js App Router
│   ├── story/
│   │   └── [id]/
│   │       └── page.tsx             # App 内 WebView 加载（需 auth token）
│   ├── share/
│   │   └── [token]/
│   │       ├── page.tsx             # 外部分享页（Public）
│   │       └── opengraph-image.tsx  # OG 图片动态生成
│   └── layout.tsx
│
├── components/
│   ├── renderer/                    # StoryRenderer 核心组件
│   │   ├── StoryRenderer.tsx        # 主渲染组件（接收 StoryDocument）
│   │   ├── FooterBrandBlock.tsx     # 品牌标识 + 下载链接（两端均渲染）
│   │   └── sections/               # 各 section 类型的渲染组件
│   │       ├── CoverSection.tsx
│   │       ├── SummarySection.tsx
│   │       ├── NarrativeSection.tsx
│   │       ├── PhotoGroupSection.tsx
│   │       ├── AgeContextSection.tsx
│   │       ├── ReflectionSection.tsx
│   │       ├── ClosingCallbackSection.tsx
│   │       ├── LowInputHintSection.tsx
│   │       └── MilestoneSection.tsx
│   │
│   ├── shells/                      # Runtime Shell（处理运行时差异）
│   │   ├── AppStoryShell.tsx        # App 内：注入 token、埋点、原生桥接
│   │   └── PublicShareShell.tsx     # 外部：校验 token、访问控制
│   │
│   └── themes/                      # 视觉主题系统
│       ├── tokens/                  # Design tokens（CSS variables）
│       │   ├── winter_infant.css
│       │   ├── spring_toddler.css
│       │   ├── christmas.css
│       │   └── ...
│       └── ThemeProvider.tsx        # 根据 themeId 注入对应 token
│
├── lib/
│   ├── api.ts                       # 调用 Fastify API 的客户端函数
│   └── auth.ts                      # Token 解析（App 内 WebView 场景）
│
├── public/
│   └── brand/                       # Nestory logo、下载徽章图片
│
├── package.json
└── next.config.ts
```

### renderer/ 与 shells/ 的关系

```
App 内 WebView：
  AppStoryShell
    └── StoryRenderer（含 FooterBrandBlock）

外部分享页：
  PublicShareShell
    └── StoryRenderer（含 FooterBrandBlock）
```

`StoryRenderer` 只接收 `StoryDocument`，不感知运行环境。Shell 负责获取数据和处理运行时差异。

---

## apps/mobile — 移动端 App

```
apps/mobile/
├── app/                             # Expo Router（文件系统路由）
│   ├── (tabs)/
│   │   ├── index.tsx                # H-01 Home
│   │   ├── stories.tsx              # S-01 Stories List
│   │   └── highlights.tsx           # HL-01 Highlights Gallery
│   ├── memory/
│   │   ├── add.tsx                  # H-02 Add Memory（接收 source 参数）
│   │   ├── list.tsx                 # H-03 Memory List
│   │   └── [id].tsx                 # H-04 Memory Detail
│   ├── story/
│   │   └── [id].tsx                 # S-02 Story Detail（WebView 容器）
│   ├── highlight/
│   │   └── [id].tsx                 # HL-02 Highlight Detail
│   ├── settings/
│   │   ├── index.tsx                # ST-01 Settings
│   │   ├── subscription.tsx         # ST-02 Subscription Management
│   │   ├── profiles.tsx             # ST-03a Child Profile List
│   │   ├── profile/[id].tsx         # ST-03 Child Profile Edit
│   │   ├── privacy.tsx              # ST-04 Data & Privacy
│   │   ├── about.tsx                # ST-05 About
│   │   └── feedback.tsx             # ST-06 Feedback
│   └── onboarding/
│       ├── welcome.tsx              # O-01 Welcome
│       ├── auth.tsx                 # O-02 Sign In / Sign Up
│       ├── profile.tsx              # O-03 Create Child Profile
│       ├── permissions.tsx          # O-04 Permissions
│       └── plan.tsx                 # O-05 Plan Introduction
│
├── components/
│   ├── paywall/
│   │   └── PaywallModal.tsx         # P-01 Contextual Paywall（参数化，接收 trigger）
│   ├── story/
│   │   ├── StoryCard.tsx            # S-01 历史 Story 卡片
│   │   └── CurrentMonthCard.tsx     # S-01 当月状态卡片（五种状态）
│   ├── memory/
│   │   ├── TagSelector.tsx          # Tag 多选组件（8 个固定 tag）
│   │   └── HighlightToggle.tsx      # Highlight 标记 Toggle + 描述输入框
│   └── common/
│       ├── ChildProfileSelector.tsx # 孩子档案切换 Bottom Sheet
│       └── ProgressBar.tsx          # Onboarding 进度条
│
├── hooks/
│   ├── useSubscription.ts           # 订阅状态（以后端为准，含刷新机制）
│   ├── useStoryListState.ts         # StoryListItemState 计算
│   └── useSourceNavigation.ts       # 来源感知路由（source 参数管理）
│
├── lib/
│   ├── api.ts                       # Fastify API 调用
│   ├── revenuecat.ts                # RevenueCat SDK 初始化
│   └── analytics.ts                 # 埋点事件发送（见架构文档 §10）
│
├── constants/
│   └── tags.ts                      # 8 个固定 Tag 的展示配置（从后端同步）
│
├── app.json                         # Expo 配置
├── package.json
└── tsconfig.json
```

### 路由设计说明

`memory/add.tsx` 接收 `source` 参数，决定 Save 后的返回目标：

```typescript
// 导航时传入来源
router.push('/memory/add', { source: 'home' | 'memory-list' | 'stories-list' })

// Save 后根据 source 返回
const returnTarget = {
  'home':          '/memory/list',
  'memory-list':   '/memory/list',
  'stories-list':  '/(tabs)/stories',
}
```

`PaywallModal` 接收 `trigger` 参数，决定利益点排序和标题文案：

```typescript
<PaywallModal
  trigger="A"           // "A" | "B" | "C" | "D"
  onClose={() => {}}
  onUpgrade={() => {}}
/>
```

---

## 数据流向总览

```
用户操作（Mobile App）
  ↓ REST API
Fastify API
  ↓ 素材上传
Supabase Storage（照片文件）
  ↓
raw_assets 入库（captured_at = 用户本地时间）
  ↓ 异步
asset-description worker（AI 生成 ai_description）

---

Hourly Scheduler（时区感知）
  ↓ 检测到用户本地时区进入次月 1 日
story-generation worker
  ↓
pipeline/planner → pipeline/brief → pipeline/generator → pipeline/validator
  ↓
StoryDocument 生成（watermark 状态在此固化）
  ↓
stories 表入库（document JSONB + 显式列）
  ↓ 推送通知
用户收到："Your March Story is ready!"

---

用户点击查看 Story（Mobile App）
  ↓
S-02 Story Detail → WebView 加载
  ↓ URL: https://web.nestory.app/story/{id}?token={authToken}
Next.js AppStoryShell
  ↓
StoryRenderer（从 API 获取 StoryDocument）
  ↓
sections[] 按序渲染 + FooterBrandBlock

---

用户点击分享（Mobile App）
  ↓ POST /shares
Fastify 生成 shareToken → story_shares 入库
  ↓ 返回分享链接
https://nestory.app/share/{token}
  ↓ 社交平台抓取
Next.js PublicShareShell → generateMetadata() → OG meta 输出
  ↓ 用户点开链接
StoryRenderer（从 API 获取公开 StoryDocument）+ FooterBrandBlock（含下载链接）
```

---

## 环境变量

```bash
# apps/api/.env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
REVENUECAT_WEBHOOK_SECRET=...

# apps/web/.env
NEXT_PUBLIC_API_URL=https://api.nestory.app
NESTORY_API_INTERNAL_KEY=...    # web → api 内部调用鉴权

# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://api.nestory.app
EXPO_PUBLIC_WEB_URL=https://nestory.app
REVENUECAT_API_KEY_IOS=...
REVENUECAT_API_KEY_ANDROID=...
```

---

## 开发启动

```bash
# 安装依赖（根目录）
pnpm install

# 启动所有服务
pnpm dev

# 单独启动
pnpm --filter @nestory/api dev       # Fastify API（Railway）
pnpm --filter @nestory/web dev       # Next.js H5（Vercel）
pnpm --filter @nestory/mobile start  # Expo App

# 数据库操作
pnpm --filter @nestory/api db:migrate    # 运行 migration
pnpm --filter @nestory/api db:studio     # 打开 Prisma Studio
pnpm --filter @nestory/api db:seed       # 写入初始 tags 数据

# 类型检查（全量）
pnpm typecheck
```

---

## 目录命名约定

| 约定 | 说明 |
|---|---|
| `services/` | 业务逻辑，不含 HTTP 层细节 |
| `routes/` | HTTP 路由，只做参数校验，调 service |
| `jobs/workers/` | BullMQ Worker，处理异步任务 |
| `jobs/scheduler/` | 定时任务（hourly cron） |
| `pipeline/` | AI 生成流水线，各阶段独立目录 |
| `lib/` | 第三方 SDK 初始化和封装 |
| `components/renderer/` | StoryRenderer 核心，不含业务逻辑 |
| `components/shells/` | Runtime Shell，处理运行时差异 |
| `hooks/` | React hooks，封装状态和副作用 |
| `few-shot/` | Prompt 工程资产（样本 + rubric），进版本控制 |
