# Nestory — 项目目录结构（Monorepo 底座版）

**版本：** v2.0
**日期：** 2026-04-25
**上一版本：** v1.1（2026-04-12，单产品结构，已 deprecated）
**依赖文档：** 技术架构 v1.3 · ARCH-DECISIONS-20260425 · 数据库设计 v1.4

### v2.0 变更记录

- **核心结构升级**：从单产品 `nestory/apps/{mobile,web,api}` 升级为可复用产品底座 `base/apps/* + base/packages/{core,ai-pipeline,media,push,ui,db,config,types}`，对应 ARCH-DECISIONS-20260425 §2/§3。
- **packages 切分**：把订阅状态机、AI Pipeline、媒体上传、推送、UI、DB、Token 系统拆为独立包。下一个产品（如 petory）通过新增 `apps/petory-*` + `packages/config/petory.ts` 即可复用。
- **保留 Supabase**：DB（PostgreSQL）+ Auth + Storage 三合一仍走 Supabase（与 03_1 v1.3 一致），底座不引入第二套 Auth/Storage 抽象。
- **业务配置外提**：权益配额、Paywall 文案、Tag 预设、AI Prompt 模板等放 `packages/config/`，与代码解耦，方便不同产品换皮。

### v1.1（已 deprecated）变更记录

仅做单产品 nestory/ 结构。

---

## 总览：Monorepo 底座结构

```
base/
├── apps/                                # 产品端（每个产品一组）
│   ├── nestory-mobile/                  # React Native + Expo（iOS + Android）
│   ├── nestory-web/                     # Next.js（Story H5 + 分享页，Vercel）
│   └── nestory-api/                     # Fastify + BullMQ（后端 API + 任务队列，Railway）
│
├── packages/                            # 可复用底座（产品无关）
│   ├── core/                            # 订阅状态机、RevenueCat 封装、权限校验
│   ├── ai-pipeline/                     # AI 生成管道（Planner / Brief / Generator / Validator）
│   ├── media/                           # 媒体上传、压缩、CDN、EXIF strip
│   ├── push/                            # 推送调度（时区感知）
│   ├── ui/                              # 通用基础组件 + Token 系统（RN + Web 双端）
│   ├── db/                              # Prisma schema、通用表（users / subscriptions）
│   ├── config/                          # 业务配置（权益、Paywall 文案、Tag、Prompt 模板）
│   │   └── nestory.ts                   # Nestory 的具体配置；下一个产品加 petory.ts
│   └── types/                           # 跨包共享 TypeScript 类型
│
├── tools/                               # 仓库级脚本与工具
│   ├── doc-version-check.ts             # CI 校验文档间版本号一致性
│   └── seed-tags.ts                     # 写入 8 个预置 Tag
│
├── package.json                         # 根 package.json（pnpm workspace）
├── pnpm-workspace.yaml
├── turbo.json                           # Turborepo 任务编排
└── tsconfig.base.json                   # TS 共享 base config
```

**新产品接入**（如 Petory）：

```
base/
├── apps/
│   ├── petory-mobile/                   # 新增
│   ├── petory-web/                      # 新增
│   └── petory-api/                      # 新增
└── packages/
    └── config/
        └── petory.ts                    # 新增配置，底座代码 0 行变更
```

---

## packages 分层判断标准

> **换一个完全不同的产品（宠物记忆、伴侣日记），这段代码还能用吗？**
> - 能 → `packages/`
> - 形状能用但内容要换 → `packages/config/<product>.ts`
> - 完全是 Nestory 业务 → `apps/nestory-*/`

| 层 | 位置 | 内容 |
|---|---|---|
| 底座 | `packages/` | 用户系统、订阅状态机、RevenueCat、媒体上传、AI Pipeline、推送调度、通用组件、Token 系统、Prisma 通用表 |
| 业务配置 | `packages/config/<product>.ts` | 权益配额、Paywall 变体内容、Tag 预设、AI Prompt 模板、推送文案 |
| 产品业务 | `apps/<product>-*/` | 所有页面、Memory / Story / Highlight 数据模型、产品专属逻辑 |

---

## packages/types — 共享类型

```
packages/types/
├── src/
│   ├── subscription.ts        # SubscriptionPlan、PaywallTrigger、PaywallTriggerLog、五态枚举
│   ├── permission.ts          # PermissionRule（R-01 ~ R-11 枚举）
│   ├── story.ts               # StoryDocument、StorySection、StoryStatus（产品特定，但底座通用类型也在此）
│   ├── generation.ts          # SectionPlan、NarrativeBrief、GenerationMeta
│   ├── asset.ts               # RawAsset、AssetFile、CandidateMomentGroup
│   ├── enums.ts               # SectionIntent、SectionOutputType、StoryListItemState
│   └── index.ts
└── package.json
```

