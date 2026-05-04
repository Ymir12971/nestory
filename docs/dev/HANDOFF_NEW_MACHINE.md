# Nestory — 换机器交接说明

**生成日期**：2026-04-30
**最近更新**：2026-05-03(本地端到端联调 — DB 接通,API 跑通,mobile bundle 受阻)
**用途**：在另一台机器上恢复 Claude Code 协作上下文

---

## 0. 2026-05-03 更新摘要(最新)

今天目标:**本地端到端跑通**(P0 — 不依赖 Apple/Google 注册的部分)。完成度大约 70%,mobile bundle 卡在 monorepo + Metro 配置。

### ✅ 已完成

1. **Supabase DB 真接通**(项目 ref `ovggqeaxqkaybrgnzfwh`)
   - 12 张表全部 migrate 上去(在 [apps/nestory-api/prisma/migrations/20260503000000_init/](../../apps/nestory-api/prisma/migrations/20260503000000_init/))
   - `post-init.sql` 应用完成(部分索引 + GIN + Realtime publication)
   - seed 数据写入(Demo User + Emma 子档案 + 订阅 free 状态)
2. **API 实跑通过**:`GET /health` 200 + `GET /subscriptions/me`(带 `Bearer dev-aaaaaaaa-...`)真实返回 seed 数据 = 整个 dev-token → Prisma → Supabase 链路 OK
3. **连接串结构调整**:`schema.prisma` 加 `directUrl`,`env.ts` 加 `DIRECT_URL`,`.env.example` 注释清晰说明 dev/prod 策略(dev 两根都填直连;prod Railway 时把 `DATABASE_URL` 换 pooler)
4. **架构决策更新到 memory**:
   - `project_deployment_decisions.md` — 改为"现阶段单 Supabase 项目,prod 项目 TestFlight 前一周再建"
   - 新增 `project_external_account_schedule.md` — Apple Dev / Google Play 注册推迟到 2026-05-10 那周

### 🟠 阻塞中(明天首要解决)

**Mobile Web bundle 启不来**。两阶段问题:

**阶段 1**(已修):"Objects are not valid as a React child" — 监控错误 element 里的 `_store` key 是 React 18 internal,但 React 19 已删,说明 monorepo 里 `apps/nestory-web`(Next 15 + React 19) 的 React 19 通过 Metro 默认 hierarchical lookup 漏到了 mobile bundle。修复:新建 [apps/nestory-mobile/metro.config.js](../../apps/nestory-mobile/metro.config.js),设 `disableHierarchicalLookup: true` + 显式 `nodeModulesPaths`。

**阶段 2**(未修):重启 Metro 清 cache 后,新 config 太严格,反过来解析不到 expo 自己的依赖:
```
Unable to resolve "react-native-helmet-async" from
  node_modules/.pnpm/expo-router@4.0.22_.../node_modules/expo-router/build/head/ExpoHead.js
Unable to resolve "expo-modules-core" from
  node_modules/.pnpm/expo@52.0.49_.../node_modules/expo/src/Expo.ts
```

这俩在 monorepo 里都装着(分别是 expo-router 和 expo 的 transitive dep),只是 metro.config.js 的解析策略漏掉了。**明天的修法**(按可能性排序):

