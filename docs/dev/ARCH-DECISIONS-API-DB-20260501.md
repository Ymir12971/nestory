# API & DB 设计决策（补充）

**日期：** 2026-05-01
**参与方：** Justin（开发）
**状态：** 已确认，进入实施
**关联文档：** `04_Nestory_数据库设计v1.7.md`、`05_Nestory_API设计v1.3.md`、`ARCH-DECISIONS-20260425.md`

---

## 背景

文档 v1.7 / v1.3 已存在，但 `apps/nestory-api/` 仍是 stub（仅 `/health`），`prisma/schema.prisma` 仅占位 User model。审计发现：

- API 端命名约定与 types/ 不一致（snake_case vs camelCase）
- subscription 枚举三处用法各异
- mobile 用了 types/ 里没有的字段（User.name、linkedProviders 等）
- Story 生成入口未在文档定义
- ON DELETE 规则不完整

本文档锁定 5 项决策，作为 schema 与 endpoint 实现的输入。

---

## 决策 1：API 边界统一 camelCase

**决策：** 所有 API 请求/响应、DB 列名（通过 Prisma `@map`）、TS 类型层全部使用 `camelCase`。

**理由：**
- 全栈 TS，无序列化层 = 零转换成本
- mobile MOCK_* 与 `packages/types` 已是 camelCase，改它们成本更高
- DB 列名物理仍是 snake_case（PostgreSQL 习惯），由 Prisma `@map` 自动映射

**影响：**
- `05_API设计v1.3.md` 中所有响应示例字段（`cover_orientation`、`month_key`、`is_last_free_story` 等）需改成 camelCase
- DB 列名保持 snake_case，例：`Highlight model { coverFileId String @map("cover_file_id") }`

---

## 决策 2：Subscription 5 态枚举

**决策：** 全局采用 `packages/types/src/subscription.ts` 中的命名：

```typescript
type SubscriptionStatus =
  | 'never_paid'      // 从未付费过
  | 'trial_active'    // 试用中
  | 'premium_active'  // 已付费有效
  | 'trial_ended'     // 试用结束未续
  | 'premium_ended';  // 付费过期未续
```

**理由：**
- mobile mock 里的 `'free' | 'trial' | 'premium'` 是简化别名，但和 `_ended` 后缀不对称（`free` 没对应 `free_ended`）
- types 版本对称且语义明确（`never_paid` 区分于 `trial_ended`，后者意味着曾经体验过 Premium，paywall 文案不同）
- R-05 切档限制基于 `never_paid`，不能简化掉

**影响：**
- mobile 所有 `MOCK_SUB_STATUS` / `SubStatus` 类型重命名（5 处）
- TopNotify / SubscriptionScreen / SettingsScreen / HighlightsScreen / AddMemoryScreen / StoriesScreen 的状态判断改名

---

## 决策 3：types/ 字段补齐

新增/补字段至 `packages/types/src/`：

| 文件 | 新增 |
|---|---|
| `user.ts` | `name: string`（用户显示名） |
| `user.ts` | `linkedProviders: LinkedProvider[]`（OAuth 绑定列表） |
| `user.ts` | 新接口 `LinkedProvider { provider: 'apple' \| 'google'; providerEmail: string \| null; connectedAt: ISO }` |
| `asset.ts` | `Memory.linkedHighlight: { id: string; title: string \| null } \| null`（M-04 详情页要展示）|
| `subscription.ts` | `billingCycle: 'yearly' \| 'monthly' \| null` |
| `subscription.ts` | `benefits: string[]`（ST-02B 显示当前 plan benefit 列表）|
| `subscription.ts` | `storyQuotaRemaining: number \| null`（Free `'2 Stories remaining'`，Premium `null`）|
| **新文件** `topNotify.ts` | 把 `TopNotifyStatus` 从 `apps/nestory-mobile/shared/components/TopNotify.tsx` 移到 packages，后端要返回此枚举 |

---

## 决策 4：Story 走 BullMQ + 内部控制平面

**触发源：**
1. **月末 cron**：`0 23 28-31 * *`，到月最后一天 23 点入队当月 stories
2. **Milestone 触发**：用户加入第 N 个 memory 时 server-side hook 入队（具体阈值待 PM 定）
3. **管理员手动**：调 `/internal/stories/enqueue`
4. **失败重试**：BullMQ 内置 exponential backoff（5 次：1s/5s/30s/2m/10m）

**状态机：** `pending → queued → generating → generated`，失败转 `failed`

**内部 endpoint（`/internal/*` 前缀，admin token，不暴露给 client）：**

| Method | Path | 作用 |
|---|---|---|
| POST | `/internal/stories/enqueue` | 批量入队 |
| POST | `/internal/stories/retry` | 重试失败任务 |
| POST | `/internal/stories/cancel` | 取消队列任务 |
| GET  | `/internal/stories/queue` | 队列状态总览 |
| GET  | `/internal/stories/jobs/:id` | 单任务详情 |

**filter 维度（区域 / 数量 / 重试 全可控）：**

```typescript
{
  // 区域
  countries?: string[];
  timezones?: string[];
  userIds?: string[];
  childIds?: string[];
  cohort?: 'beta' | 'production';

  // 数量 / 限速
  batchSize?: number;
  maxJobsPerMinute?: number;

  // 重试
  status?: 'failed';
  failedSince?: string;       // ISO8601
  attemptsBelow?: number;

  // 月份
  monthKey?: string;          // YYYY-MM | 'current' | 'previous'

  dryRun?: boolean;
}
```

