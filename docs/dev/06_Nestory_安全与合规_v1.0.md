# Nestory — 安全与合规设计

**版本：** v1.0
**日期：** 2026-04-25
**依赖文档：** 技术架构 v1.3 · 数据库设计 v1.2 · API 设计 v1.1 · ARCH-DECISIONS-20260425
**编写者：** Justin

> 本文件覆盖 MVP 上线前必须达成的安全与合规底线。所有"待补"项必须在 Sprint 3 收尾前完成验收。

---

## 1. 认证与授权

### 1.1 用户认证

- **来源**：Supabase Auth（邮箱 + 密码 起步，OAuth 在 v1.1 加 Apple / Google）
- **JWT 校验**：所有 API 路由前置 middleware `apps/nestory-api/src/middleware/auth.ts`，从 `Authorization: Bearer <token>` 提取并校验 Supabase 公钥签名
- **Token 生命周期**：
  - access_token：1 小时
  - refresh_token：30 天，客户端启动时静默续签
  - 退出登录：客户端清本地 token + 调用 Supabase signOut（撤销 refresh_token）
- **设备登录限制**：MVP 不限设备数；v1.1 可加同账号最多 5 台设备（基于 refresh_token 数量）

### 1.2 接口鉴权

| 接口 | 认证 | 授权 |
|---|---|---|
| 全部 `/users` `/children` `/assets` `/highlights` `/stories` `/subscriptions` `/shares` | Bearer Token | 资源 owner 校验：所有 SELECT/UPDATE 必须带 `WHERE user_id = $jwt.sub`，禁止信任请求体里的 user_id |
| `/shares/public/:token` | 无 | 仅校验 token 有效（`revoked_at IS NULL`） |
| `/subscriptions/sync`（RevenueCat webhook） | `X-RevenueCat-Webhook-Secret` 头 | 与环境变量 `REVENUECAT_WEBHOOK_SECRET` 常量时间比较 |

### 1.3 横向权限（IDOR 防护）

每个 service 函数第一行：
```ts
const asset = await prisma.rawAssets.findFirst({
  where: { id: assetId, user_id: ctx.userId },  // user_id 必带
});
if (!asset) throw new NotFoundError();           // 不区分"不存在"和"无权限"，避免信息泄露
```

---

## 2. 文件上传安全

### 2.1 真实 MIME 校验

不信任客户端发的 `Content-Type`，用 magic bytes 解析：
```ts
import { fileTypeFromBuffer } from 'file-type';
const type = await fileTypeFromBuffer(buffer);
if (!['image/jpeg', 'image/png', 'image/heif'].includes(type?.mime)) {
  throw new UnprocessableEntityError('INVALID_FILE_TYPE');
}
```

### 2.2 大小与数量限制

| 限制 | 阈值 | 检查位置 |
|---|---|---|
| 单文件大小 | ≤ 10MB | Fastify `multipart` 配置 + service 写入前再校验 |
| 单条 Memory 照片数 | ≤ 10 张 | route 层校验 photos.length |
| 用户日上传总量 | ≤ 500 MB | Redis 计数器，按 IANA 时区跨日重置 |

### 2.3 EXIF 隐私

上传处理流程：

1. 用 `sharp` 读取 EXIF
2. 若存在 GPS 坐标：调用反向地理编码 API（如 OpenStreetMap Nominatim / Google Maps）→ 解析到**城市级**（如 `"Vancouver, BC"`）→ 存入 `raw_assets.location_label TEXT`
3. 原始 GPS 坐标**立即丢弃**，不写入 DB、不写入 Storage
4. 用 `sharp` strip 所有 EXIF（GPS / 设备型号 / 序列号）再写入 Storage
5. `exif_taken_at` 写入 DB

**Privacy Nutrition Label 填写**：Coarse Location（城市级），App 功能用途，与用户数据关联。不需申请 `CoreLocation` 设备权限（仅解析用户主动上传的照片 EXIF，不是实时位置请求）。

iOS 14+ 分享照片时系统已询问用户是否包含位置；许多照片无 GPS，处理层需 graceful fallback（无位置则 `location_label = NULL`，故事生成不提地点）。

### 2.4 病毒扫描

