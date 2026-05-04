# 真实开发启动手册（2026-05-01 起）

> 状态文档，活更新。Last verified: **2026-05-02** · `pnpm typecheck` 4/4 全绿。

---

## 1 · 当前状态

### ✅ 已落地（端到端可跑）

- **Vicol sync 决策（2026-05-01）已全部实现** — 见 `docs/sync-to-vicol.md`
  - Memory / Highlight 删除走硬删（不做 Trash UI）
  - H-04 Read Only 黄色 banner 已对齐 Figma 102:573
  - 订阅文案 / 颜色 token / Welcome 渐变保持现状
  - Remix Icon 在 Android 走 SVG 矢量，无平台差异

- **前后端 contract 审计 9 项已修**（详见 `§ 5 已修条目`）

- **Demo seed + DB bootstrap 完成**
  - Supabase dev DB 已建表（`prisma db push` 一次性同步）
  - `post-init.sql` 已应用（GIN / 部分索引 / Realtime publication）
  - `prisma/seed.ts` 灌入 demo user/child/subscription 成功

- **API server 接入真实 DB 跑通**
  - `localhost:3001/health` ✓
  - `/users/me` / `/children` / `/subscriptions/me` 用 demo bearer token 全部返回正确数据

- **mobile 屏幕拆 mock — 整条 Profile 链路已实数据**
  - `SettingsScreen` ✅ `useMe` / `useSubscription` / `useChildren`
  - `ChildProfileScreen`（onboarding step 3） ✅ `useCreateChild`
  - `ChildProfileListScreen` ✅ `useChildren`
  - `ChildProfileEditScreen` ✅ `useChild(id)` + `useUpdateChild`（wrapper + EditForm split，`key={child.id}` 强制 remount）
  - `HomeScreen` ✅ `useChildren` / `useSubscription` / `useStories`；`useSetActiveChild` 切换 active
  - 端到端验证：onboarding 创建 → settings list 显示 → edit 更新 → home 显示 → 全程真数据，无 mock

### ⏳ 仍是 mock / 待接

- `MemoryDetailScreen` — `MOCK_MEMORY`（阻塞：尚无真实 memory，需先做 photo upload）
- `MemoryEditScreen` / `HighlightDetailScreen` / 各 Story 屏
- `AddMemoryScreen` — 阻塞：photo upload 未做
- `SignInScreen` 假 OAuth（`setDevSession` → 路由到 onboarding/profile）
- `client.ts.getAuthToken()` `__DEV__` 返 `dev-<userId>` 假 token
- 后端 `auth.ts` `__DEV__` 直接从 token 提 userId

---

## 2 · 启动真实开发的步骤

### 2.1 配 `.env`

```bash
cp apps/nestory-api/.env.example apps/nestory-api/.env
```

填这几个：

| 字段 | 来源 |
|---|---|
| `DATABASE_URL` | Supabase dev → Settings → Database → Connection string → **Direct connection** |
| `SUPABASE_URL` | Supabase dev → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase dev → Settings → API → `service_role`（**别放 mobile**） |

`REDIS_URL` / `OPENAI_API_KEY` / `REVENUECAT_WEBHOOK_SECRET` 第一天不必填。

### 2.2 DB bootstrap（首次）

⚠️ Supabase 预装了 `pg_stat_statements` / `pgcrypto` / `supabase_vault` / `uuid-ossp` 4 个扩展，`prisma migrate dev` 第一次会因 drift 拒跑。**首次走 `db push`**：

```bash
cd apps/nestory-api
pnpm exec prisma db push --skip-generate
pnpm exec prisma db execute --file prisma/post-init.sql --schema prisma/schema.prisma
```

**`db push` 不建 migration history**，适合 greenfield。等后续要追踪 schema 演进时再切回 `prisma migrate dev`。

### 2.3 灌 demo seed

```bash
pnpm db:seed
```

或等价的 `pnpm --filter @nestory/api prisma:seed`。

预期输出：
```
Seeding demo data → db.<host>.supabase.co:5432/postgres
Demo seed completed
  User:  aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee  (Demo User · never_paid)
  Child: bbbbbbbb-cccc-dddd-eeee-ffffffffffff  (Emma · active)
```

