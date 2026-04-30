# Nestory — 项目目录结构（单产品 + 演化抽包版）

**版本：** v3.0
**日期：** 2026-04-29
**上一版本：** v2.0（2026-04-25，多产品底座，已 deprecated）
**依赖文档：** 技术架构 v1.3 · ARCH-DECISIONS-20260425 · 数据库设计 v1.7

### v3.0 变更记录

- **战略调整：放弃多产品底座（base/packages/\*）路线，回归单产品结构。** 理由：
  1. **时间成本**：底座 scaffolding 2-5 天 + 长期 ~20% 开发减速，对 1 个月上线目标净亏 5-7 工作日
  2. **猜测风险**：N=1 时无法准确预判"通用形状"，强行抽包易抽错；N=2 时抽包更准
  3. **不确定收益**：第二个产品启动时间未定；即便启动，与 Nestory 同构度未知
  - 改为"先单产品交付 → 真启动第二个产品时再演化抽包"，详见 §"演化路径"
- **mobile 内部改用 features-based**：`apps/nestory-mobile/` 用业务能力切分（`features/{stories, highlights, ...}`），同一 feature 的 api / hooks / components / screens / types 集中在一个文件夹
- **api 内部用 modules-based**：原 v2.0 各 `packages/{core, ai-pipeline, media, push}` 的内容内化为 `apps/nestory-api/src/modules/<name>/`，模块间只通过 `index.ts` 暴露接口（保留未来抽包的清晰边界）
- **packages 只剩 1 个**：保留 `packages/types` 强制跨 app 类型一致；db schema 内化进 nestory-api，config 内化进各 app 自己的 `config/`

### v2.0（已 deprecated）

原方案设想跨产品底座（Nestory + Petory + ...），将订阅/AI/媒体/推送/UI 等抽为 8 个独立 packages。为快速上线，本版本暂缓此方案。完整 v2.0 内容已归档（如需重启多产品方案，参考 git 历史）。

### v1.1（已 deprecated）

仅做单产品 nestory/ 结构。

---

## 总览：单产品 Monorepo 结构

```
nestory/
├── apps/
│   ├── nestory-mobile/                  # React Native + Expo（iOS + Android）
│   ├── nestory-web/                     # Next.js（H5 渲染 + 分享页，Vercel）
│   └── nestory-api/                     # Fastify + BullMQ（API + 任务队列，Railway）
│
├── packages/
│   └── types/                           # 唯一共享包：跨 app TS 类型
│
├── tools/                               # 仓库级脚本
│   ├── doc-version-check.ts             # CI 校验文档间版本号
│   ├── seed-tags.ts                     # 写入 8 个预置 Tag
│   └── check-deps.ts                    # madge 检查循环依赖
│
├── package.json                         # pnpm workspace 根
├── pnpm-workspace.yaml
├── turbo.json                           # Turborepo 任务编排
└── tsconfig.base.json                   # TS 共享 base config
```

**与 v2.0 的关键差异**：

| 维度 | v2.0（多产品底座） | v3.0（单产品） |
|---|---|---|
| 顶层 | `base/{apps, packages}` | `nestory/{apps, packages}` |
| packages 数量 | 8 个 | **1 个**（`types`）|
| db schema 位置 | `packages/db/prisma/` | `apps/nestory-api/prisma/` |
| 业务配置位置 | `packages/config/<product>/` | 各 app 内 `src/config/` |
| 订阅状态机 / AI Pipeline / Media / Push | `packages/{core, ai-pipeline, media, push}` | `apps/nestory-api/src/modules/<name>/`（演化时再抽） |
| UI 共享 | `packages/ui`（跨产品） | 各 app 内自维护，token 通过本地复制保持一致 |

---

## packages/types — 共享类型