MVP 阶段不接 ClamAV。代之以：
- 仅允许图片 MIME，二进制白名单
- Storage bucket 设为非可执行（无 `Content-Disposition: attachment` 之外的处理）
- 用户上传到独立 bucket，CDN 不直接执行任何脚本

v1.1 接 ClamAV 或 Cloudflare R2 + Workers AV。

### 2.5 Storage 物理删除

`asset_files` 行被删后：
1. 立即删除 DB 行（事务内）
2. 写入 `storage_cleanup_queue` 表：`storage_path + scheduled_at = now() + 24h`
3. `apps/nestory-api/jobs/workers/storage-cleanup.worker.ts` 每小时跑，按 batch 调 Supabase Storage 删除 API
4. 24h 缓冲期是为了误删恢复

---

## 3. Rate Limiting

### 3.1 全局策略

`apps/nestory-api/src/middleware/rate-limit.ts`，基于 Redis sliding window：

| 范围 | 阈值 | 触发动作 |
|---|---|---|
| 单 IP | 1000 req / 分钟 | 429 + Retry-After |
| 单用户（认证后） | 600 req / 分钟 | 429 |
| 单用户 `POST /assets` | 60 / 分钟 | 429 |
| 单用户 `POST /highlights` | 30 / 分钟 | 429 |
| 单用户 `POST /shares` | 10 / 分钟 | 429 |
| 单 IP 未认证（auth 接口） | 20 / 分钟 | 429 + 触发 captcha v1.1 |

### 3.2 滥用检测

- 1 小时内同 IP 触发 5 次 429 → 自动 ban 24h
- 写 `abuse_log` 表，包含 IP / userId / endpoint / triggered_at
- v1.1 接 Cloudflare Turnstile

---

## 4. 输入校验

所有 route 入参强制经过 `zod` schema 校验，schema 定义在 `apps/nestory-api/src/routes/<resource>.schema.ts`：

```ts
const CreateAssetSchema = z.object({
  child_id:     z.string().uuid(),
  captured_at:  z.string().datetime(),
  text_note:    z.string().max(500).optional(),
  tag_values:   z.array(z.string().max(50)).max(8).optional(),
  is_highlight: z.boolean().optional(),
});
```

Zod 通过后，service 层进行业务时间校验：

```ts
// apps/nestory-api/src/services/assets.service.ts
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000  // 5 分钟，容忍设备时钟偏差

const capturedAt = new Date(dto.captured_at)
if (capturedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
  throw new UnprocessableEntityError('INVALID_CAPTURED_AT_FUTURE')
}
```

零信任原则：
- `text_note`：最大长度 500 字符强约束
- `tag_values`：字符串数组，单个 tag ≤ 50 字符，最多 8 个；service 层 normalize（trim + lowercase）后写入 `raw_assets.tags TEXT[]`
- `captured_at`：Zod 校验 ISO datetime 格式；service 层校验不得超过当前时间 5 分钟（`INVALID_CAPTURED_AT_FUTURE`）；无下限，支持导入旧照片
- 任何 `user_id` / `child_id` 必须经过 owner 校验，不直接采用请求体值

---

## 5. SQL 注入与 XSS

- **SQL**：全部走 Prisma，禁止拼字符串。需要原生 SQL 时用 `prisma.$queryRaw` 的参数占位形式（`$1` `$2`），永不字符串模板
- **XSS（Web 侧）**：
  - StoryRenderer 渲染 `text_note` 等用户内容时全部走 React 默认 escape，不用 `dangerouslySetInnerHTML`
  - OG meta 输出做 HTML entity escape
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data: https://supabase-domain; script-src 'self'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 6. CSRF

- API 仅接受 `Authorization: Bearer` 头认证，不依赖 cookie session
- 因此天然免疫表单 CSRF
- Web 侧任何状态变更操作必须从 mobile/web app 携带 token，不接受 form post

---

## 7. 分享链接安全

- `story_shares.token`：256-bit 熵 base64url（见 04 §story_shares）
- 默认 visibility = `private_link`：知道 token 即可访问，不索引
- `Robots.txt` 禁止抓取 `/share/*`
- `/share/[token]/page.tsx` 输出 `<meta name="robots" content="noindex,nofollow">`
- v1.1 加密码保护选项

---