> 整个系统的**内容合同**。所有跨服务/跨包的数据结构从这里导入，不允许各 app 自定义同名类型。

---

## packages/core — 订阅状态机 + 权限

```
packages/core/
├── src/
│   ├── subscription/
│   │   ├── state-machine.ts       # 五态状态机（Never Paid / Trial Active / Premium Active / Trial Ended / Premium Ended）
│   │   ├── revenuecat.ts          # RevenueCat 封装（事件订阅、状态同步）
│   │   ├── quota.ts               # story_quota 原子扣减、降级归零
│   │   └── trial.ts               # checkTrialEligibility（R-11）
│   ├── permission/
│   │   ├── rules.ts               # R-01 ~ R-11 规则常量（不含产品特定阈值）
│   │   ├── highlight-limit.ts     # advisory lock + 事务（R-04）
│   │   └── profile-switch.ts      # R-05 切换/创建边界
│   ├── paywall/
│   │   └── router.ts              # Paywall Model X 路由（A/B/C/D 按功能主题）
│   └── index.ts
└── package.json
```

**配置点**：阈值（如 Highlight 上限 10）从 `packages/config/<product>.ts` 注入，core 本身只接受参数。下一个产品可能把上限改成 20，不需要改 core。

---

## packages/ai-pipeline — AI 生成管道

```
packages/ai-pipeline/
├── src/
│   ├── planner/
│   │   ├── index.ts
│   │   ├── quality-scorer.ts      # 通用打分，阈值由 config 注入
│   │   ├── section-mapper.ts      # qualityLevel → SectionPlan[]
│   │   └── moment-groups.ts
│   ├── brief/
│   │   ├── index.ts
│   │   ├── rule-generator.ts
│   │   └── llm-generator.ts       # 小 LLM 调用
│   ├── generator/
│   │   ├── index.ts
│   │   └── prompt-builder.ts      # prompt 模板从 config 读
│   ├── validator/
│   │   └── index.ts
│   ├── theme/
│   │   └── resolver.ts            # 节日/季节/月龄 → themeId
│   └── index.ts
└── package.json
```

> **few-shot 样本和 Writing Rubric** 不进 packages/ai-pipeline，而是放到 `packages/config/nestory/few-shot/`，因为样本与产品语气强绑定。

---

## packages/media — 媒体上传

```
packages/media/
├── src/
│   ├── upload/
│   │   ├── multipart.ts           # multipart 解析、文件流处理
│   │   ├── mime-check.ts          # magic bytes 校验（不信任 Content-Type）
│   │   ├── exif-strip.ts          # 隐私默认 strip GPS
│   │   └── supabase-storage.ts    # Supabase Storage 客户端封装
│   ├── image/
│   │   ├── decode.ts              # 用 sharp 解码出宽高
│   │   └── compress.ts            # 可选压缩（按底座产品需求开关）
│   └── index.ts
└── package.json
```

---

## packages/push — 推送

```
packages/push/
├── src/
│   ├── scheduler/
│   │   └── timezone-aware.ts      # hourly cron，按用户时区触发
│   ├── providers/
│   │   ├── expo-push.ts           # Expo Push Notifications
│   │   └── apns.ts                # 备用：直连 APNs（如脱离 Expo 时）
│   └── index.ts
└── package.json
```

---

## packages/ui — 通用 UI

```
packages/ui/
├── src/
│   ├── tokens/                    # Design Token 解析（从 08-Nestory_DesignTokens.json 加载）
│   │   ├── primitive.ts
│   │   ├── semantic.ts
│   │   └── ThemeProvider.tsx
│   ├── components/                # RN + Web 共享的薄封装（避免每个 app 重写）
│   │   ├── NestoryButton.tsx
│   │   ├── NestoryNotify.tsx
│   │   ├── NestoryToast.tsx
│   │   └── ...
│   ├── icons/
│   │   └── remix.ts               # Remix Icon 双端引入封装
│   └── index.ts
└── package.json
```

> 跨端共享的实现细节：用 react-native-web 在 Web 复用 RN 组件；或对每个组件提供 `.native.tsx` / `.web.tsx` 双实现，由打包器自动选。

---

## packages/db — 数据库

```
packages/db/
├── prisma/
│   ├── schema.prisma              # 底座通用表：users / subscriptions
│   ├── extensions/
│   │   └── nestory.prisma         # Nestory 业务表：children / raw_assets / asset_files / tags / asset_tags
│   │                              # / highlights / stories / story_shares
│   └── migrations/
├── src/
│   ├── client.ts                  # PrismaClient 单例
│   └── index.ts
└── package.json
```