```
packages/types/
├── src/
│   ├── subscription.ts        # SubscriptionPlan、PaywallTrigger、PaywallTriggerLog、五态枚举
│   ├── permission.ts          # PermissionRule（R-01 ~ R-11 枚举）
│   ├── story.ts               # StoryDocument、StorySection、StoryStatus
│   ├── generation.ts          # SectionPlan、NarrativeBrief、GenerationMeta
│   ├── asset.ts               # RawAsset、AssetFile、CandidateMomentGroup
│   ├── enums.ts               # SectionIntent、SectionOutputType、StoryListItemState
│   └── index.ts
└── package.json
```

> 整个系统的**内容合同**。所有跨 app（mobile/web/api）的数据结构从这里导入，不允许各 app 自定义同名类型。这是 v3.0 唯一保留的 package，因为 TS 类型一致性的成本（写一次）远低于收益（编译期跨服务校验）。

---

## apps/nestory-mobile — Expo App（features-based）

```
apps/nestory-mobile/
├── app/                                 # Expo Router 文件系统路由（保持极薄）
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                    # H-01 Home → features/home
│   │   ├── stories.tsx                  # S-01 Stories 列表
│   │   └── highlights.tsx               # HL-01 Highlights 列表
│   ├── memory/
│   │   ├── add.tsx
│   │   ├── list.tsx
│   │   └── [id].tsx
│   ├── story/[id].tsx                   # WebView 容器，载入 nestory-web /story/[id]
│   ├── highlight/[id].tsx
│   ├── settings/
│   │   ├── index.tsx                    # ST-01
│   │   ├── subscription.tsx             # ST-02A/B
│   │   ├── profiles/{index,[id]}.tsx    # ST-03/03a 孩子档案
│   │   ├── account.tsx                  # ST-07
│   │   ├── privacy.tsx                  # ST-04
│   │   ├── about.tsx                    # ST-05
│   │   └── feedback.tsx                 # ST-06
│   └── onboarding/
│       ├── welcome.tsx
│       ├── auth.tsx
│       ├── profile.tsx
│       ├── permissions.tsx
│       └── plan.tsx
│
├── features/                            # 业务能力切分（v3.0 新增）
│   ├── stories/
│   │   ├── api/storiesApi.ts            # 纯 fetch 函数
│   │   ├── hooks/
│   │   │   ├── useStories.ts            # TanStack Query 封装
│   │   │   ├── useStory.ts
│   │   │   ├── useStoryRealtime.ts      # Supabase Realtime postgres_changes 订阅
│   │   │   └── useStoryQuota.ts
│   │   ├── components/
│   │   │   ├── StoryCard.tsx            # Current × {Empty/Collecting/Locked/Generating} + History × ...
│   │   │   └── CurrentMonthCard.tsx
│   │   ├── screens/
│   │   │   ├── StoriesScreen.tsx
│   │   │   └── StoryDetailScreen.tsx    # 包 WebView
│   │   └── types.ts                     # feature 内部类型；跨 app 类型走 packages/types
│   │
│   ├── highlights/
│   │   ├── api/, hooks/, components/, screens/, types.ts
│   │   └── （HighlightCard 4:3 / 3:4 × OneLine/TwoLine 四变体；HL-01/HL-02）
│   │
│   ├── memories/                        # Memory 上传/编辑（注意：不要跟 stories 混）
│   │   ├── api/memoriesApi.ts           # POST /assets（含 Idempotency-Key）+ PATCH /assets/:id
│   │   ├── hooks/{useMemories, useUploadMemory, useDeleteMemory}.ts
│   │   ├── components/{MemoryCard, PhotoGrid, UploadButton, TagSelector, HighlightToggle}.tsx
│   │   ├── screens/{MemoriesScreen, MemoryUploadScreen, MemoryDetailScreen}.tsx
│   │   └── types.ts
│   │
│   ├── subscription/
│   │   ├── api/subscriptionApi.ts
│   │   ├── hooks/
│   │   │   ├── useSubscription.ts       # 以后端为准 + 刷新机制；返回 downgrade_toast 标记
│   │   │   ├── usePaywall.ts            # trigger A/B/C/D 路由
│   │   │   └── useTrialEligibility.ts
│   │   ├── components/
│   │   │   ├── PaywallModal.tsx         # Modal/Paywall A/B/C/D × year/month
│   │   │   ├── SubscriptionStatusBadge.tsx
│   │   │   └── PricingCard.tsx
│   │   ├── screens/SubscriptionScreen.tsx
│   │   └── types.ts
│   │
│   ├── auth/
│   │   ├── api/authApi.ts
│   │   ├── hooks/{useAuth, useSession}.ts
│   │   ├── components/{SignInWithApple, SignInWithGoogle, ContinueButton}.tsx
│   │   ├── screens/SignInScreen.tsx
│   │   └── types.ts
│   │
│   ├── children/                        # 孩子档案（多孩子支持）
│   │   ├── api/childrenApi.ts           # POST 不拦截、PATCH /active 切换
│   │   ├── hooks/{useChildren, useActiveChild, useSwitchChild}.ts
│   │   ├── components/{ChildProfileSelector, ChildAvatar, ChildEditForm}.tsx
│   │   ├── screens/{ChildListScreen, ChildEditScreen}.tsx
│   │   └── types.ts
│   │
│   ├── profile/                         # 用户账号 / 设置 / 关于 / 反馈 / 隐私
│   │   ├── api/, hooks/, components/, screens/, types.ts
│   │
│   ├── home/                            # H-01 Home 屏（avatarRow / highlightRow 等）
│   │   ├── components/{AvatarRow, HighlightRow}.tsx
│   │   └── screens/HomeScreen.tsx
│   │
│   └── onboarding/
│       ├── api/, hooks/, components/, screens/, types.ts
│
├── shared/                              # 跨 feature 复用
│   ├── ui/                              # 全局 atoms（Button, Input, Tag, StatusBadge, Toggle, Toast, Notify, BottomSheet）
│   │   ├── Button.tsx                   # 5 type × 3 status = 15 变体
│   │   ├── Input.tsx                    # SingleLine/MultiLine × Default/Focused/withContent
│   │   ├── Tag.tsx, StatusBadge.tsx, Toggle.tsx
│   │   ├── Toast.tsx, Notify.tsx, BottomSheet.tsx
│   │   ├── NavBar.tsx, TabBar.tsx, StatusBar.tsx
│   │   └── index.ts
│   ├── theme/                           # token 消费层（从 docs/dev/08-Nestory_DesignTokens0429.json 同步）
│   │   ├── colors.ts                    # 02 Tokens 语义层（text/surface/border）
│   │   ├── typography.ts                # H1-4 / Body / Caption / ButtonLabel-M/S / Tag&Badge
│   │   ├── spacing.ts                   # XS-4 / S-8 / M-12 / L-16 / XL-20 / XXL-24 / SafeBtm
│   │   ├── radius.ts                    # None-0 / S-6 / M-10 / L-16 / Full-999
│   │   ├── primitives.ts                # 01 Primitive 调色板（按需引用）
│   │   └── index.ts
│   └── lib/                             # 通用工具
│       ├── supabase.ts                  # Supabase 客户端单例
│       ├── api.ts                       # API fetcher（统一错误处理、Idempotency-Key）
│       ├── revenuecat.ts                # RevenueCat SDK 封装
│       ├── analytics.ts
│       ├── storage.ts                   # SecureStore / AsyncStorage
│       └── navigation.ts                # 跳转工具（含 useSourceNavigation）
│
├── assets/                              # 图片、字体、Splash、icon
│   ├── fonts/{Manrope, Inter}/
│   └── images/
├── app.json                             # Expo 配置
├── app.config.ts                        # 动态配置（环境变量注入）
├── package.json
└── tsconfig.json
```

