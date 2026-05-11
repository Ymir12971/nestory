# Nestory · 周进度记录

> Sprint 起点：**2026-04-29**（周三）
> 目标 launch：**2026-05-29**（4 周后周五）
>
> 模板见文末 §Appendix；每周新增一节顶到第一个 `---` 上方即可。

---

## Week 2 · 2026-05-06 → 2026-05-12

**主题**：本地端到端打通 — Story pipeline / audit / 防御性导航 / React 18 monorepo 统一

### 关键 commits

| Hash | 日期 | 主题 |
|---|---|---|
| `79a5e73` | 5-10 | `audit_log` + rate limit + `abuse_log` |
| `a196779` | 5-10 | `/internal/stories` 3 stub 实装；Story pipeline MOCK 端到端 |
| `62ea454` | 5-10 | `useGoBack` hook + 23 屏 router.back() 重构（web 刷新 bug） |
| `f9a5604` | 5-10 | React 18 monorepo 统一（nestory-web 19→18 + pnpm.overrides.react-is） |
| `a0b5c34` | 5-09 | Metro symlink + hierarchical lookup（解 pnpm isolated bundle 卡死） |
| `6dd0040` | 5-08 | （小修） |

### 验证里程碑

- **Story pipeline MOCK 端到端**：`POST /internal/stories/generate` → BullMQ → worker → mock generator → Prisma upsert → `GET /stories/:id` 拿到完整 document ✓
- **Audit / Abuse logs**：实际写入 Supabase 验证 — 10 条 `upload_signed`，5 条 `rate_limit_429` ✓
- **Mobile Web bundle**：在 pnpm isolated linker + Metro 0.81 下编译通过 ✓
- **mobile typecheck 4/4 successful**

### 基础设施修

| 问题 | 修法 |
|---|---|
| Mobile bundle "Objects are not valid as a React child"（`_store` 错误） | 把 nestory-web 从 React 19 降到 18 — Next 15 支持 18 || 19，nestory-web 又是占位页，无 React-19-only 功能。同时根 `pnpm.overrides.react-is = "18.3.1"` 收尾。 |
| pnpm isolated 下 Metro 找不到 `expo-modules-core` / `react-native-helmet-async` | `unstable_enableSymlinks: true` + 保留 hierarchical lookup（Metro 0.81+） |
| BullMQ 拒 Redis 3.2（Windows 原生服务占 6379） | 起独立 `nestory-redis` Docker 容器在 6380 |
| Prisma 连 Supabase 直连域名（IPv6-only）在 IPv4 网络失败 | 切到 **Session pooler** (`aws-1-ca-central-1.pooler.supabase.com:5432`) |
| Anthropic key 未配但要测 worker 链路 | `STORY_AI_MOCK=1` 让 generator 走确定性 mock |

### 决策记录

- **React 18 monorepo 单版本**（[memory](../../../memory/project_react_version_unification.md)） — nestory-web 暂留 18 直到需要 React-19-only 功能或 Expo 升 SDK 54+
- **Session pooler** 替代 direct connection — 既解 IPv6 问题也是 Railway 部署需要

### Blockers / 风险

- 🔴 Apple Dev 账号、Google OAuth 公司账号 admin 权限未到位 — 阻塞真 OAuth + RevenueCat + TestFlight
- 🟠 Anthropic API key 未配 — 故事质量当前仅 mock 级别
- 🟢 Docker Desktop 偶发关闭导致 Redis 容器停 — 重启 Docker 即可

### Week 3 候选

按"不依赖外部账号"优先：
1. 部署 API → Railway + nestory-web → Vercel
2. nestory-web Story Renderer 真页面（替换占位）
3. 隐私政策 + 服务条款正式版（App Store 必须）
4. 浏览器实际跑 demo flow → bug list
5. soft-delete cron + DeepLink `/share/:token`

---

## Week 1 · 2026-04-29 → 2026-05-05

**主题**：从零到本地端到端就绪 — Monorepo / Mobile UI / Backend API / DB

### 关键 commits