> 通用表（users / subscriptions）所有产品共享。业务表分文件管理，下一个产品在 `extensions/petory.prisma` 里加自己的表。

---

## packages/config — 业务配置

```
packages/config/
├── src/
│   ├── nestory/
│   │   ├── index.ts               # 总入口
│   │   ├── permissions.ts         # Highlight 上限 10、Free Story 配额 2
│   │   ├── paywall.ts             # A/B/C/D 文案、利益点排序
│   │   ├── tags.ts                # 8 个预置 Tag
│   │   ├── prompts/               # AI Prompt 模板（按 quality level 分）
│   │   │   ├── planner.ts
│   │   │   ├── brief.ts
│   │   │   └── generator.ts
│   │   ├── few-shot/              # 与 prompt 强耦合的样本资产
│   │   │   ├── positive/{low,medium,rich}/
│   │   │   ├── negative/
│   │   │   └── rubric.md          # Writing Rubric
│   │   └── push/                  # 推送文案（时区/月份占位符）
│   │
│   └── petory/                    # 下一个产品（示例占位）
│       └── index.ts
└── package.json
```

---

## apps/nestory-api — Fastify 后端

```
apps/nestory-api/
├── src/
│   ├── index.ts                       # 服务入口
│   ├── routes/                        # 薄路由层
│   │   ├── assets.ts                  # POST /assets（含 idempotency-key 头）
│   │   │                              # PATCH /assets/:id（add_photos / remove_file_ids / reorder_file_ids）
│   │   ├── stories.ts
│   │   ├── highlights.ts
│   │   ├── children.ts                # POST 不拦截、PATCH /active 切换 → 403 PROFILE_SWITCH_RESTRICTED
│   │   ├── subscriptions.ts
│   │   └── shares.ts
│   ├── services/                      # 业务逻辑层（薄壳，主要调 packages/core 等）
│   │   ├── asset.service.ts           # raw_assets + asset_files 事务写入
│   │   ├── story.service.ts
│   │   ├── highlight.service.ts       # 调 @nestory/core highlight-limit
│   │   ├── subscription.service.ts
│   │   └── share.service.ts
│   ├── jobs/
│   │   ├── queues.ts
│   │   ├── workers/
│   │   │   ├── story-generation.worker.ts   # 调 @nestory/ai-pipeline
│   │   │   ├── asset-description.worker.ts
│   │   │   └── storage-cleanup.worker.ts    # 异步清理 asset_files 删除后的 Storage 文件
│   │   └── scheduler/
│   │       └── story-scheduler.ts           # 调 @nestory/push timezone-aware
│   ├── middleware/
│   │   ├── auth.ts                    # Supabase JWT 校验
│   │   ├── rate-limit.ts              # 见 06_Nestory_安全与合规
│   │   └── idempotency.ts             # Idempotency-Key 头处理（POST /assets 等）
│   └── config/
│       └── env.ts                     # zod 校验环境变量
├── package.json
└── tsconfig.json
```

---

## apps/nestory-web — Next.js H5

```
apps/nestory-web/
├── app/
│   ├── story/[id]/page.tsx                # App WebView 入口
│   ├── share/[token]/
│   │   ├── page.tsx                       # Public 分享页
│   │   └── opengraph-image.tsx            # OG 图动态生成
│   └── layout.tsx
├── components/
│   ├── renderer/
│   │   ├── StoryRenderer.tsx              # 接收 StoryDocument，渲染 sections
│   │   ├── FooterBrandBlock.tsx           # 品牌标识 + 双端下载链接
│   │   └── sections/{Cover,Summary,Narrative,...}.tsx
│   ├── shells/
│   │   ├── AppStoryShell.tsx              # 注入 token、埋点、原生桥接
│   │   └── PublicShareShell.tsx           # token 校验、访问控制
│   └── themes/
│       ├── tokens/                        # 各 themeId 的 CSS variables
│       └── ThemeProvider.tsx
├── lib/
│   ├── api.ts                             # 调 nestory-api
│   └── auth.ts
├── public/brand/                          # Logo + 双端下载徽章
└── next.config.ts
```

---

## apps/nestory-mobile — Expo App