## 8. 密钥与机密管理

### 8.1 存储

| 环境 | 存储方式 |
|---|---|
| 本地开发 | `.env.local`（`.gitignore` 排除）+ `.env.example` 入库（仅占位） |
| Railway（API） | Railway 环境变量 |
| Vercel（Web） | Vercel 环境变量（区分 Preview / Production） |
| Expo（Mobile） | EAS Build secrets，构建时注入 `EXPO_PUBLIC_*`（仅非敏感）；敏感密钥通过 Native Module 从安全 channel 拉取，不进 bundle |

### 8.2 轮换策略

| 密钥 | 周期 | 流程 |
|---|---|---|
| `OPENAI_API_KEY` | 90 天 | OpenAI 后台新 key → 写入环境 → redeploy → 撤销旧 key |
| `REVENUECAT_WEBHOOK_SECRET` | 180 天 | RevenueCat 后台改 → 双 secret 并行 24h → 撤销旧 |
| `SUPABASE_SERVICE_KEY` | 180 天 | Supabase Dashboard rotate → 同上 |
| `NESTORY_API_INTERNAL_KEY`（web ↔ api） | 180 天 | 自生成 256-bit base64url |
| `JWT 公钥`（Supabase 管理） | Supabase 控制 | 客户端不缓存 JWKS，按响应 cache-control 重拉 |

### 8.3 不允许出现在：

- 任何前端 bundle（`EXPO_PUBLIC_*` 仅用于真正公开的 URL/key）
- Git 历史（提交前 `pre-commit` 跑 `gitleaks`）
- 日志（结构化日志 schema 强制脱敏，`Authorization` 头 / token / password 字段全部 mask）

---

## 9. 隐私与合规

### 9.0 管辖权策略

Nestory 分发到 App Store / Google Play，理论上任意地区用户都能下载。实际做法：**按最严标准统一实现，一份 Privacy Policy 覆盖所有法域**，不做地区适配。

| 法规 | 适用场景 | Nestory 的应对 |
|---|---|---|
| COPPA（美国） | 面向 13 岁以下儿童的 app | **不适用**：用户是父母（成年人），儿童是照片主角不是 app 用户 |
| PIPEDA（加拿大联邦） | 收集个人信息 | 知情同意 + 可删除 + 最小化收集 ✓ |
| Quebec Law 25 | 魁省用户，高风险处理 | 同 PIPEDA 要求 + AI 处理披露 ✓ |
| CCPA（加州） | 加州用户 | 同 GDPR 原则，已覆盖 ✓ |
| GDPR（欧盟） | 欧盟用户 | 如主动进入欧盟市场需加 EU Supabase region；MVP 阶段仅 us-east-1 |

**关键：Nestory 面向父母，不面向儿童**。COPPA 最严的"儿童 app"条款不适用。

Privacy Policy 需明确声明：
> "Photos are processed by AI to generate story content. Your photos are not used to train third-party AI models and are not shared with third parties."

注册同意流程（Onboarding O-06 Terms / Privacy 勾选）覆盖所有法域的知情同意要求，无需按地区显示不同内容。

### 9.1 数据范围（涉及最敏感的两类）

- **儿童照片与文字**（COPPA / GDPR Article 8）
- **家长账户邮箱**（GDPR / PIPEDA）

### 9.2 关键合规要求

| 要求 | 实现 |
|---|---|
| **同意** | Onboarding O-03 Permissions 步骤显式获取相机/相册权限；O-06 Terms / Privacy 必须勾选才能进入 Plan 选择 |
| **数据最小化** | 不采集 GPS、设备 ID（仅推送 token，可单独删除） |
| **儿童数据** | 13 岁以下数据由家长账户持有；不向第三方共享儿童数据；不投放定向广告 |
| **可访问** | `GET /users/me/export` 返回该用户全部数据的 ZIP（JSON + 原始 photos），异步生成 + 邮件推送下载链接（v1.1 加） |
| **可删除** | `DELETE /users/me` → `users.deleted_at = now()` + 立即 Supabase signOut（使所有 token 失效）；nightly cron 清理 `deleted_at < now() - interval '30 days'` 的账号，物理删除顺序：① Storage 文件（按 asset_files.storage_path 批量调 Supabase Storage API）② Supabase Auth 用户（Admin API）③ RevenueCat 用户解除关联 ④ users 行（CASCADE 自动清子表）；所有业务查询通过 Prisma soft-delete middleware 注入 `WHERE deleted_at IS NULL`，软删除期间用户无法登录 |
| **可携带** | 同 9.2 export，输出格式 JSON + 媒体原文件 |
| **数据驻留** | Supabase 部署在 us-east-1（默认）；如进入欧盟市场需加欧盟 region 实例 |

