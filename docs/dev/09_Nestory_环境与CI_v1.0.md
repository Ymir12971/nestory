# Nestory — 环境、签名、CI/CD 与监控

**版本：** v1.0
**日期：** 2026-04-25
**依赖文档：** 03_2 目录结构 v2.0 · 06 安全与合规 v1.0 · ARCH-DECISIONS-20260425
**编写者：** Justin

---

## 1. 环境列表

| 环境 | 用途 | 数据 | 触发 |
|---|---|---|---|
| `local` | 开发机 | docker-compose 跑 PostgreSQL + Redis | 本地 |
| `preview` | PR 预览（每个 PR 自动起） | 共享 staging DB（隔离 schema） | PR open / push |
| `staging` | 集成测试 + 内测 | 独立 DB，每周日重置 | merge to `main` |
| `production` | 线上 | 生产 DB | 手动 promote staging build（按下 GitHub Actions deploy 按钮） |

---

## 2. 环境变量清单

### 2.1 apps/nestory-api

| 变量 | 含义 | 来源 |
|---|---|---|
| `NODE_ENV` | `development` / `staging` / `production` | Railway |
| `PORT` | API 监听端口 | Railway 自动注入 |
| `DATABASE_URL` | PostgreSQL 连接串 | Supabase 提供 |
| `DIRECT_URL` | Prisma migration 用的直连串（绕过 pgBouncer） | Supabase |
| `REDIS_URL` | BullMQ 队列 + rate limit 用 | Railway Redis 插件 |
| `SUPABASE_URL` | Supabase 项目 URL | Supabase |
| `SUPABASE_ANON_KEY` | 公开 anon key（仅做 JWT 校验用） | Supabase |
| `SUPABASE_SERVICE_KEY` | 服务端密钥（绕过 RLS） | Supabase（**敏感**） |
| `SUPABASE_JWT_SECRET` | JWT 签名校验 | Supabase |
| `SUPABASE_STORAGE_BUCKET` | 默认 bucket 名 | 配置 |
| `OPENAI_API_KEY` | OpenAI 调用 | OpenAI（**敏感**） |
| `OPENAI_MODEL` | 默认模型名（如 `gpt-4o-2024-08-06`） | 配置 |
| `REVENUECAT_API_KEY` | RevenueCat 服务端 key | RevenueCat（**敏感**） |
| `REVENUECAT_WEBHOOK_SECRET` | webhook 签名校验 | RevenueCat（**敏感**） |
| `NESTORY_API_INTERNAL_KEY` | web ↔ api 内部调用鉴权 | 自生成（**敏感**） |
| `SENTRY_DSN` | 错误上报 | Sentry |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` | 配置 |

### 2.2 apps/nestory-web

| 变量 | 含义 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 公开 API 地址 |
| `NESTORY_API_INTERNAL_KEY` | 内部调用 key（与 api 一致） |
| `NEXT_PUBLIC_SENTRY_DSN` | 前端错误上报 |

### 2.3 apps/nestory-mobile（Expo）

| 变量 | 含义 |
|---|---|
| `EXPO_PUBLIC_API_URL` | API 地址 |
| `EXPO_PUBLIC_WEB_URL` | Story H5 base URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL（公开） |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key（公开） |
| `REVENUECAT_API_KEY_IOS` | iOS RevenueCat key（EAS secret） |
| `REVENUECAT_API_KEY_ANDROID` | Android RevenueCat key（EAS secret） |
| `EXPO_PUBLIC_SENTRY_DSN` | 前端错误上报 |

> 命名约定：以 `EXPO_PUBLIC_` 前缀的变量会被打入 bundle，**仅放真正可公开的内容**（公开 URL、anon key）。任何敏感密钥必须通过 EAS secret + 服务端中转，不进 bundle。

### 2.4 .env.example

仓库根目录 + 每个 app 都维护一份 `.env.example`，列出全部变量名与示例值（无真实密钥），CI 校验 `.env` 与 `.env.example` 的 key 集合一致。

---

## 3. 签名与发布

### 3.1 iOS（通过 EAS Build + EAS Submit）

| 项 | 值 |
|---|---|
| Bundle ID | `app.nestory.ios` |
| Team ID | （Apple Developer 账户绑定，待补） |
| Distribution Certificate | EAS managed |
| Provisioning Profile | EAS managed |
| Push 证书 | APNs Auth Key（.p8）注入 EAS |
| TestFlight | 默认 staging build 上架 |

### 3.2 Android（EAS Build + EAS Submit）

| 项 | 值 |
|---|---|
| Package name | `app.nestory.android` |
| Keystore | EAS managed（首次自动生成，备份到 1Password） |
| Service Account JSON | Google Play Console 生成，存 EAS secret |
| Internal testing track | staging build 自动上架 |

### 3.3 EAS 通道（channels）

| 通道 | App 端目标 | Update 来源 |
|---|---|---|
| `preview` | 内部测试 build | PR 合并触发 OTA |
| `staging` | TestFlight + Play Internal | merge to main 触发 OTA |
| `production` | App Store + Play Production | 手动 promote |

JS bundle 通过 EAS Update OTA 推送（不需要重新提交审核），原生改动必须重新 build + 提交。

---

## 4. CI/CD

### 4.1 工具

GitHub Actions + Turborepo 远端缓存（Vercel Remote Cache 或自建 R2）。

### 4.2 Pipeline

```
PR open / push:
  ├─ install (pnpm install --frozen-lockfile)
  ├─ lint (eslint + prettier check)
  ├─ typecheck (turbo run typecheck)
  ├─ unit test (turbo run test)
  ├─ check:docs (校验文档版本号一致性，见 §5)
  ├─ gitleaks (扫密钥)
  ├─ deps:check (madge 检查包间循环依赖)
  ├─ web preview deploy (Vercel)
  └─ mobile preview build (EAS Build, 触发条件：mobile/ 文件改动)