upsert 幂等。要清空：
```sql
DELETE FROM users WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
-- CASCADE 自动清下游（children / subscription / memories / highlights / stories）
```

### 2.4 起 API + Mobile

```bash
pnpm --filter @nestory/api dev    # 终端 1：API on :3001
pnpm demo                         # 终端 2：mobile 在 :8081（Expo Web）
```

浏览器 `http://localhost:8081` → Welcome → SignIn → Apple/Google → 进 onboarding 或 home tab。

---

## 3 · 已知坑点（避免重复踩）

| 坑 | 现象 | 解 |
|---|---|---|
| `prisma migrate dev` 在 Supabase 上 drift | 报"reset DB"要求 | 用 `db push` 替代（首次 bootstrap） |
| `pnpm prisma:seed` 找不到 DATABASE_URL | `tsx` 不读 `.env` | 改用 `prisma db seed`（已配置在 `package.json#prisma`）|
| API server 报 `Environment variable not found: DATABASE_URL` | `tsx watch` 不读 `.env` | scripts 已加 `--env-file=.env`（Node 22 原生）|
| Settings 页 `Failed to load settings` + Network CORS 错误 | API 返回 `:3000` 但 mobile 在 `:8081` | `.env` 的 `CORS_ORIGIN=http://localhost:8081`（`.env.example` 已默认对了）|
| ChildProfile wheel picker 滚动不响应 | `onMomentumScrollEnd` 在 web 鼠标滚轮不触发 | 用 `onScroll` + 120ms idle 定时器替代 |
| ChildProfile step 2 Weight 被截 | spacer + ScrollView 都 flex:1 | spacer 仅 step 0/1 渲染 |
| ChildProfileEdit 显示错的 child 数据 | 异步 `useChild(id)` 第一帧返 undefined，`useState(initial)` 锁死成默认 | wrapper 等数据 → 渲染 EditForm 子组件，`key={child.id}` 让数据变化时 remount |
| HomeScreen 切 active child 报类型错 | `useSetActiveChild.mutate({childId})` 是猜的；hook 实际签名 `(string)` | 改成 `setActive.mutate(id)` |

---

## 4 · 待办清单

### 本周（Apr 29 – May 5）— 接通真实链路

- [x] ~~配 `.env` + 跑 migrate + seed~~
- [x] ~~关 `SettingsScreen.DEMO_MODE`~~
- [x] ~~接 `ChildProfileScreen` POST /children~~
- [x] ~~接 `ChildProfileListScreen` GET /children~~
- [x] ~~接 `ChildProfileEditScreen` GET + PATCH /children/:id~~
- [x] ~~接 `HomeScreen` 的 children / subscription / stories~~
- [ ] 接 `MemoryDetailScreen` GET /assets/:id — **阻塞**，要等 photo upload 跑通才有真数据可读
- [ ] **AddMemoryScreen + photo upload 到 Supabase Storage** — 解锁后续 memory / highlight / 头像所有链路

### 下周（May 6 – May 12）— 编辑 / 删除 / Highlight 链路

- [ ] `MemoryEditScreen` PATCH /assets/:id
- [ ] `HighlightDetailScreen` DELETE /highlights/:id
- [ ] HL-02 mark / unmark 流程
- [ ] **Photo upload 到 Supabase Storage** — 阻塞项；当前所有 avatar / memory file 字段都没法塞真实 URL，POST 时会跳过

### 后续（May 13+）— OAuth / Story 生成

- [ ] Supabase Auth：替换 `setDevSession` + 后端 JWT 验签
- [ ] `LinkedProvider` 表的 OAuth 回写
- [ ] Story 生成 worker（BullMQ + OpenAI）
- [ ] RevenueCat 集成 + `POST /subscriptions/sync` + paywall-config
- [ ] 30 天软删 cron（见 § 7）

---

## 5 · 已修条目索引

### Vicol Sync（2026-05-01）