### 9.3 第三方数据流

| 服务 | 传出数据 | 合规依据 |
|---|---|---|
| OpenAI | 照片描述请求（图片 + prompt） | OpenAI API 合同；不用于训练（已在 API tier 关闭 data sharing） |
| RevenueCat | 用户匿名 ID + 订阅事件 | DPA 已签 |
| Supabase | 全量数据 | DPA 已签；自托管 PostgreSQL 选项预留 |
| Sentry（v1.1） | 错误堆栈（脱敏 PII） | `beforeSend` hook 强制 strip email/phone |

### 9.4 隐私政策与 ToS

- `docs/legal/privacy-policy.md`（待补，与法务对齐）
- `docs/legal/terms-of-service.md`（待补）
- App 内入口：Settings → Data & Privacy（ST-04）

---

## 10. 审计日志

`audit_log` 表（已加入 `04_Nestory_数据库设计v1.4.md`）：

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  actor_type  VARCHAR(20) NOT NULL,  -- 'user' | 'system' | 'webhook'
  action      VARCHAR(50) NOT NULL,  -- 'login' | 'delete_account' | 'export_data' | 'subscription_change' ...
  resource    VARCHAR(50),
  resource_id VARCHAR(64),
  metadata    JSONB,
  ip_addr     INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

记录范围：登录、登出、密码修改、删除账户、导出数据、订阅状态变更、管理员操作。保留 1 年。

---

## 11. 应急响应

### 11.1 数据泄露

发现疑似泄露 → 1 小时内：
1. 隔离受影响接口（feature flag 关停）
2. 轮换所有相关密钥
3. 评估范围（受影响用户 ID 列表）
4. 72 小时内通知监管（GDPR）+ 用户

### 11.2 被滥用账号

**手动锁定：**
- 账号被举报 → 客服通过 admin tool 设置 `users.locked_at = now()`
- 写 `abuse_log`（trigger_type = `'manual_lock'`）
- 所有 API 请求：auth middleware 检查 `locked_at IS NOT NULL` → `403 ACCOUNT_LOCKED`

**自动锁定：**
- rate-limit middleware：统计单账号 24h 内 `POST /assets` 次数（Redis 计数器，按 IANA 时区跨日重置）
- 上传量 > 1000 张 → 自动写 `users.locked_at = now()` + 写 `abuse_log`（trigger_type = `'upload_abuse'`）+ Slack 通知运营复核
- 单 IP 1h 内触发 5 次 429 → 仅写 `abuse_log`（trigger_type = `'rate_limit_429'`），不自动锁定，供人工研判

**解锁：**
- admin tool 设置 `users.locked_at = NULL` 即可恢复

### 11.3 RevenueCat / Supabase 故障

- API 内置 circuit breaker，连续 5 次失败后熔断 30s
- RevenueCat 不可用：订阅状态查询走本地缓存（最后已知状态），不阻塞核心流程
- Supabase 不可用：返回 503 + 引导用户稍后重试，不返回栈信息

---

## 12. 上线前 checklist

- [ ] 所有路由前置 auth + zod 校验 middleware
- [ ] `gitleaks` 在 CI 跑通，git 历史无密钥
- [ ] CSP / nosniff / Referrer-Policy 头在 web 与 api 全部生效
- [ ] EXIF strip 单元测试覆盖
- [ ] Magic bytes MIME 校验单元测试覆盖
- [ ] Rate limit 中间件压测验证
- [ ] R-04 advisory lock 并发测试（10 个并发请求边界场景）
- [ ] 删除账号端到端测试：DB / Storage / Supabase Auth / RevenueCat 全清
- [ ] 隐私政策与 ToS 上线
- [ ] Onboarding 同意流程合规审查
