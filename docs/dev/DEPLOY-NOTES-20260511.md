# 首次生产部署笔记

**日期：** 2026-05-11
**参与方：** Justin（开发）
**状态：** 端到端跑通
**关联 commit：** `4766780`（prisma postinstall + start fix）、`e06467d`（tsx 生产启动）

---

## 部署架构

```
   ┌───────────────────┐        ┌──────────────────────────┐
   │  mobile (Expo)    │ ─────► │                          │
   └───────────────────┘        │                          │
                                │   API (Railway)          │ ─┐
   ┌───────────────────┐        │   Fastify + in-process   │  │
   │  web (Vercel)     │ ─SSR─► │   BullMQ worker          │  │
   │  Next.js 15       │        │                          │  │
   └───────────────────┘        └──────────────────────────┘  │
                                        │                     │
                                        ▼                     ▼
                              ┌─────────────────┐    ┌───────────────────┐
                              │  Redis          │    │  Supabase         │
                              │  (Railway)      │    │  Postgres / Auth  │
                              │  BullMQ queue   │    │  Storage          │
                              └─────────────────┘    └───────────────────┘
```

| 服务 | URL | 备注 |
|---|---|---|
| Web | `nestory-web-lilac.vercel.app` | Next.js SSR，server-side fetch API |
| API | `nestoryapi-production.up.railway.app` | Fastify + BullMQ worker 同进程 |
| Redis | Railway 内网 IPv6 | 通过 `${{Redis.REDIS_URL}}` 引用 |
| DB / Auth / Storage | `ovggqeaxqkaybrgnzfwh.supabase.co` (ca-central-1) | Prisma 6 + Supabase Auth + Storage |

---

## 踩过的四个坑

### 1. `start` 脚本里的 `--env-file=.env`

[apps/nestory-api/package.json](../../apps/nestory-api/package.json) 原本是 `node --env-file=.env dist/index.js`。Railway 上 env 直接注入 `process.env`，没有 `.env` 文件 → 启动前 Node 报错退出。

**修复：** 改成 `node dist/index.js`，dev 的 `tsx watch --env-file=.env` 不动（本地仍读 `.env`）。

### 2. 缺 `prisma generate`，TS 编译报 TS7006

Build 阶段 `pnpm build` 跑 `tsc`，但 Prisma client 类型还没生成 → 所有 `.map(c => ...)` 之类 callback 的参数退化成 `any` → strict 模式炸：

```
src/routes/children.ts(102,26): error TS7006: Parameter 'c' implicitly has an 'any' type.
```

**修复：** 在 `apps/nestory-api/package.json` 加 `"postinstall": "prisma generate"`。任何环境（Railway / Vercel / CI / 新 clone）`pnpm install` 都自动生成 client，不依赖平台特定 Build Command。`prisma generate` 只读 `schema.prisma`，不需要 `DATABASE_URL`，所以 postinstall 安全。

### 3. Node ESM 严格后缀解析

Build 通过后启动崩：

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/.../dist/config/env'
```

源码用 `import { loadEnv } from './config/env'`（无后缀），`tsconfig` 设 `moduleResolution: "Bundler"`，`tsc` 编译输出不会自动补 `.js`。Node 22 ESM loader 严格要求后缀，所以 `dist/index.js` 找不到 `./config/env`（实际文件是 `dist/config/env.js`）。本地 `tsx` 有自己的 resolver 所以没暴露。

**修复：** 生产也走 tsx，不再用 dist：
- `start` 改成 `tsx src/index.ts`
- 把 `tsx` 从 `devDependencies` 搬到 `dependencies`（防 prod install 被 prune）
- `pnpm install --lockfile-only` 同步 `pnpm-lock.yaml`

> 替代方案（未采用）：源码全量加 `.js` 后缀、改 `moduleResolution: "NodeNext"`、`tsc-alias` 后处理 dist。tsx 是最小改动。tsx 的 esbuild 启动开销对长跑 server 可忽略。

### 4. monorepo Root Directory 别填错

PaaS 习惯让你指定一个 "项目根"。pnpm workspace 的 `pnpm-workspace.yaml` 必须在仓库根，配置规则：

| 平台 | Root Directory | 关键命令 / 提示 |
|---|---|---|
| Railway (`@nestory/api`) | **留空 `/`** | `pnpm --filter @nestory/api start` 精确定位子包 |
| Vercel (`nestory-web`) | **`apps/nestory-web`** | Vercel 知道 monorepo，从仓库根 install，build 时进入子目录 |

填 `apps/nestory-api` 给 Railway → pnpm 找不到 workspace 根 → `ERR_PNPM_NO_MATCHING_VERSION @nestory/types`。

另：Railway 连仓库时会**给每个 workspace 自动起一个 service**。这次它自动建了 web 和 mobile 两个不需要的 service，要手动删掉（Settings → 底部 Danger Zone → Delete Service）。web 在 Vercel、mobile 用 EAS Build，二者都不该在 Railway。

---

## 配置参考

### Railway `@nestory/api` 环境变量

```
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
CORS_ORIGIN=https://nestory-web-lilac.vercel.app   # 当前 web 域名