| 条目 | 改动 | 文件 |
|---|---|---|
| Q5 删除改硬删 | R-08 检查前移；highlight 物理删；mobile 默认 hard=true | [assets.ts](../../apps/nestory-api/src/routes/assets.ts) · [highlights.ts](../../apps/nestory-api/src/routes/highlights.ts) · [api/assets.ts](../../apps/nestory-mobile/api/assets.ts) |
| Q6 H-04 Read Only banner | 黄色 Notify banner，对齐 Figma 102:573 | [MemoryDetailScreen.tsx](../../apps/nestory-mobile/features/memories/screens/MemoryDetailScreen.tsx) |
| Q7 / Q1 / Q2 / 图标 | 文档确认，无需改动 | — |

### Contract Audit（共 9 项）

| # | 改动 | 文件 |
|---|---|---|
| 1 | StoryStatus 加 `'queued'` / `'generated'`，移除 `'completed'` | [story.ts](../../packages/types/src/story.ts) |
| 2 | POST /highlights 返回 `meta: { highlightCount, highlightLimit }`；mobile 解构 `{ highlight, meta }` | [highlights.ts](../../apps/nestory-api/src/routes/highlights.ts) · [api/highlights.ts](../../apps/nestory-mobile/api/highlights.ts) |
| 3 | `PresetTag` 改为 `string` 别名（与实际响应对齐） | [tag.ts](../../packages/types/src/tag.ts) |
| 4 | `serializeChild` 注入 `activeChildId`；POST 自动激活首个 child | [children.ts](../../apps/nestory-api/src/routes/children.ts) |
| 6 | `ChildCreate.avatarBase64` → `avatarUrl` | [child.ts](../../packages/types/src/child.ts) |
| 7 | POST/PATCH /assets 显式抛 `EMPTY_MEMORY`（替换 zod refine） | [assets.ts](../../apps/nestory-api/src/routes/assets.ts) |
| 8 | PATCH/DELETE /assets 历史月份保护改用 `MEMORY_EDIT_RESTRICTED` | [assets.ts](../../apps/nestory-api/src/routes/assets.ts) |
| 9 | PATCH /assets zod 删除死字段 `isHighlight` | [assets.ts](../../apps/nestory-api/src/routes/assets.ts) |
| 13 | tags trim + 大小写不敏感去重；POST/PATCH 写入前归一 | [assets.ts](../../apps/nestory-api/src/routes/assets.ts) |

### Mobile 拆 mock（2026-05-02）

| 屏 | 改动 | 文件 |
|---|---|---|
| SettingsScreen | 移除 `DEMO_MODE` 与 `DEMO_ME / DEMO_SUB / DEMO_CHILDREN`；改用 `useMe` / `useSubscription` / `useChildren` 真实结果；加 loading + error 兜底 | [SettingsScreen.tsx](../../apps/nestory-mobile/features/settings/screens/SettingsScreen.tsx) |
| ChildProfileScreen | 接 `useCreateChild`；`buildBody()` 拼装 `ChildCreate`；`saveAndGo()` 统一保存+导航；step 0 name guard；Continue / Skip / Add Another Child 三处都触发 POST | [ChildProfileScreen.tsx](../../apps/nestory-mobile/features/onboarding/screens/ChildProfileScreen.tsx) |
| ChildProfileScreen wheel picker | `onMomentumScrollEnd` 在 web 不触发 → 改 `onScroll` + 120ms idle 检测 | 同上 |
| ChildProfileScreen step 2 layout | spacer + ScrollView flex 竞争 → spacer 仅 step 0/1 渲染 | 同上 |
| ChildProfileScreen 单位切换 | height/weight 共用 `unitSystem` → 拆成 `heightSystem` + `weightSystem` | 同上 |
| ChildProfileListScreen | 移除 `MOCK_PROFILES`；改 `useChildren()`；加 loading / error / empty 三态；`formatBirthDate` 渲染 "Born Mar 15, 2025" | [ChildProfileListScreen.tsx](../../apps/nestory-mobile/features/settings/screens/ChildProfileListScreen.tsx) |
| ChildProfileEditScreen | 移除 `MOCK_PROFILE`；wrapper（`useChild(id)` 加载守卫）+ `EditForm` 子组件，`key={child.id}` 强制 remount；提交走 `useUpdateChild(id)` PATCH，gender / height / weight 条件拼 body | [ChildProfileEditScreen.tsx](../../apps/nestory-mobile/features/settings/screens/ChildProfileEditScreen.tsx) |
| HomeScreen | 移除 `MOCK_PROFILES` / `MOCK_IS_PREMIUM` / `MOCK_MEMORY_COUNT`；`useChildren` 选 active → `useStories({childId})` 取 memoryCount；`useSubscription` 推 isPremium；`useSetActiveChild` 接 profile 切换；`formatAge` 月转年；profile stats card → push `/settings/profiles/[id]` | [HomeScreen.tsx](../../apps/nestory-mobile/features/home/screens/HomeScreen.tsx) |