merge to main:
  ├─ 上述全部
  ├─ migrate staging DB (prisma migrate deploy)
  ├─ deploy api → Railway staging
  ├─ deploy web → Vercel staging
  └─ EAS Update channel=staging（OTA）

manual production promote:
  ├─ migrate prod DB (人工审批)
  ├─ deploy api → Railway production
  ├─ deploy web → Vercel production
  └─ EAS promote staging → production（OTA）

scheduled (nightly):
  └─ E2E test (Detox iOS + Android emulator)
```

### 4.3 环境变量注入

- Railway / Vercel / EAS 各自后台配置
- GitHub Actions 仅持有 deploy 触发的 token，不持有任何业务密钥
- 部署后跑 health check：`GET /healthz` 200 才算成功

### 4.4 数据库迁移

| 环境 | 流程 |
|---|---|
| local | `pnpm --filter @nestory/db migrate dev` |
| preview / staging | CI 自动跑 `prisma migrate deploy` |
| production | 手动审批后跑 `prisma migrate deploy`；任何 destructive migration（drop column / drop table）需写 rollback plan + 业务方签字 |

---

## 5. 文档版本一致性检查（CI）

`tools/doc-version-check.ts`：

```ts
// 校验：
// 1. 每份 dev/*.md 文件名版本号 == 文件内"版本：vX.Y"
// 2. 每份文件"依赖文档：X vY.Z"中的版本号 ≤ 实际文件版本号
// 3. README.md Stage 6 的 dev 文件清单与 dev/ 目录实际文件一致
// 失败则 exit 1，阻止 PR 合并
```

PR commit message 改文档时强制带 `[docs:vX.Y]` tag，方便溯源。

---

## 6. 监控与告警

### 6.1 指标

| 维度 | 工具 | 关键指标 |
|---|---|---|
| Web Vitals（Story H5） | Vercel Analytics | LCP / FID / CLS |
| API 性能 | Railway Metrics + 自建 Prometheus | p50 / p95 / p99 latency, error rate, RPS |
| DB | Supabase Dashboard | 连接数、慢查询、Storage 用量 |
| Job 队列 | BullMQ Board（仅内网） | 待办数、失败率、平均处理时延 |
| AI 调用 | 自定义埋点 | story_generation_duration, retry_count, fallback_rate, prompt_version 维度 |
| 业务 | PostHog 或自建 | DAU / WAU / MAU、付费转化漏斗、Paywall 触发 → 购买率 |

### 6.2 告警

- p99 latency > 2s 持续 5 分钟 → Slack `#ops-alerts`
- Story 生成失败率 > 10% / 小时 → Slack + 邮件
- RevenueCat webhook 5 次连续失败 → 邮件
- DB 连接数 > 80% 上限 → 邮件
- Supabase Storage 用量 > 80% → 邮件

### 6.3 错误追踪

- Sentry：API + Web + Mobile 三端
- `beforeSend` hook 强制 strip：email、phone、token、Authorization 头
- 错误按 release 版本分组（与 EAS Update channel 关联）

### 6.4 日志

- 结构化 JSON（pino）
- 字段：`ts / level / req_id / user_id (脱敏前 8 位) / route / latency_ms / status / err_code`
- 7 天热数据 → Railway 日志；30 天归档 → S3
- 不打 PII / 密钥 / token

---

## 7. 备份与恢复

| 数据 | 频率 | 保留 | 恢复演练 |
|---|---|---|---|
| PostgreSQL | Supabase 自动每日 + 手动月度快照 | 30 天 | 季度演练一次（恢复到 staging 验证完整性） |
| Storage | Supabase 跨区域复制（待启用） | 永久 | 同上 |
| Prisma migrations | Git | 永久 | — |

---

## 8. 性能预算

| 端 | 指标 | 预算 |
|---|---|---|
| Mobile | App 启动到 H-01 可交互 | < 2.5s（中端机） |
| Mobile | Story WebView 首屏 | < 1.5s |
| Web | Story H5 LCP | < 2.0s |
| API | `GET /stories` p95 | < 200ms |
| API | `GET /stories/:id` p95 | < 300ms |
| API | `POST /assets`（含 1 张照片） p95 | < 1.5s |
| AI | Story 生成（rich 档） p95 | < 30s |

超过预算的接口需要在 PR 中说明 + 进性能改进 backlog。

---

## 9. 待确认事项

- [ ] Apple Developer 账户与 Team ID
- [ ] Google Play Console 账户
- [ ] Sentry 账户与 DSN
- [ ] PostHog vs 自建埋点决定
- [ ] Storage 跨区域复制是否启用（成本评估）
- [ ] 法务确认隐私政策与 ToS 上线版本
- [ ] 数据驻留：是否需要欧盟 region 实例（取决于上线市场）