> **路由文件极薄约定**：`app/` 下文件只导出对应 Screen 组件，不写业务逻辑：
> ```tsx
> // app/(tabs)/stories.tsx
> export { StoriesScreen as default } from '@/features/stories/screens/StoriesScreen'
> ```
>
> **features 边界纪律**：
> - 跨 feature 引用**只允许**走 `features/<其他>/api/` 或 `features/<其他>/types`，不允许 import 其他 feature 的 `components/` 内部
> - 跨 feature 复用的 UI 提到 `shared/ui/`
> - 跨 feature 复用的业务 hook（罕见）放 `shared/hooks/`（按需创建）

---

## apps/nestory-api — Fastify 后端（modules-based）

```
apps/nestory-api/
├── src/
│   ├── index.ts                         # 服务入口
│   │
│   ├── routes/                          # HTTP 路由层（薄）
│   │   ├── assets.ts                    # POST /assets（Idempotency-Key 头）
│   │   │                                # PATCH /assets/:id（add_photos / remove_file_ids / reorder_file_ids）
│   │   ├── stories.ts
│   │   ├── highlights.ts
│   │   ├── children.ts                  # PATCH /active 切换 → 403 PROFILE_SWITCH_RESTRICTED
│   │   ├── subscriptions.ts
│   │   ├── shares.ts
│   │   └── webhooks/
│   │       └── revenuecat.ts            # RevenueCat 订阅事件回调
│   │
│   ├── services/                        # 业务编排层（薄壳，串接 modules）
│   │   ├── asset.service.ts             # raw_assets + asset_files 事务写入
│   │   ├── story.service.ts
│   │   ├── highlight.service.ts         # 调 modules/permission highlight-limit
│   │   ├── subscription.service.ts
│   │   └── share.service.ts
│   │
│   ├── modules/                         # 业务能力模块（v3.0 新增；未来抽包的边界）
│   │   ├── subscription/
│   │   │   ├── state-machine.ts         # 五态状态机（Never Paid / Trial Active / Premium Active / Trial Ended / Premium Ended）
│   │   │   ├── revenuecat.ts            # RevenueCat 封装（事件订阅、状态同步）
│   │   │   ├── quota.ts                 # story_quota 原子扣减、降级归零
│   │   │   ├── trial.ts                 # checkTrialEligibility（R-11）
│   │   │   └── index.ts                 # 对外暴露的接口
│   │   │
│   │   ├── permission/
│   │   │   ├── rules.ts                 # R-01 ~ R-11 规则常量（不含产品阈值，阈值从 config/permissions.ts 注入）
│   │   │   ├── highlight-limit.ts       # advisory lock + 事务（R-04）
│   │   │   ├── profile-switch.ts        # R-05 切换/创建边界
│   │   │   └── index.ts
│   │   │
│   │   ├── ai-pipeline/
│   │   │   ├── planner/
│   │   │   │   ├── quality-scorer.ts    # 通用打分，阈值由 config 注入
│   │   │   │   ├── section-mapper.ts    # qualityLevel → SectionPlan[]
│   │   │   │   └── moment-groups.ts
│   │   │   ├── brief/
│   │   │   │   ├── rule-generator.ts
│   │   │   │   └── llm-generator.ts     # 小 LLM 调用
│   │   │   ├── generator/
│   │   │   │   └── prompt-builder.ts    # prompt 模板从 config/prompts/ 读
│   │   │   ├── validator/
│   │   │   ├── theme/
│   │   │   │   └── resolver.ts          # 节日/季节/月龄 → themeId
│   │   │   └── index.ts
│   │   │
│   │   ├── media/
│   │   │   ├── upload/
│   │   │   │   ├── multipart.ts         # multipart 解析、文件流处理
│   │   │   │   ├── mime-check.ts        # magic bytes 校验（不信任 Content-Type）
│   │   │   │   ├── exif-strip.ts        # 隐私默认 strip GPS
│   │   │   │   └── supabase-storage.ts  # Supabase Storage 客户端封装
│   │   │   ├── image/
│   │   │   │   ├── decode.ts            # 用 sharp 解码出宽高
│   │   │   │   └── compress.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── push/
│   │   │   ├── scheduler/
│   │   │   │   └── timezone-aware.ts    # hourly cron，按用户时区触发
│   │   │   ├── providers/
│   │   │   │   ├── expo-push.ts
│   │   │   │   └── apns.ts              # 备用：直连 APNs
│   │   │   └── index.ts
│   │   │
│   │   └── paywall/
│   │       ├── router.ts                # Paywall Model X 路由（A/B/C/D 按功能主题）
│   │       └── index.ts
│   │
│   ├── jobs/
│   │   ├── queues.ts
│   │   ├── workers/
│   │   │   ├── story-generation.worker.ts    # 调 modules/ai-pipeline
│   │   │   ├── asset-description.worker.ts
│   │   │   └── storage-cleanup.worker.ts     # 异步清理 asset_files 删除后的 Storage 文件
│   │   └── scheduler/
│   │       └── story-scheduler.ts            # 调 modules/push timezone-aware
│   │
│   ├── middleware/
│   │   ├── auth.ts                      # Supabase JWT 校验
│   │   ├── rate-limit.ts                # 见 06_Nestory_安全与合规
│   │   └── idempotency.ts               # Idempotency-Key 头处理
│   │
│   ├── config/                          # 业务配置（v3.0 内化进 api，原 packages/config/nestory）
│   │   ├── env.ts                       # zod 校验环境变量
│   │   ├── permissions.ts               # Highlight 上限 10、Free Story 配额 2
│   │   ├── paywall.ts                   # A/B/C/D 文案、利益点排序
│   │   ├── tags.ts                      # 8 个预置 Tag
│   │   ├── prompts/                     # AI Prompt 模板
│   │   │   ├── planner.ts
│   │   │   ├── brief.ts
│   │   │   └── generator.ts
│   │   ├── few-shot/                    # 与 prompt 强耦合的样本资产
│   │   │   ├── positive/{low,medium,rich}/
│   │   │   ├── negative/
│   │   │   └── rubric.md                # Writing Rubric
│   │   └── push/                        # 推送文案（时区/月份占位符）
│   │
│   └── types/                           # 仅本 app 内部类型；跨 app 类型走 @nestory/types
│
├── prisma/                              # v3.0 内化进 api，原 packages/db
│   ├── schema.prisma                    # 所有表（users / subscriptions / children / raw_assets / asset_files / tags / asset_tags / highlights / stories / story_shares）
│   └── migrations/
│
├── package.json
└── tsconfig.json
```