**Worker 责任：**
- 加 `pg_advisory_xact_lock(child_id, month_key)` 防并发
- 检查 `STORY_ALREADY_EXISTS`（DB 已 `generated` 就跳过）
- 拉 memories → LLM 生成 → 写 `story_document` → 标 `generated`
- Supabase Realtime publication 自动推送 mobile

**错误码归属：**
- `STORY_ALREADY_EXISTS`：worker 内部，乐观锁拒绝重复入队
- `STORY_READ_ONLY`：从 stories 模块**移到 assets 模块**，由 `PATCH /assets/:id` / `DELETE /assets/:id` 在 R-08 命中时返回（历史月份 memory 不可编辑）

**没有 `POST /stories`（公网 API）。** 文档 v1.3 错误码表对应处需注释。

---

## 决策 5：双层删除（软删 + 硬删）

### 概念

| 层 | 触发 | 行为 | 可恢复 |
|---|---|---|---|
| **软删** | 用户主动 / 管理员 hide | UPDATE `deleted_at = now()`，APP 隐藏 | ✅ 30 天内 |
| **硬删** | cron 30 天后 / admin force / GDPR | DELETE + CASCADE | ❌ |

### 各表策略

| 表 | 软删 | 硬删 | FK 行为 |
|---|---|---|---|
| `users` | ✅ 注销账户 30 天恢复窗 | ✅ cron / admin / GDPR | — |
| `children` | ✅ 误删恢复 | ✅ CASCADE 跟 user purge | `user_id` ON DELETE CASCADE |
| `raw_assets` | ✅"最近删除"30 天 | ✅ CASCADE 跟 child purge | `child_id` ON DELETE CASCADE |
| `asset_files` | ❌ 跟随 raw_assets | ✅ CASCADE | `asset_id` ON DELETE CASCADE |
| `highlights` | ✅ 取消 highlight | ✅ CASCADE | `user_id` + `asset_id` ON DELETE CASCADE |
| `stories` | ❌ 历史只读 | ✅ CASCADE | `child_id` ON DELETE CASCADE |
| `story_shares` | ❌ TTL 自然失效 | ✅ CASCADE | `story_id` ON DELETE CASCADE |
| `subscriptions` | ❌ 财务历史 | ✅ CASCADE 跟 user purge | `user_id` ON DELETE CASCADE |
| `audit_log` | ❌ 永不删 | ❌ user 被 purge 后 user_id 置 NULL | `user_id` ON DELETE SET NULL |
| `abuse_log` | ❌ 永不删 | ❌ 同上 | `user_id` ON DELETE SET NULL |
| `user_tag_library` | ❌ 用户标签直接删 | ✅ CASCADE | `user_id` ON DELETE CASCADE |

### API 语义

```
DELETE /assets/:id           → 软删（移入"最近删除"）
DELETE /assets/:id?hard=true → 硬删（仅管理员或"最近删除"页二次确认）
POST   /assets/:id/restore   → 恢复软删
GET    /assets/trash         → 列"最近删除"
```

### Prisma 实现

- 每张支持软删的表加 `deletedAt DateTime? @map("deleted_at")`
- Prisma middleware 全局拦截 `findMany / findUnique / count / aggregate`，自动加 `WHERE deleted_at IS NULL`
- 显式查 trash 用 `prisma.$queryRaw` 或 middleware 旁路标志

### Cron 清理

```sql
-- 每日凌晨 02:00
DELETE FROM users WHERE deleted_at < now() - INTERVAL '30 days';
-- CASCADE 链自动清下游
DELETE FROM raw_assets WHERE deleted_at < now() - INTERVAL '30 days';
-- 单条 memory 软删过期
```

### `raw_assets.user_id` 冗余列

**保留**。理由：quota 查询、审计 query 不用 join children 即可拿 user_id。需用 trigger 或应用层保证它和 `child.user_id` 一致；插入路径只走 server，可控。

---

## 文档同步项（实施时一并改）

| 文件 | 修改 |
|---|---|
| `04_数据库设计v1.7.md` | `users` 表加 `updated_at`；所有表加 `deleted_at`（按上表）；`raw_assets.user_id` 注明 ON DELETE CASCADE；用户内容表的 FK 行为补全 |
| `05_API设计v1.3.md` | Base URL 端口改 `:3001`（与代码对齐）；模块索引修正接口数（assets 4 / tags 模块加进去）；附录 B 删 `downgrade_toast` 残留；所有 JSON 字段名改 camelCase；移除 `POST /stories`，把 `STORY_READ_ONLY` 错误码挪到 assets 模块 |
| `packages/types/src/` | 见决策 3 |
| `apps/nestory-mobile/` | subscription 状态名重命名（决策 2）；`TopNotifyStatus` 从 `shared/components/TopNotify.tsx` import 改成从 `@nestory/types` |

---

## 实施顺序

1. **types/ 改造**（决策 2 + 3）— 半天
2. **Prisma schema 全量重写**（11 表 + indexes + soft delete + FK rules）— 1 天
3. **初次 migration + Supabase Realtime publication**（决策 5 cron 暂用 SQL，BullMQ 之后接）— 半天
4. **Fastify 骨架**（auth middleware、error handler、zod 校验工具、路由分模块）— 1 天
5. **按 mobile MOCK 倒推 endpoint 优先级**：children → assets → stories → highlights → subscriptions → shares — 5-7 天
6. **BullMQ + 内部控制平面**（决策 4）— 2 天
7. **删除策略实现**（Prisma middleware + cron + restore endpoint）— 1 天
8. **文档同步**（一边写代码一边改 md）

总计 12-14 天，剩 14-16 天给前后端联调 + AI pipeline + Submission。