### 工具链 / 配置

| 改动 | 原因 |
|---|---|
| `prisma/schema.prisma` 加 `pg_stat_statements / supabase_vault / uuid_ossp` 三个扩展声明 | 否则 Supabase 已有的扩展触发 migrate drift |
| `package.json#prisma:seed` 改用 `prisma db seed` 而非 `tsx prisma/seed.ts` | tsx 不自动加载 `.env` |
| `package.json#dev` / `start` 加 `--env-file=.env` | Node 22 原生支持，免装 dotenv |
| `package.json#prisma` 顶层加 `{ "seed": "tsx prisma/seed.ts" }` 配置 | 让 `prisma db seed` 找得到入口 |
| 根 `package.json` 加 `db:seed` 快捷 | 一行命令重置 demo 数据 |
| `.env.example` 把 `CORS_ORIGIN` 默认值从 `:3000` 改成 `:8081` | 默认匹配 Expo Web 端口，新机 onboard 不踩 CORS 坑 |

---

## 6 · 仍未处理的 audit 项

按"等待依赖"分组，后续触发条件触达时再处理：

| # | 标题 | 触发条件 |
|---|---|---|
| 5  | `POST /subscriptions/sync` + paywall-config 当前 501 | RevenueCat 集成 sprint |
| 10–12, 17–18 | DELETE response shape / cursor / 路径命名等文档与实现漂移 | 下次更新 `docs/dev/05_Nestory_API设计v1.3.md` 时同步 |
| 14 | `deletedAt` 暴露策略 | Vicol 决定 children/users 是否还做软删 |
| 15 | `GET /children/trash` 缺失 | 同上 |
| 19 | `Subscription.status` 字段命名重复 | 接 RevenueCat 时统一 |
| 20 | `User.name` 非空但 OAuth 未接入 | OAuth 集成 sprint（已通过 seed 缓解） |
| 21–22 | `daysUntilGeneration` 写死 7 / `memoryCount` 永远 null | Story 生成 worker 实现时一起做 |
| 25 | `LinkedProvider.providerUserId` 未暴露 | Settings · Account 解绑 UI 时再补 |

---

## 7 · 提醒 · cron 仍未实现

软删基础设施（schema 字段 + 索引）已就绪，**但 30 天清理 cron 还没写**：
- 无 SQL 清理脚本 / 无 Node worker / 无 Railway cron / 无 pg_cron
- ARCH-DECISIONS 文档第 7 步，预计 1 天工作量
- Memory / Highlight 已改硬删，cron 影响面收窄到 users / children
- 优先级：等 OAuth 接入有真实账号删除流程后再做

---

## 8 · 工作流约定（lessons learned）

- **接每屏前先拉 Figma**：`mcp__figma__get_design_context` 用对应 node ID（见 `docs/dev/10-Nestory_FigmaScreenInventory_v1.0.md`）。注释通常在响应里以 `data-annotations` 出现，**不是每屏都有**，但拿到了能省返工。
- **DB schema 改动后**：跑 `pnpm exec prisma generate` 重新生成 client；`tsc --noEmit` 验证不破坏 types。
- **Mobile 改 contract**：先在 `packages/types/` 改类型，typecheck 会 surface 所有受影响的调用点。