> **modules 抽包纪律**（关键 —— 决定未来抽包是否优雅）：
> - modules 之间互调**只走** `modules/<X>/index.ts` 暴露的接口
> - **不允许**跨模块 import 其他模块的内部文件（`modules/X/internal-helper.ts` 不可被 `modules/Y/` import）
> - 模块内部可以自由 import 自己的子文件
> - 模块依赖外部能力（如 prisma client、env）通过参数注入，不直接 import 全局
>
> 满足上述纪律时，未来抽 `modules/<X>` → `packages/<X>` 的工作就是 git mv + 改 import 路径，**不需要重写代码**。

---

## apps/nestory-web — Next.js H5

```
apps/nestory-web/
├── app/                                 # Next.js App Router
│   ├── story/[id]/
│   │   └── page.tsx                     # App WebView 入口
│   ├── share/[token]/
│   │   ├── page.tsx                     # Public 分享页
│   │   └── opengraph-image.tsx          # OG 图动态生成
│   └── layout.tsx
├── components/
│   ├── renderer/
│   │   ├── StoryRenderer.tsx            # 接收 StoryDocument，渲染 sections
│   │   ├── FooterBrandBlock.tsx         # 品牌标识 + 双端下载链接
│   │   └── sections/{Cover,Summary,Narrative,...}.tsx
│   ├── shells/
│   │   ├── AppStoryShell.tsx            # 注入 token、埋点、原生桥接
│   │   └── PublicShareShell.tsx         # token 校验、访问控制
│   └── themes/
│       ├── tokens/                      # 各 themeId 的 CSS variables
│       └── ThemeProvider.tsx
├── lib/
│   ├── api.ts                           # 调 nestory-api
│   └── auth.ts
├── public/brand/                        # Logo + 双端下载徽章
└── next.config.ts
```