```
apps/nestory-mobile/
├── app/                                   # Expo Router（文件系统路由）
│   ├── (tabs)/
│   │   ├── index.tsx                      # H-01 Home
│   │   ├── stories.tsx                    # S-01
│   │   └── highlights.tsx                 # HL-01
│   ├── memory/{add,list,[id]}.tsx
│   ├── story/[id].tsx                     # WebView 容器
│   ├── highlight/[id].tsx
│   ├── settings/{index,subscription,profiles,profile/[id],privacy,about,feedback}.tsx
│   └── onboarding/{welcome,auth,profile,permissions,plan}.tsx
├── components/
│   ├── paywall/PaywallModal.tsx           # 接收 trigger A/B/C/D，调 @nestory/core paywall.router
│   ├── story/{StoryCard,CurrentMonthCard}.tsx
│   ├── memory/{TagSelector,HighlightToggle}.tsx
│   └── common/{ChildProfileSelector,ProgressBar}.tsx
├── hooks/
│   ├── useSubscription.ts                 # 以后端为准 + 刷新机制；返回 downgrade_toast 标记
│   ├── useStoryListState.ts
│   └── useSourceNavigation.ts
├── lib/
│   ├── api.ts
│   ├── revenuecat.ts                      # 透传 @nestory/core/subscription/revenuecat
│   └── analytics.ts
├── app.json                               # Expo 配置（双端 bundle id、权限、Splash、icon）
└── tsconfig.json
```

---

## 包之间的依赖图

```
apps/nestory-api      → @nestory/{core, ai-pipeline, media, push, db, config, types}
apps/nestory-web      → @nestory/{ui, types, config}
apps/nestory-mobile   → @nestory/{core, ui, types, config}

packages/core         → @nestory/{db, types, config}
packages/ai-pipeline  → @nestory/{db, types, config}
packages/media        → @nestory/{db, types}
packages/push         → @nestory/{db, types, config}
packages/ui           → @nestory/{types}
packages/db           → @nestory/{types}
packages/config       → @nestory/{types}
packages/types        → (无依赖)
```

> 严禁循环依赖。`tools/check-deps.ts` 在 CI 跑 madge 检查。

---

## 数据流向（端到端）

```
用户操作（apps/nestory-mobile）
  ↓ REST API
apps/nestory-api/routes  → services
  ↓ Memory 上传
@nestory/media (mime check / exif strip / Supabase upload)
  ↓
@nestory/db Prisma 事务（raw_assets + N 行 asset_files）

---

Hourly Scheduler @nestory/push.timezone-aware
  ↓ 检测到用户本地时区进入次月 1 日
@nestory/core.quota 原子扣减 story_quota
  ↓
nestory-api jobs/workers/story-generation
  ↓
@nestory/ai-pipeline (planner → brief → generator → validator → theme)
  ↓
@nestory/db 写入 stories（document JSONB + 显式列）

---

用户查看 Story
  ↓
nestory-mobile → WebView → nestory-web AppStoryShell
  ↓
StoryRenderer + FooterBrandBlock

---

外部分享
  ↓
nestory-web PublicShareShell → @nestory/db 查 story_shares.token
  ↓ generateMetadata → OG meta
StoryRenderer + FooterBrandBlock（含双端下载链接）
```

---

## 环境变量

> 完整清单见 `09_Nestory_环境与CI_v1.0.md`。这里只列分布。

| 包/应用 | 环境变量来源 |
|---|---|
| `apps/nestory-api` | `.env`（Railway 环境变量），含 `DATABASE_URL` / `SUPABASE_*` / `OPENAI_API_KEY` / `REVENUECAT_WEBHOOK_SECRET` / `REDIS_URL` |
| `apps/nestory-web` | `.env`（Vercel），含 `NEXT_PUBLIC_API_URL` / `NESTORY_API_INTERNAL_KEY` |
| `apps/nestory-mobile` | `.env`（EAS Build secrets），含 `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` / `REVENUECAT_API_KEY_IOS` / `REVENUECAT_API_KEY_ANDROID` |

---

## 开发启动

```bash
# 安装依赖（根目录）
pnpm install

# 启动所有服务
pnpm dev

# 单独启动
pnpm --filter @nestory/api dev
pnpm --filter @nestory/web dev
pnpm --filter @nestory/mobile start

# 数据库
pnpm --filter @nestory/db migrate
pnpm --filter @nestory/db studio
pnpm --filter @nestory/db seed

# 全量类型检查
pnpm typecheck

# 文档版本一致性检查
pnpm check:docs
```

---

## 目录命名约定

| 约定 | 说明 |
|---|---|
| `apps/<product>-<surface>` | 一个产品的一个端：`-mobile` / `-web` / `-api` |
| `packages/<domain>` | 单数名词，按领域切分：core / media / push 等 |
| `packages/config/<product>` | 每个产品一个目录，互不感知 |
| `services/` | 业务逻辑，不含 HTTP 层细节 |
| `routes/` | HTTP 路由，只做参数校验，调 service |
| `jobs/workers/` | BullMQ Worker |
| `jobs/scheduler/` | 定时任务（hourly cron） |
| `pipeline/` | （在 packages/ai-pipeline 内）AI 生成流水线 |
| `hooks/` | React hooks |
| `few-shot/` | Prompt 工程资产（样本 + rubric），在 packages/config 内 |