| Hash | 日期 | 主题 |
|---|---|---|
| `4c510e0` | 4-29 | Monorepo 底座（apps/{mobile,web,api} + packages/types + turbo + pnpm） |
| `ebc088a` | 4-30 | Mobile 完整 UI 层 — 41 个 Figma frame 全部落地 |
| `c2d9835` | 5-01 | API/DB 基础 — Fastify + Prisma 11 model + 8 endpoint + Mobile API client (tanstack-query) |
| `5435928` | 5-01 | Settings 3-state subscription entry 等 UI 收尾 |
| `b9af930` | 5-01 | SplashScreen font-error fallback + expo-image-picker |
| `0f4b606` | 5-03 | Handoff snapshot — DB live, API verified, mobile bundle blocked |

### 单日产出（按字数）

- 4-29: 1 commit, **~12k 行**（monorepo 模板）
- 4-30: 2 commits, **~8k 行**（mobile UI）
- 5-01: 15 commits, **~5k 行新功能 + 多个 UI 像素对齐 / fallback 小修**
- 5-02: 离线
- 5-03: 2 commits（DB 接通日 — Supabase 12 张表 migrate + seed）
- 5-04 ~ 5-05: 离线

### 验证里程碑

- Supabase DB 12 张表迁移完成 + post-init.sql（部分索引 / GIN / Realtime publication）
- API `GET /subscriptions/me` 走 dev-token 链路从 mobile → API → Prisma → Supabase 真返回 seed 数据 ✓
- Mobile API client 全 8 个 domain hooks 就绪（tanstack-query）

### Blockers / 风险（当时）

- 🔴 Mobile Web bundle 启不来（pnpm + Metro + React 19 leak 三方互踩） — Week 2 解决
- 🔴 Anthropic key 缺
- 🟠 Apple Dev / Google Play 注册延后到 5-10 那周

### 决策记录

- [Vicol sync 2026-05-01](../../../memory/project_vicol_sync_20260501.md) — delete=hard delete / H-04 read-only banner / Subscription text 不改
- [Deployment](../../../memory/project_deployment_decisions.md) — Vercel + Railway 从 day 1；单 Supabase 项目至 TestFlight 前一周
- [External account schedule](../../../memory/project_external_account_schedule.md) — Apple/Google 注册推迟到 5-10 周
- [Architecture philosophy](../../../memory/feedback_pragmatic_architecture.md) — defer abstraction until N=2

---

## 累计状态（每周末更新）

### 系统状态（截至 Week 2 末）

| 系统 | 状态 |
|---|---|
| 🟢 Mobile UI（41 屏） | 全落地 + 全部接 API hooks |
| 🟢 Mobile Web bundle | 编译通 + 跑通（dev session bypass） |
| 🟢 Backend API | 8 个 endpoint 模块 + 5 个 /internal + uploads/sign + auth + audit + rate limit |
| 🟢 Database | Supabase 12 张表 + seed + post-init 索引 + RLS |
| 🟢 Storage | Supabase Storage memories / avatars buckets + signed URL 流程 |
| 🟢 Story Pipeline | BullMQ + worker + cron dispatcher + MOCK generator 端到端 |
| 🟢 Audit / Abuse logs | 写入 + 查询验证 |
| 🟡 Mobile session | dev bypass，未接真 OAuth |
| 🟡 nestory-web | Next.js placeholder，Story Renderer 未写 |
| 🟡 AI 真生成 | 仅 mock；Anthropic key 未配 |
| 🔴 部署 | API/web 都还在 localhost |
| 🔴 Apple/Google OAuth | 账号未注册 |
| 🔴 RevenueCat | webhook stub 未实装 |
| 🔴 隐私政策 / 服务条款 | 链接是 placeholder URL |

### Burn-up

| Week | 累计代码（含模板） | 主要里程碑 |
|---|---|---|
| 1 | ~28,000 行 | Monorepo + Mobile UI + Backend + DB |
| 2 | +~700 行（已大量去重 / 整合） | Pipeline 端到端 + 防御性修复 + React 单版本 |

---

## Appendix · 周记录模板

```markdown
## Week N · YYYY-MM-DD → YYYY-MM-DD

**主题**：一句话本周重点

### 关键 commits

| Hash | 日期 | 主题 |
|---|---|---|

### 验证里程碑

- 可观察 / 可点击 / 可测的产出，**不是**代码量

### 基础设施修

| 问题 | 修法 |
|---|---|

### 决策记录

- 链接到 memory/ 里相应文件，或简述决策内容 + why

### Blockers / 风险

- 🔴 / 🟠 / 🟢 按严重度

### 下周候选

- 排序的待办池
```