> 与 v2.0 几乎一致。**变更点**：不再依赖 `packages/ui`，token 通过本地 CSS Variables 维护（与 mobile 的 `shared/theme/` 保持人工同步，演化抽包时再统一）。

---

## 包之间的依赖图

```
apps/nestory-api      → @nestory/types
apps/nestory-web      → @nestory/types
apps/nestory-mobile   → @nestory/types
@nestory/types        → (无依赖)
```

> 远比 v2.0 的依赖图简单。**严禁 app 之间互相依赖**（mobile 不能 import api、web 不能 import mobile 等），跨 app 共享只能通过 `@nestory/types`。`tools/check-deps.ts` 在 CI 跑 madge 检查。

---

## 演化路径：什么时候、抽哪些包出来

### 触发条件（满足任一即考虑）

1. **真启动第二个产品**（不是想，是开仓库的那一刻）
2. **某模块在 mobile 和 api 都有副本** —— 维护双份成本 > 抽包成本
3. **某模块的接口稳定 ≥ 1 个月** —— 还在频繁迭代的别抽

### 候选清单（按抽出难度从易到难）

| 模块 | 当前位置 | 抽出后 | 抽出收益 | 难度 | 备注 |
|---|---|---|---|---|---|
| `types` | `packages/types`（已抽） | — | 已实现 | — | 强制跨 app 类型一致 |
| `media` | `apps/nestory-api/src/modules/media/` | `packages/media` | 上传/MIME/EXIF/Supabase 通用 | ★ | 真·通用，抽出最快 |
| `push` | `apps/nestory-api/src/modules/push/` | `packages/push` | 时区调度通用 | ★ | 真·通用 |
| `subscription` | `apps/nestory-api/src/modules/subscription/` | `packages/subscription` | RevenueCat + 状态机通用 | ★★ | 配额阈值需通过 config 注入 |
| `permission` | `apps/nestory-api/src/modules/permission/` | `packages/permission` | 规则形状通用 | ★★ | 具体规则（R-01~R-11）产品特定，要重新约定 |
| `ai-pipeline` | `apps/nestory-api/src/modules/ai-pipeline/` | `packages/ai-pipeline` | Pipeline 形状通用 | ★★★ | prompts/rubric/few-shot 全部重写 |
| `ui` | 各 app 的 `shared/ui/` 与 `themes/` | `packages/ui` | tokens 系统通用 | ★★★ | 双端实现差异（RN vs Web）需要 react-native-web 或双实现 |

