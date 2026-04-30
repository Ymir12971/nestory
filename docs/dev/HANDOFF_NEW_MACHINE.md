# Nestory — 换机器交接说明

**生成日期**：2026-04-29
**用途**：在另一台机器上恢复 Claude Code 协作上下文

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

## 4. 当前进度（截至 2026-04-29）

### 4.1 已完成

| 模块 | 文件 | 状态 |
|---|---|---|
| 文档 | `docs/dev/03_2_Nestory_目录结构_v3.0.md` | ✅ 单产品 monorepo + features-based + modules-based 已定 |
| 文档 | `docs/dev/08-Nestory_DesignTokens0429.json` | ✅ 设计 token（包括 SemiBold-600 / 拆 ButtonLabel-M/S 等修复）|
| 文档 | `docs/09-Nestory_FigmaTokenAudit_v1.0.md` | ✅ Figma 对账报告（设计师已修完） |
| Monorepo 骨架 | `package.json` / `pnpm-workspace.yaml` / `turbo.json` / `tsconfig.base.json` / `.npmrc` | ✅ pnpm install + typecheck 全绿 |
| `packages/types` | subscription / permission / story / asset 类型 | ✅ 跨 app 共享类型已建 |
| `apps/nestory-api` | Fastify 5 + Prisma 6 + Zod env loader + `/health` 路由 | ✅ 入口可跑（数据库未接） |
| `apps/nestory-web` | Next.js 15 + App Router + `/` `/story/[id]` `/share/[token]` 占位页 | ✅ typecheck 通过 |
| `apps/nestory-mobile` | Expo SDK 52 + Expo Router + features/{auth,home,stories,highlights}/ + shared/{theme,ui}/ | ✅ Expo Web bundling 通过 |
| Theme 层 | `apps/nestory-mobile/shared/theme/{colors,typography,spacing,radius,primitives,index}.ts` | ✅ 完整对齐 0429 token JSON |
| **第一个屏** | `apps/nestory-mobile/features/auth/screens/SignInScreen.tsx` | ✅ Welcome/Sign In 屏，绿底 + 双社交按钮，可在 Expo Web 跑通 |

### 4.2 临时 hack（待后续修）

- `apps/nestory-mobile/app/(tabs)/index.tsx` 临时 export `SignInScreen`（应是 HomeScreen）—— 等 auth flow 接通后改回，加 Redirect 逻辑
- SignIn 屏 Apple/Google 图标用 unicode  和字母 G 占位 —— 后续接 brand SVG
- 字体没加载 —— RN/Web 走系统字体 fallback；后续 expo-font 加载 Manrope/Inter

### 4.3 未做（按优先级）

1. **Figma 02 Main UI 页扫一遍** —— 4 个主页面（02 Main UI / 03 States / 04 Overlays）的 frame 清单 + 按 MCP 精校 Welcome 屏像素
2. **Home 屏 (H-01)** —— avatarRow + highlightRow + StoryCard
3. **Stories 屏 (S-01)** —— monthCard 列表 + filter
4. **Subscription Paywall** —— Modal/Paywall A/B/C/D × year/month
5. **Auth flow 接 Supabase** —— Apple/Google sign-in 真实接通
6. **Prisma schema 落 [docs/dev/04_Nestory_数据库设计v1.7.md](04_Nestory_数据库设计v1.7.md)**
7. **API 路由实现** —— `/assets`, `/stories`, `/highlights`, `/children`, `/subscriptions`, `/shares`
8. **AI Pipeline 实现** —— Planner / Brief / Generator / Validator
9. **Story H5 渲染层（Next.js）** —— StoryRenderer + sections + OG meta

### 4.4 已知小坑（修过的，避免再踩）

- pnpm 装到 `D:\Program Files\nodejs\` 没权限 → 用 `npm install -g pnpm` 装到用户 prefix
- Web typecheck 被 mobile 的 React 18 类型污染 → `tsconfig.base.json` 关掉 `declaration`，只 `packages/types` 单独开
- React 19 + Next 15 layout 严格模式下 `ReactNode` 类型错位 → 用 `Readonly<{children: React.ReactNode}>`
- `@babel/runtime` 因 isolated linker 不可见 → mobile 加为 devDep
- Metro 不会 fallback `.js` → `.ts` → 全 workspace 移除内部 `.js` 扩展，统一 `Bundler` moduleResolution
- TS 7.0 `baseUrl` 弃用 → 移除 `baseUrl`，`paths` 自动相对 tsconfig

---

## 5. 启动开发

```bash
# 全 workspace typecheck（< 2 秒）
pnpm typecheck

# 启动 Expo Web 看 SignIn 屏
pnpm --filter @nestory/mobile web
# → http://localhost:8081

# 启动 Next.js（H5 占位页）
pnpm --filter @nestory/web dev
# → http://localhost:3000

# 启动 API（需 Postgres + Redis；目前只有 /health）
pnpm --filter @nestory/api dev
# → http://localhost:3001/health
```

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