1. 加 `extraNodeModules` 显式映射这俩(读 pnpm 的 .pnpm/<pkg>@<ver>/node_modules)
2. 改用 [pnpm 官方推荐的 `expo-yarn-workspaces` 风格 metro 配置](https://docs.expo.dev/guides/monorepos/) — 但 Expo 官方 doc 主要给 yarn,pnpm 要适配
3. 退而求其次:`hoist-pattern[]=*` 加进 `.npmrc` 把 React/Expo 关键包提到根 node_modules,绕过 pnpm 隔离 — 不优雅但能跑

**具体复现命令**(明天换机后用):
```bash
cd apps/nestory-mobile
pnpm exec expo start --web --clear
# 浏览器打开 http://localhost:8081 触发 bundle,看终端日志确认是上面两个 module 的 resolve 错
```

### 🟡 没动的事(等修好 mobile 后再做)

- 浏览器实际跑通"Welcome → Sign In → Home → 看到 Emma 数据"全流程
- Anthropic key 不缺(可以延后),但 [src/index.ts:43-45](../../apps/nestory-api/src/index.ts#L43-L45) warn"Story worker 未启动"是预期的
- 接 `STORY_AI_MOCK=1` 跑通 worker → mobile 渲染 story 链路(可绕过 Anthropic API key 验证整个 BullMQ 路径)

### 📋 这周剩余优先级(2026-05-10 前)

| 优先级 | 任务 |
|---|---|
| P0 | 修 mobile metro config,真在浏览器看到 demo flow |
| P0 | 拿 Anthropic API key,验证 Story worker 端到端(或先用 `STORY_AI_MOCK=1`) |
| P1 | 部署 API 到 Railway + 加 Redis 插件(不依赖 Apple) |
| P1 | 把 [internal.ts](../../apps/nestory-api/src/routes/internal.ts) 几个 TODO 实现掉 |
| P2 | 写 [subscriptions.ts:68](../../apps/nestory-api/src/routes/subscriptions.ts#L68) 的 RevenueCat webhook handler 框架(具体接入下周) |

**下周(2026-05-10 起)才做**:Apple Dev 注册、Google Play 注册、Supabase Auth provider 配置、App Store Connect IAP 商品、RevenueCat dashboard、TestFlight 提交。

### 📌 本机当前状态(明天换机不需要重做)

- Supabase DB schema/seed 已经在线上(下机器只要拉代码 + 拷 .env 就接得上)
- `.env` 在 `apps/nestory-api/.env` — **必须手工拷到新机器**(里面有 service_role key + DB password,提醒:之前在聊天里明文出现过,建议在 Supabase Dashboard 重置后再拷新值)
- mobile `.env` 是占位,可以新机器重生成
- 后台进程已全停(API + Metro)

---

## 0. 2026-05-01 更新摘要

今天密集推进，从 mobile UI 收尾到后端 endpoint 全套：

1. **Mobile UI 审计修复**（详见 4.1）：P0 路由 bug、Paywall C/D 触发点、像素差异、empty 态
2. **API/DB 5 项关键决策**（ADR `dev/ARCH-DECISIONS-API-DB-20260501.md`）：
   - 全栈 camelCase（DB 列仍 snake_case，由 Prisma `@map` 桥接）
   - Subscription 5 态枚举为唯一权威字段
   - `packages/types` 字段补齐
   - Story 走 BullMQ + `/internal/*` 控制平面（无公网 POST /stories）
   - 双层删除（软删 30 天恢复 + 硬删 cron purge）
3. **Prisma schema 全量重写**（11 model + 部分索引在 `prisma/post-init.sql`）
4. **Fastify 骨架 + 9 个 route 模块**（auth/error/zod/validation 全套）
5. **8 个 endpoint 模块完整实现**（users / subscriptions/me / children / assets / highlights / stories / shares / tags），含 R-04 advisory lock + R-05 切档拦截 + R-08 历史月只读
6. **Mobile API client 全套**（@tanstack/react-query + 8 domain hooks + dev mode token），SettingsScreen 已转换为接 API 的样板

**待办瓶颈**：等用户开通 Supabase 项目（DB + Auth + Storage）才能实跑，但所有代码已就绪。

---

## 1. 旧机器要做的事（离开前）

### 1.1 拷出 memory 目录（**最重要**）

```
源路径：C:\Users\JZ\.claude\projects\d--workspace-to-freedom-Blakard-Nestory\memory\
内容：
  - MEMORY.md                           # 索引
  - feedback_pragmatic_architecture.md  # 架构哲学：先单产品，N=2 再抽
  - project_launch_deadline.md          # 1 个月上线 deadline (起点 2026-04-29)
  - user_role.md                        # 用户协作风格
```

把整个 `memory/` 目录复制到 U 盘 / 云盘 / 直接 git（建议加一份到仓库 `_handoff/memory/` 临时目录）。

### 1.2 确认代码已推

```bash
git status                    # 应该 clean（除 .claude/settings.local.json）
git log --oneline -3          # 看到 monorepo 等近期 commit
git push origin main          # 确保推到 GitHub Ymir12971/nestory
```

### 1.3 停后台进程

Expo dev server 不需要保留 —— 已停。

---

## 2. 新机器准备

### 2.1 基础环境

```powershell
# Node 24+ LTS — https://nodejs.org/
# pnpm（必须装到用户目录，不能在 Program Files 下）
npm install -g pnpm@10.10.0

# Git（一般 Windows 自带或装 Git for Windows）
```

### 2.2 拿代码 + 装依赖

```bash
git clone https://github.com/Ymir12971/nestory.git
cd nestory
pnpm install                 # ~21 秒，943 packages
pnpm typecheck               # 验证：4 个 workspace 全绿，<2 秒
```

⚠️ **关键**：新机器项目目录建议保持跟旧机器一致：
```
d:\workspace_to_freedom\Blakard\Nestory
```
否则 memory 目录的 hash 名（`d--workspace-to-freedom-Blakard-Nestory`）对不上，需要重命名。

### 2.3 装 Claude Code + 登录

- 装 VS Code
- 装 Claude Code 扩展（Anthropic 出品）
- 同一个 Anthropic 账号登录 → API key 自动恢复

### 2.4 配 Figma MCP server

```bash
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```

然后在 Claude Code 会话里：
```
/mcp → figma → Authenticate → 浏览器授权
```

> **Pencil MCP 不要配** —— 路径绑定旧机器的 `C:\Users\JZ\.pencil\mcp\cursor\out\mcp-server-windows-x64.exe`，且这次会话里它已经断开。新机器需要 Pencil 时再重装。

### 2.5 恢复 memory

把旧机器拷出来的 `memory/` 目录放到：

```
<新机器用户目录>\.claude\projects\d--workspace-to-freedom-Blakard-Nestory\memory\
```

例如新机器用户名是 `Justin` → `C:\Users\Justin\.claude\projects\d--workspace-to-freedom-Blakard-Nestory\memory\`。

---

## 3. 让新 Claude 接上下文

新机器开 Claude Code，第一句推荐：

> 我从另一台机器换过来。先读 `docs/dev/HANDOFF_NEW_MACHINE.md` 第 4 节"当前进度"以及 `docs/dev/03_2_Nestory_目录结构_v3.0.md`，然后告诉我可以继续往下做什么。

---

## 4. 当前进度（截至 2026-05-01）

### 4.1 已完成

#### 基础设施

| 模块 | 文件 | 状态 |
|---|---|---|
| 文档 | `docs/dev/03_2_Nestory_目录结构_v3.0.md` | ✅ 单产品 monorepo + features-based |
| 文档 | `docs/dev/10-Nestory_FigmaScreenInventory_v1.0.md` | ✅ 41 个 frame 全清单 + node ID |
| 文档 | `docs/dev/04_Nestory_数据库设计v1.7.md` | ✅ 已 patch 至 v1.8（updated_at / 软删 / linked_providers / status='queued'）|
| 文档 | `docs/dev/05_Nestory_API设计v1.3.md` | ✅ 已 patch 至 v1.4（camelCase / port 3001 / 移除 POST /stories / `/internal/*`）|
| 文档 | `docs/dev/ARCH-DECISIONS-API-DB-20260501.md` | ✅ 5 项决策完整落地 |
| Monorepo 骨架 | `package.json` / `pnpm-workspace.yaml` / `turbo.json` / `.npmrc` | ✅ pnpm install + typecheck 全绿 |
| `packages/types` | 11 个 .ts，含新增 `topNotify.ts`；User/Memory/Subscription 字段补齐 | ✅ 全栈类型权威 |
| `apps/nestory-api` | Fastify 5 + Prisma 6 + 9 个 route 模块 + 8 个 endpoint 完整实现 | ✅ 等 DB 接通即可跑 |
| `apps/nestory-web` | Next.js 15 + App Router 占位页 | ✅ typecheck 通过 |
| Theme 层 | `shared/theme/{primitives,colors,typography,spacing,radius,index}.ts` | ✅ 完整对齐 0429 token JSON |

#### 共享组件

| 组件 | 文件 | 说明 |
|---|---|---|
| `TopNotify` | `shared/components/TopNotify.tsx` | 6 种状态；类型从 `@nestory/types` re-export |
| `PaywallModal` | `shared/components/PaywallModal.tsx` | A/B/C/D 四 variant 全接通（A→Stories, B→Highlights/AddMemory, C→Stories/Settings ended, D→HomeScreen ProfileSwitcher）|
| `usePhotoPicker` | `shared/hooks/usePhotoPicker.ts` | expo-image-picker 封装，支持单选/多选 |

#### Onboarding（全部完成）

| 屏 | 文件 | Figma node |
|---|---|---|
| O-01 Welcome | `features/onboarding/screens/WelcomeScreen.tsx` | `58:38` |
| O-02 Sign In | `features/auth/screens/SignInScreen.tsx`（含 Terms/Privacy 跳转）| `58:57` |
| O-03 a/b/c Child Profile | `features/onboarding/screens/ChildProfileScreen.tsx`（3 步：起名 / 生日 / 身高体重）| `62:42` ~ `63:282` |
| O-03a Second Child | `features/onboarding/screens/SecondChildScreen.tsx` + `app/onboarding/second-child.tsx` | `63:196` |
| O-04 Notifications | `features/onboarding/screens/NotificationsScreen.tsx`（接 expo-notifications.requestPermissionsAsync）| `64:142` |
| O-05 Plan | `features/onboarding/screens/PlanScreen.tsx` | `64:170` + `64:250` |
| O-06 Terms | `features/onboarding/screens/TermsScreen.tsx` | `64:330` |
| O-07 Privacy | `features/onboarding/screens/PrivacyScreen.tsx` | `64:361` |
| 启动入口 | `app/index.tsx`（`useSession` 鉴权重定向）| — |

#### Home & Memory（全部完成）

| 屏 | 文件 | Figma node |
|---|---|---|
| H-01 Home | `features/home/screens/HomeScreen.tsx`（avatarRow 多档案变体 + ProfileSwitcher Sheet → Paywall D + memory=0 empty 态）| `94:349` + `269:800` |
| H-02 Add Memory | `features/memories/screens/AddMemoryScreen.tsx`（Save CTA 渐变 + thumbnail radius 修正 + Paywall B 限额）| `96:384` |
| H-03 Memory List | `features/memories/screens/MemoryListScreen.tsx` | `98:452` |
| H-04 Memory Detail | `features/memories/screens/MemoryDetailScreen.tsx`（highlight card 横向布局 + 路由 bug 修复）| `102:531` |
| H-04 Edit Mode | `features/memories/screens/MemoryEditScreen.tsx` | `102:618` |
| Memory Tags | `features/memories/screens/MemoryTagsScreen.tsx` + `app/memory/tags.tsx` | 自建 |
| Memory Date | `features/memories/screens/MemoryDateScreen.tsx` + `app/memory/date.tsx`（纯 RN 月历）| 自建 |
| Memory Cover | `features/memories/screens/MemoryCoverScreen.tsx` + `app/memory/cover.tsx` | 自建 |

> 路由按 expo-router v4 拆分：`app/memory/[id]/index.tsx` + `app/memory/[id]/edit.tsx`

#### Stories

| 屏 | 文件 | Figma node |
|---|---|---|
| S-01 Stories List | `features/stories/screens/StoriesScreen.tsx`（动态 paywall variant：A=quota / C=ended）| `157:1391` |
| S-02 Story Detail | `features/stories/screens/StoryDetailScreen.tsx`（WebView 三态 loading/loaded/error）| `157:1446` |

#### Highlights

| 屏 | 文件 | Figma node |
|---|---|---|
| HL-01 Highlights Gallery | `features/highlights/screens/HighlightsScreen.tsx`（4 场景 topNotify + count=0 empty 态）| `157:2206` |
| HL-02 Highlight Detail | `features/highlights/screens/HighlightDetailScreen.tsx`（Edit Title Sheet + Remove Confirm）| `157:2225` |

#### Settings（全部完成）

| 屏 | 文件 | Figma node |
|---|---|---|
| ST-01 Settings | `features/settings/screens/SettingsScreen.tsx`（**已接 API**：useMe + useSubscription + useChildren；Paywall C 触发）| `162:856` |
| ST-02A/B Subscription | `features/settings/screens/SubscriptionScreen.tsx`（Free/Premium 双态）| `162:944` + `181:967` |
| ST-03a Child Profile List | `features/settings/screens/ChildProfileListScreen.tsx`（含 0-档案 empty 态）| `164:884` |
| ST-03 Child Profile Edit | `features/settings/screens/ChildProfileEditScreen.tsx` | `164:924` |
| ST-04 Data & Privacy | `features/settings/screens/DataPrivacyScreen.tsx` | `164:991` |
| ST-05 About | `features/settings/screens/AboutScreen.tsx` | `167:924` |
| ST-06 Feedback | `features/settings/screens/FeedbackScreen.tsx` | `167:956` |
| ST-07 Account | `features/settings/screens/AccountScreen.tsx` | `167:980` |

#### Backend API（骨架 + 8 模块完整实现，等 DB 接通即跑）

| 模块 | 文件 | 实现内容 |
|---|---|---|
| 骨架 | `src/index.ts` + `src/lib/{prisma,errors,auth,validation,quota,month}.ts` + `src/types/fastify.d.ts` | Fastify v5 + cors + sensible + zod + auth plugin（dev 模式 `Bearer dev-<userId>` bypass）+ 全局 errorHandler + Prisma singleton + `whereNotDeleted` helper + R-04 advisory_xact_lock helper + monthKey 时区 helper |
| Prisma schema | `prisma/schema.prisma`（11 model）+ `prisma/post-init.sql`（部分索引/GIN/Realtime publication）| 全栈 camelCase via `@map`；users/children/raw_assets/highlights 软删字段；ON DELETE CASCADE/SET NULL 策略明确 |
| `users` | `routes/users.ts` | GET /me（含 linkedProviders）、PATCH /me、DELETE /me（软删）|
| `subscriptions` | `routes/subscriptions.ts` | GET /me（5 态聚合 + isPremium 派生 + benefits）；POST /sync 与 paywall-config 留 TODO |
| `children` | `routes/children.ts` | POST/GET/GET:id/PATCH/DELETE（含 ?hard=true）/POST :id/restore/PATCH /active（**R-05** never_paid 切档拦截）|
| `assets` | `routes/assets.ts` | POST（JSON metadata 路径 + capturedAt 5min 容忍）/GET（cursor 分页 + monthKey 过滤）/GET /trash/GET:id/PATCH（**R-08** 当月才能编辑 + addFiles/removeFiles/reorder 三向互斥）/DELETE（软删 + R-08 历史月禁删）/POST :id/restore |
| `highlights` | `routes/highlights.ts` | POST（**R-04** advisory lock + 配额 + 单/多照 cover 校验）/GET（cursor 分页）/GET:id/PATCH/DELETE（软删 + 同步 is_highlight=false）|
| `stories` | `routes/stories.ts` | GET（current_month + historical 拼接，按 monthKey 序列填充）/GET:id（仅 generated 可读）/GET:id/status |
| `shares` | `routes/shares.ts` | POST（upsert：复用 active token 或新建 randomBytes(32) base64url）/GET /public/:token（无 auth）/DELETE :id（revoke）|
| `tags` | `routes/tags.ts` | GET（8 个预设静态返回）/GET /user/DELETE /user/:name（raw SQL 匹配 LOWER+TRIM unique）|
| `internal` | `routes/internal.ts` | 5 个 stub（enqueue/retry/cancel/queue/jobs/:id）— 等 BullMQ 装好实现 |

#### Mobile API client（已就绪，等 backend 接通即可逐屏迁移）

| 模块 | 文件 | 内容 |
|---|---|---|
| 核心 | `apps/nestory-mobile/api/client.ts` | fetch wrapper + `ApiClientError` + dev mode `Bearer dev-<userId>` token；`setDevUserId()` 切换测试用户 |
| QueryClient | `apps/nestory-mobile/api/queryClient.ts` | 默认 30s staleTime；4xx 不重试；统一 `queryKeys` namespace |
| 8 domain | `apps/nestory-mobile/api/{users,children,assets,highlights,stories,subscriptions,shares,tags}.ts` | 每个模块都有 ① 纯 async functions ② useQuery/useMutation hooks ③ cache invalidation 联动 |
| Provider | `apps/nestory-mobile/app/_layout.tsx` | QueryClientProvider 包根 Stack |
| dev URL 自动 | `apps/nestory-mobile/shared/config.ts` | 用 `expo-constants.hostUri` 拿 dev 机 IP，模拟器/真机自动指 :3001 |
| 样板屏 | `apps/nestory-mobile/features/settings/screens/SettingsScreen.tsx` | 完整转换：useMe + useSubscription + useChildren，loading/error 兜底，expiresAt 格式化 |

---

### 4.2 临时 hack（待后续修）

#### Mobile

- **`features/auth/hooks/useSession.ts` 是 stub** — 用 module-level `_devSession` + `setDevSession()` listener 模式，初始 null（`app/index.tsx` 跳 `/onboarding/welcome`）；SignInScreen 按钮调 `setDevSession({ userId: DEMO_USER_ID })` 假装登录。接 Supabase Auth 时整个文件改成 supabase.auth.onAuthStateChange()
- **`SignInScreen.tsx` 的 Apple/Google 按钮是 demo bypass** — `handleSignIn` 直接 `setDevSession + router.replace('/(tabs)')`，跳过真实 OAuth。接 Supabase 时换成 `signInWithApple` / `signInWithGoogle`
- **`SettingsScreen.tsx` 有 `DEMO_MODE = true` flag** — true 时 me/sub/children 全用本地 mock 常量（never_paid 状态），跳过 useMe/useSubscription/useChildren 的 isLoading/isError 分支。后端起来后翻 false 即恢复 API 模式
- **API client dev token 写死 UUID**：`api/client.ts` 里 `_devUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`；`setDevUserId(id)` 可切换。生产环境必须接 Supabase getSession()
- **mobile 12 个屏仍用 MOCK_***，下个 sprint 按表格逐屏迁移（SettingsScreen 已写好 API 调用但 DEMO_MODE 暂时屏蔽）
- **Apple/Google 图标用 RemixIcon 通用图标**（不是 brand SVG）——可接受
- **`POST /assets` 走 JSON metadata 路径**（不是 multipart）：mobile 必须先把照片传 Supabase Storage 拿 URL，再 POST 到 API。Storage signed URL 流程未做

#### Backend

- **dev mode auth 直接接受 `Bearer dev-<userId>`**（`src/lib/auth.ts`），不验签。生产前必须接 Supabase JWT 验签（jose 库）
- **avatar 上传**：`POST /children` schema 用 `avatarUrl`，不是文档里的 `avatarBase64`。Storage 接通后调整
- **Internal `/internal/*` 5 个 endpoint 是 stub**：等 BullMQ + Redis 装好实装
- **`POST /subscriptions/sync` 是 stub**：等接 RevenueCat（需 webhook secret + last_event_at 乱序保护）
- **`raw_assets.user_id` 一致性靠应用层**：插入路径都走 server，没建 trigger 强制同步 child.user_id
- **`assets` 的 monthKey 过滤是粗筛**（按 UTC 月范围），跨时区边界月可能漏 1-2 条；TODO：generated column

#### 文档

- **API 文档 v1.4 内的 JSON 示例仍有部分 snake_case**（v1.3 遗留）：实现时以 `packages/types/src/` 为准；后续随 endpoint 改造逐步替换

---

### 4.3 未做（按优先级）

#### 🔴 P0 — 阻塞测试 / 联调（等用户做的事）

| 项目 | 备注 |
|---|---|
| **开通 Supabase 项目** | DB（Postgres）+ Auth + Storage 都从这开始；用户尚未抽空开通 |
| **配置 `.env`** | 拿到 Supabase 后填 `DATABASE_URL` / `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` |
| **跑首次 migration** | `pnpm --filter @nestory/api prisma:migrate dev` → 然后跑 `prisma/post-init.sql` |
| **App Store Connect 产品 ID + RevenueCat dashboard** | Plan UI 已就绪，等 vicol 配产品才能接 RevenueCat SDK |

#### 🟠 P1 — Backend 完善（DB 接通后立刻做）

| 项目 | 文件 |
|---|---|
| **接 Supabase JWT 验签** | `src/lib/auth.ts` 把 production 分支实装（jose 库） |
| **`POST /subscriptions/sync`** | RevenueCat webhook：签名校验 + last_event_at 乱序保护 + last_event_id 幂等 |
| **`POST /assets` multipart 路径** | 接 Supabase Storage signed URL；现 JSON 路径只能 dev 用 |
| **avatar 上传 pipeline** | children/users avatar 走 base64 → 后端转存 Storage |
| **BullMQ + Redis 装上** | Story 生成 worker + `/internal/*` 5 endpoint 实装 |
| **AI Pipeline** | Planner / Brief / Generator / Validator —— Story worker 内部消费 |
| **soft-delete cron job** | nightly 清 30 天前 deletedAt 行（users / children / raw_assets / highlights） |
| **audit_log 写入** | login / delete_account / subscription_change 等动作 |
| **rate limit + abuse_log** | upload / paywall trigger 等 endpoint 加限流 |

#### 🟠 P1 — Mobile 接 API（按下表逐屏迁移，hooks 已就绪）

| 屏 | 替换 hook |
|---|---|
| HomeScreen | `useChildren()` + `useSubscription()` + `useAssets({childId, month})` 取 count |
| AddMemoryScreen | `useCreateAsset()` + `useSubscription()` |
| MemoryEditScreen | `useAsset(id)` + `useUpdateAsset(id)` + `useDeleteAsset()` |
| MemoryListScreen | `useAssets({childId, month})` cursor 分页，按日聚合 |
| MemoryDetailScreen | `useAsset(id)` + linkedHighlight 字段 |
| HighlightsScreen | `useHighlights({childId})` + `useSubscription()` |
| HighlightDetailScreen | `useHighlight(id)` + `useUpdateHighlight()` + `useDeleteHighlight()` + `useCreateShare()` |
| StoriesScreen | `useStories({childId})` 一次拿 currentMonth + historical |
| StoryDetailScreen | `useStory(id)` + `useStoryStatus()` |
| SubscriptionScreen | `useSubscription()` |
| ChildProfileListScreen | `useChildren()` + `useDeleteChild()` + `useRestoreChild()` |
| ChildProfileEditScreen | `useChild(id)` + `useUpdateChild(id)` |
| ChildProfileScreen (onboarding) | `useCreateChild()` |

#### 🟡 P2 — 体验细节

- **S-02 Story Detail WebView**：nestory-web `/story/[id]` 还是 Next.js 占位页，需写真实 StoryRenderer
- **app/index.tsx**：现在 `useSession` 永远返回 null，会一直跳 onboarding；接 Supabase 后改读真实 session
- **`subscriptions/paywall-config`**：mobile PaywallModal 已硬编码 headlines/benefits，此 endpoint 是远期 A/B 测试用
- **DeepLink 处理 `/share/:token`**：用户点分享链接进 app 时的兜底跳 web

#### 🟡 P2 — 文档同步

- **API 文档 v1.4 JSON 示例 snake → camel**：随 endpoint 实现逐步改
- **`packages/config/nestory/tags.ts`**：8 个预设 Tag 当前内联在 `apps/nestory-api/src/routes/tags.ts`，N=2 时再抽取（mobile 有自己一份）

#### 后续大块（launch 前必须）

- **App Store Connect IAP 产品配置 + RevenueCat dashboard offerings**（vicol 侧）
- **iOS / Android 签名 + TestFlight 内测包**（参考 `docs/dev/09_环境与CI_v1.0.md`）
- **隐私政策 / 用户协议正式版上线**（AboutScreen 里有 TODO 链接）
- **GDPR 删除 / 导出流程实跑**（DELETE /users/me + audit_log 验证）

---

### 4.4 已知小坑（修过的，避免再踩）

#### 旧坑（之前踩过的）

- pnpm 装到 `D:\Program Files\nodejs\` 没权限 → 用 `npm install -g pnpm` 装到用户 prefix
- Web typecheck 被 mobile 的 React 18 类型污染 → `tsconfig.base.json` 关掉 `declaration`，只 `packages/types` 单独开
- React 19 + Next 15 layout 严格模式下 `ReactNode` 类型错位 → 用 `Readonly<{children: React.ReactNode}>`
- `@babel/runtime` 因 isolated linker 不可见 → mobile 加为 devDep
- Metro 不会 fallback `.js` → `.ts` → 全 workspace 移除内部 `.js` 扩展，统一 `Bundler` moduleResolution
- TS 7.0 `baseUrl` 弃用 → 移除 `baseUrl`，`paths` 自动相对 tsconfig

#### 2026-05-01 新增

- **`pnpm typecheck --force` 失败**：`--force` 透传到 `tsc --noEmit --force`，tsc 不认。改用 `pnpm turbo run typecheck --force`
- **Fastify v5 `decorateRequest`**：第二参数不接受 `null`，要用空字符串 `''` 或省略；类型必须经 declaration merging（`src/types/fastify.d.ts`）
- **`expo-image-picker` 版本与 SDK 52 错配**：`pnpm add expo-image-picker` 装成 `^55.x`，错；要在 mobile 目录下跑 `npx expo install expo-image-picker` 装 `^16.0.6`
- **Prisma schema validate 需要 DATABASE_URL**：本地无 DB 时跑 `DATABASE_URL="postgresql://placeholder@localhost:5432/test" npx prisma validate`
- **Prisma 部分索引 / GIN / Realtime publication 不在 DSL 里**：写在 `prisma/post-init.sql`，`migrate deploy` 后手动 / CI 跑
- **Mobile 字面量类型推断**：`const MOCK_FLAG = 12` 写法 TS 推断为字面 `12` 类型，`=== 0` 判断会被认为 unreachable；显式 `: number` 类型注解
- **Prisma + camelCase**：所有 model 字段 TS 名 camelCase，DB 列名 snake_case via `@map("col_name")`，表名复数 via `@@map("users")`。新增 model 时务必加 `@map`
- **`user_tag_library` UNIQUE 基于 LOWER(TRIM(name))**：Prisma DSL 不支持 functional unique index，post-init.sql 里删默认 unique 约束改建 functional index；插入用 `INSERT ... ON CONFLICT DO NOTHING`

---

## 5. 启动开发

### 5.1 常用命令

```bash
# 全 workspace typecheck（< 2 秒）
pnpm typecheck

# 强制不走 cache 的 typecheck（debug 用）
pnpm turbo run typecheck --force

# 启动 Expo Web
pnpm --filter @nestory/mobile web
# → http://localhost:8081

# 启动 Next.js（H5 占位页）
pnpm --filter @nestory/web dev
# → http://localhost:3000

# 启动 API
pnpm --filter @nestory/api dev
# → http://localhost:3001/health

# Prisma
cd apps/nestory-api
DATABASE_URL="postgresql://placeholder@localhost:5432/test" npx prisma validate
DATABASE_URL="postgresql://placeholder@localhost:5432/test" npx prisma generate
pnpm prisma:migrate            # 需 DATABASE_URL 真实可达
```

### 5.2 Auth 调试（dev 模式）

API 接受 `Authorization: Bearer dev-<userId>` 头：

```bash
# curl 例子
curl http://localhost:3001/users/me \
  -H "Authorization: Bearer dev-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
```

mobile 端默认走相同的 dev token；切测试用户用 `setDevUserId(id)`（`apps/nestory-mobile/api/client.ts`）。

### 5.3 DB 接通后的首次启动顺序

```bash
# 1. 填好 .env DATABASE_URL
cd apps/nestory-api
cp .env.example .env
# 编辑 .env

# 2. 跑首次 migration
pnpm prisma:migrate dev --name init

# 3. 跑 post-init SQL（部分索引 / GIN / Realtime publication）
psql $DATABASE_URL -f prisma/post-init.sql

# 4. 启 API
pnpm dev
```

### 5.4 Mobile 接 API 调试

mobile dev 模式自动通过 `expo-constants.hostUri` 拿 dev 机 IP，在模拟器/真机上访问 `http://<IP>:3001`。

如果在真机上跑，确保：
- 真机和 dev 机同 WiFi
- API 监听 `0.0.0.0` 而不是 `127.0.0.1`（已配置）
- 防火墙允许 3001 端口

---

## 6. 联系 Figma MCP 的方式

新机器配好 Figma MCP 之后，把当前 Figma 文件的 URL 提供给 Claude：

```
https://www.figma.com/design/nwCrXylV5fm1iG7DVfEmGX/07-Nestory_Figma0429?node-id=21-2&p=f
```

- fileKey: `nwCrXylV5fm1iG7DVfEmGX`
- 4 个页面：01 Design System / 02 Main UI / 03 States / 04 Overlays
- 之前抽样过的 node IDs（在 01 Design System 内）：
  - Primary Button Default: `47:461`
  - Premium Button: `47:467`
  - StatusBadge Premium: `263:37`
  - Notify Success/Warning/Error/Info: `40:34 / 40:37 / 40:40 / 41:51`
  - Toast Error: `329:42`
  - Modal/Paywall A: `45:26`
  - Card/Story Empty: `44:4`
  - Font Family 帧: `46:100`

> 02 Main UI / 03 States / 04 Overlays 的 canvas root node ID 还**未确认**。新机器上让用户切到对应页 → `Ctrl+L` 复制 URL。

---

## 7. 备注

- **`.claude/settings.local.json`** 是本地权限偏好文件，建议每台机器独立维护，不入 git
- **`.npmrc`** 已入 git，含 `node-linker=isolated` 等关键配置 —— 不要随便改
- **`docs/dev/old/`** 里是 deprecated 的 v2.0 目录结构方案，参考用，不要复活

---

## 8. 关键决策快速参考（2026-05-01）

完整背景见 `dev/ARCH-DECISIONS-API-DB-20260501.md`，这里只记结论：

| # | 决策 | 影响 |
|---|---|---|
| 1 | **API 边界 camelCase**（DB 列仍 snake_case，`@map` 桥接）| 全栈零序列化层；`packages/types` 是字段权威 |
| 2 | **Subscription 5 态枚举**：`never_paid \| trial_active \| premium_active \| trial_ended \| premium_ended` | 全系统读 `subscription_status` 一字段，前端不再用 `'free'/'premium'` 简化别名 |
| 3 | **types/ 字段补齐**：User.name + linkedProviders[]、Memory.linkedHighlight、Subscription.{billingCycle,benefits,storyQuotaRemaining}、新 topNotify.ts | 见 `packages/types/src/` |
| 4 | **Story 走 BullMQ + `/internal/*`**：cron / milestone / admin enqueue 三触发源；公网无 POST /stories | filter 支持 region / batchSize / dryRun / failed retry；admin token 鉴权 |
| 5 | **双层删除**：软删 30 天恢复（users/children/raw_assets/highlights）+ 硬删 cron / GDPR | API DELETE 默认软删，`?hard=true` 硬删；`POST /:id/restore` 恢复；`GET /:resource/trash` 列 |

### 业务约束 R-** 参考

| 编号 | 规则 | 实现位置 |
|---|---|---|
| R-04 | Free user Highlight ≤ 10，并发用 advisory_xact_lock | `apps/nestory-api/src/lib/quota.ts` |
| R-05 | never_paid 用户不可切换非 active 档案 | `apps/nestory-api/src/routes/children.ts` PATCH /active |
| R-07 | 单 Memory ≤ 10 张照片，单文件 ≤ 10 MB | zod schema + 应用层校验（multipart 接通时实装 magic bytes / EXIF strip） |
| R-08 | 历史月份 Memory 不可编辑 / 删除 | `assets.ts` PATCH/DELETE 用 `isCurrentMonth(capturedAt, tz)` 校验 |
| R-10 | 降级常驻 Notify（不是 toast）| TopNotify 组件读 `subscription_status` 派生 |