### 抽包流程（以 `media` 为例）

```
1. 新建 packages/media + package.json + tsconfig.json + index.ts
2. git mv apps/nestory-api/src/modules/media/* → packages/media/src/
3. 全仓库改 import: 
     from '@/modules/media'  →  from '@nestory/media'
4. apps/nestory-api/package.json 加依赖：
     "@nestory/media": "workspace:*"
5. pnpm install
6. pnpm typecheck 通过 → 完成
```

> 因为 modules 抽包纪律已经强制了"只走 index.ts 接口"、"无跨模块内部 import"，抽包不需要重写任何代码。

### 不抽的东西

- 业务路由（`routes/`）、业务编排（`services/`）、UI 屏幕（`features/<*>/screens/`）—— 这些是产品特定的，不存在抽包价值
- `prisma/schema.prisma` 的业务表 —— 下一个产品有自己的表，schema 文件本身不抽（最多抽通用 enum / 通用表迁移到独立的 prisma fragment）

---

## 数据流向（端到端）

```
用户操作（apps/nestory-mobile）
  ↓ REST API
apps/nestory-api/routes  →  services
  ↓ Memory 上传
apps/nestory-api/src/modules/media (mime check / exif strip / Supabase upload)
  ↓
prisma 事务（raw_assets + N 行 asset_files）

---

Hourly Scheduler  →  modules/push/scheduler/timezone-aware
  ↓ 检测到用户本地时区进入次月 1 日
modules/subscription/quota 原子扣减 story_quota
  ↓
nestory-api jobs/workers/story-generation
  ↓
modules/ai-pipeline (planner → brief → generator → validator → theme)
  ↓
prisma 写入 stories（document JSONB + 显式列）

---

用户查看 Story
  ↓
nestory-mobile → WebView → nestory-web AppStoryShell
  ↓
StoryRenderer + FooterBrandBlock

---

外部分享
  ↓
nestory-web PublicShareShell → prisma 查 story_shares.token
  ↓ generateMetadata → OG meta
StoryRenderer + FooterBrandBlock（含双端下载链接）
```

