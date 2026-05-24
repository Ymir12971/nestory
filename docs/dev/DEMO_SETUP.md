# Demo Setup — Android APK for partner demo

目标:给同伴演示一个尽量完整的 MVP(Android 真机 APK)。约一周窗口。

---

## 1. 当前状态总览

| 模块 | 状态 | 地址 / 备注 |
|---|---|---|
| 后端 API (Railway) | ✅ 部署中,自动从 `main` 部署 | `https://nestoryapi-production.up.railway.app` |
| Web 渲染层 (Vercel) | ✅ 部署中,自动从 `main` 部署 | `https://nestory-web-lilac.vercel.app` |
| Supabase (DB+Auth+Storage) | ✅ | 项目 `ovggqeaxqkaybrgnzfwh` |
| Google 登录 | ✅ 已配,Testing 模式 | 见 §4「Google 测试用户」 |
| Story 生成 worker | ⚠️ 待确认日志 | 需 Railway `REDIS_URL` + `STORY_AI_MOCK=1`(已设) |
| RevenueCat 内购 | 🟡 代码完成,账号未开 | demo 不接真支付,延后 |
| Apple 登录 | 🔴 未做 | iOS 才需要,Android demo 无关 |
| demo 数据 | ✅ 已灌入生产库 | 见 §5 |

**关键账号 / ID**
- Demo 用户:`justin@blakard.com` → UUID `7f1d4806-7a71-4035-897c-e301ae0972eb`
- GitHub:`Ymir12971/nestory`(push `main` → Railway + Vercel 自动部署)
- App 包名:`com.blakard.nestory`,scheme:`nestory`

---

## 2. 环境与配置文件对照

| App | 本地 dev 读 | 线上读 |
|---|---|---|
| nestory-api | `apps/nestory-api/.env` | **Railway → Variables** |
| nestory-mobile | `apps/nestory-mobile/.env` | **`apps/nestory-mobile/eas.json` 的 `env`** |
| nestory-web | 无文件(`API_URL` 缺省 localhost) | **Vercel → Environment Variables**(`API_URL`) |

- `.env` 文件都被 gitignore,**不上传任何平台**;线上各平台自己配变量。
- mobile 的 API/Web 地址不是环境变量,是 `shared/config.ts` 按 `__DEV__` 硬编码:
  - dev → `localhost:3001` / `:3000`
  - prod → Railway API / Vercel web

---

## 3. 待办清单(到 demo)

### 打 APK
- [ ] `cd apps/nestory-mobile`
- [ ] `npx eas-cli login`(Expo 账号,没有则注册)
- [ ] `npx eas-cli build --profile preview --platform android`
  - keystore 提示 → Yes
  - 首次会写 `extra.eas.projectId` 到 `app.json` → **构建后 commit 它**
- [ ] 下载 `.apk`,装到安卓真机

### 线上确认
- [ ] Vercel → Settings → Env Vars 有 `API_URL=https://nestoryapi-production.up.railway.app`(改了要 Redeploy)
- [ ] Railway Deploy Logs 出现 `[story-worker] started (concurrency=1, MOCK generation)`

### Google 测试用户(否则登录被拒)
- [ ] Google Cloud Console → Audience → Test users 加入要登录的 Google 邮箱(同伴的,或统一用 justin@)

### demo 数据(已完成,可重跑)
- [x] 已灌:Emma + 4 条本月记忆 + 2 highlights + 1 个 2026-04 story
- 重跑:`pnpm --filter @nestory/api exec tsx --env-file=.env prisma/seed-demo.ts`

---

## 4. 验证

### 本地 web 快速验证(不用等 APK)
1. 根目录:`pnpm api` + `pnpm mobile`,按 `w` 开 web
2. 用 `justin@blakard.com` Google 登录
3. 应看到首页 carousel(4 张照片)、Memories(4 条)、Highlights(2 个)
4. Story 详情在本地 web 需另起 `pnpm --filter ./apps/nestory-web dev`(3000 端口);APK 里走 Vercel 不受限

### APK 全流程
- 登录 → 首页有数据 → 打开 2026-04 的 story 看渲染 → 现场加一条真实照片记忆

---

## 5. demo 当天 runbook

1. 确认 Railway / Vercel 都在线(`/health` 200)
2. 手机连好网络(picsum 占位图 + Vercel 都需要联网)
3. 用已加入测试用户的 Google 账号登录
4. 演示动线:首页 → Memories → 打开已生成 Story(2026-04)→ 现场「+ Add Memory」拍/传真实照片 → 回首页看更新
5. 付费墙:点 Subscription 展示对比表 + 套餐(讲商业模式,**不真实扣款**,按钮在无 RC key 时优雅 no-op)

---

## 6. 已知缺口 / 讲解话术

- **AI Story 是 mock 生成**(`STORY_AI_MOCK=1`):内容是确定性模板,不烧 token。讲「接入 Claude 后是真实个性化叙事」。
- **照片是 picsum 占位**:非宝宝照。现场加真实照片更佳。
- **内购未接真实账号**:UI 完整,逻辑代码已就位,等 Google Play Console + RevenueCat 开通。
- **Apple 登录、删账号、分享、Toast**:延后,demo 不阻塞。

---

## 7. 排错

| 现象 | 排查 |
|---|---|
| Google 登录 `access_denied` | 邮箱没在 Google Cloud Test users |
| Story 页白屏 | Vercel `API_URL` 没设 / 没 Redeploy |
| 新建 story 不生成 | Railway 缺 `REDIS_URL` 或 worker 没起(看日志) |
| EAS 构建模块找不到 | pnpm monorepo:试把根 `.npmrc` 的 `node-linker=isolated` 改 `hoisted` 再构建 |
| APK 连不上后端 | `shared/config.ts` 的 prod `apiBaseUrl` 是否为 Railway 地址(已配) |