# DB - DATABASE_URL 走 transaction pooler (6543) + pgbouncer 模式
#      DIRECT_URL 走 session pooler (5432) 给 prisma migrate 用
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.<ref>:<pwd>@<region>.pooler.supabase.com:5432/postgres

SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>            # ⚠️ 绝不能放进 mobile / web

REDIS_URL=${{Redis.REDIS_URL}}                     # Railway 内部引用
# 如遇 getaddrinfo ENOTFOUND，加 ?family=0 让 ioredis 双栈解析

STORY_AI_MOCK=1                                    # 切真 key 时去掉
ANTHROPIC_API_KEY=                                 # 后续填
```

### Railway 服务配置

| 字段 | 值 |
|---|---|
| Source / Branch | `main`，auto deploy on push |
| Watch Paths | `apps/nestory-api/**` · `packages/types/**` · `pnpm-lock.yaml` · `pnpm-workspace.yaml` |
| Build / Install | Nixpacks 默认即可（识别 pnpm-workspace） |
| Start Command | `pnpm --filter @nestory/api start` |
| Healthcheck | `/health`，timeout 30s |

### Vercel `nestory-web` 环境变量

```
API_URL=https://nestoryapi-production.up.railway.app
```

只在 server component 里读，不加 `NEXT_PUBLIC_` 前缀，不带末尾 `/`。

---

## 验证

```bash
# 1. API 健康检查
curl https://nestoryapi-production.up.railway.app/health
# → {"status":"ok","service":"nestory-api"}

# 2. 公开分享端点
curl https://nestoryapi-production.up.railway.app/shares/public/<token>
# → 200 + StoryDocument JSON

# 3. Vercel SSR 渲染
curl -I https://nestory-web-lilac.vercel.app/share/<token>
# → HTTP/2 200
```

---

## 未完成项（非阻塞）

| 项 | 触发时机 |
|---|---|
| 真实 Apple/Google OAuth | mobile 上架前必做。Supabase Auth → Providers 启用 + 配 Client ID/Secret |
| `STORY_AI_MOCK=1` → 真 `ANTHROPIC_API_KEY` | 准备发用户内测前 |
| mobile `shared/config.ts` 的 prod URL 占位 | 上 EAS Build 前替换为真实 Railway / Vercel 域名（或绑定的自定义域名） |
| 自定义域名 `api.nestory.app` / `web.nestory.app` | 想做品牌时 |
| Railway 上把 Build Command 加入 `prisma migrate deploy` | 下次 schema 变更前 |

---

## 后续 schema 变更的标准流程

1. 本地改 `schema.prisma`
2. `pnpm --filter @nestory/api prisma migrate dev --name <change>` 生成 migration 文件并 apply 到 Supabase
3. `git push` —— Railway / Vercel 自动重新部署
4. （可选）把 `prisma migrate deploy` 加进 Railway Build Command 实现幂等托管 apply

由于本地 `.env` 和生产共用同一个 Supabase DB，`prisma migrate dev` 本地一跑生产就同步了 —— 简化了流程但也意味着本地误操作会影响生产，schema 改动前要谨慎。