---

## 环境变量

> 完整清单见 `09_Nestory_环境与CI_v1.0.md`。这里只列分布。

| 包/应用 | 环境变量来源 | 关键变量 |
|---|---|---|
| `apps/nestory-api` | `.env`（Railway 环境变量） | `DATABASE_URL` / `SUPABASE_*` / `OPENAI_API_KEY` / `REVENUECAT_WEBHOOK_SECRET` / `REDIS_URL` |
| `apps/nestory-web` | `.env`（Vercel） | `NEXT_PUBLIC_API_URL` / `NESTORY_API_INTERNAL_KEY` |
| `apps/nestory-mobile` | `.env`（EAS Build secrets） | `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` / `REVENUECAT_API_KEY_IOS` / `REVENUECAT_API_KEY_ANDROID` |

---

## 开发启动

```bash
# 安装依赖（根目录）
pnpm install

# 启动所有服务（mobile 需要 Expo 单独启动）
pnpm dev                           # 启动 api + web
pnpm --filter @nestory/mobile start  # 启动 mobile（Expo Dev Server）

# 单独启动
pnpm --filter @nestory/api dev
pnpm --filter @nestory/web dev

# 数据库（v3.0 prisma 在 api 里）
pnpm --filter @nestory/api prisma:migrate
pnpm --filter @nestory/api prisma:studio
pnpm --filter @nestory/api prisma:seed

# 全量类型检查
pnpm typecheck

# 文档版本一致性检查
pnpm check:docs

# 循环依赖检查
pnpm check:deps
```

---

## 目录命名约定

| 约定 | 说明 |
|---|---|
| `apps/<surface>` | nestory-mobile / nestory-web / nestory-api |
| `apps/nestory-mobile/features/<name>` | mobile 内按业务能力切分（v3.0 新增）|
| `apps/nestory-api/src/modules/<name>` | api 内按业务能力切分；未来抽包的边界（v3.0 新增）|
| `shared/` | mobile 内跨 feature 复用 |
| `services/` | api 业务编排（薄）|
| `routes/` | api HTTP 路由（薄）|
| `jobs/workers/` / `jobs/scheduler/` | BullMQ |
| `hooks/` | 在 `features/<name>/hooks/` 内的 React hooks（不允许 mobile 顶层 `hooks/`）|
| `few-shot/` | Prompt 工程资产（样本 + rubric），在 `apps/nestory-api/src/config/few-shot/` |
| `packages/types` | 唯一共享 package |

### Import 路径约定

| from | 用法 |
|---|---|
| 跨 app 类型 | `import { StoryDocument } from '@nestory/types'` |
| mobile 内部 | `import { StoryCard } from '@/features/stories/components/StoryCard'` |
| api 内部跨模块 | `import { quota } from '@/modules/subscription'`（只走 index）|
| api 内部模块内 | `import { ... } from './state-machine'` |

> **强约束**：mobile 不允许 `import` api 任何代码；api 不允许 `import` mobile/web 任何代码。跨端共享只能通过 `@nestory/types` + REST API。
