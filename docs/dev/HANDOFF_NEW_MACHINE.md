# Nestory — 换机器交接说明

**生成日期**：2026-04-30
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

## 4. 当前进度（截至 2026-04-30）

### 4.1 已完成

#### 基础设施

| 模块 | 文件 | 状态 |
|---|---|---|
| 文档 | `docs/dev/03_2_Nestory_目录结构_v3.0.md` | ✅ 单产品 monorepo + features-based |
| 文档 | `docs/dev/10-Nestory_FigmaScreenInventory_v1.0.md` | ✅ 41 个 frame 全清单 + node ID |
| Monorepo 骨架 | `package.json` / `pnpm-workspace.yaml` / `turbo.json` / `.npmrc` | ✅ pnpm install + typecheck 全绿 |
| `packages/types` | subscription / permission / story / asset 类型 | ✅ 跨 app 共享类型已建 |
| `apps/nestory-api` | Fastify 5 + Prisma 6 + `/health` | ✅ 入口可跑（数据库未接） |
| `apps/nestory-web` | Next.js 15 + App Router 占位页 | ✅ typecheck 通过 |
| Theme 层 | `shared/theme/{primitives,colors,typography,spacing,radius,index}.ts` | ✅ 完整对齐 0429 token JSON |

#### 共享组件

| 组件 | 文件 | 说明 |
|---|---|---|
| `TopNotify` | `shared/components/TopNotify.tsx` | 6 种状态：S-01（stories_trial/premium_ended）+ HL-01（hl_free_at_limit / ended × 3 级） |
| `PaywallModal` | `shared/components/PaywallModal.tsx` | A/B/C/D 四 variant，各自独立标题 + 权益列表，琥珀渐变 CTA |

#### Onboarding

| 屏 | 文件 | Figma node |
|---|---|---|
| O-02 Sign In | `features/auth/screens/SignInScreen.tsx` | `58:57` |
| O-06 Terms of Service | `features/onboarding/screens/TermsScreen.tsx` + `app/onboarding/terms.tsx` | `64:330` |
| O-07 Privacy Policy | `features/onboarding/screens/PrivacyScreen.tsx` + `app/onboarding/privacy.tsx` | `64:361` |

#### Home & Memory

| 屏 | 文件 | Figma node |
|---|---|---|
| H-02 Add Memory | `features/memories/screens/AddMemoryScreen.tsx` + `app/memory/add.tsx` | `96:384` |
| H-04 Memory Detail | `features/memories/screens/MemoryDetailScreen.tsx` + `app/memory/[id]/index.tsx` | `102:531` |
| H-04 Memory Edit Mode | `features/memories/screens/MemoryEditScreen.tsx` + `app/memory/[id]/edit.tsx` | `102:618` |

> ⚠️ 路由已由 `app/memory/[id].tsx` 拆分为 `app/memory/[id]/index.tsx` + `app/memory/[id]/edit.tsx`

#### Stories

| 屏 | 文件 | Figma node |
|---|---|---|
| S-01 Stories List | `features/stories/screens/StoriesScreen.tsx` + `app/(tabs)/stories.tsx` | `157:1391` |

包含全部卡片变体：Collecting / Generating / Locked（Paywall A）+ Historical Generated / NotGenerated；TopNotify（stories_trial/premium_ended）接 Paywall A。

#### Highlights

| 屏 | 文件 | Figma node |
|---|---|---|
| HL-01 Highlights Gallery | `features/highlights/screens/HighlightsScreen.tsx` | `157:2206` |
| HL-02 Highlight Detail | `features/highlights/screens/HighlightDetailScreen.tsx` | `157:2225` |

HL-01 实现了 4 场景 topNotify（优先级 ④>③>②>①，接 Paywall B）。HL-02 包含 Edit Title Sheet + Remove Confirm Sheet。

#### Settings

| 屏 | 文件 | Figma node |
|---|---|---|
| ST-05 About | `features/settings/screens/AboutScreen.tsx` + `app/settings/about.tsx` | `167:924` |

---

### 4.2 临时 hack（待后续修）

- `app/(tabs)/index.tsx` 临时 export `SignInScreen`（应是 HomeScreen）—— 等 auth flow 接通后改回
- SignIn 屏 Apple/Google 图标用 unicode 占位 —— 后续接 brand SVG
- 字体通过 `expo-font` + `useFonts` 在 `_layout.tsx` 加载，但未做 SplashScreen 保持
- 所有屏均使用 `MOCK_*` 常量，**未接真实 API**
- H-02 / H-04 Edit Mode 用 `expo-image-picker` TODO 占位，photo strip 当前只显示占位色块

---

### 4.3 未做（按优先级）

#### 前端（Mobile）

| 优先级 | 项目 | Figma node | 备注 |
|---|---|---|---|
| 🔴 高 | H-01 Home | `94:349` | avatarRow + highlightRow + StoryCard，需先看 `269:800` avatarRow Variants |
| 🔴 高 | O-03 a/b/c Child Profile | `62:42` ~ `63:282` | 三步 onboarding 表单（起名 / 生日 / 身高体重） |
| 🔴 高 | O-04 Notifications | `64:142` | 通知授权页 |
| 🔴 高 | O-05 Plan (Yearly/Monthly) | `64:170` + `64:250` | Paywall 上线前入口 |
| 🟠 中 | H-03 Memory List | `98:452` | memory 列表页 |
| 🟠 中 | S-02 Story Detail | `157:1446` | WebView 壳，载入 nestory-web |
| 🟠 中 | ST-01 Settings | `162:856` | 设置主页（长滚），含 subscriptionEntry `403:880` |
| 🟠 中 | ST-02A/B Subscription | `162:944` + `181:967` | 免费 / 付费态 |
| 🟠 中 | ST-03 Child Profile List + Edit | `164:884` + `164:924` | 孩子档案管理 |
| 🟡 低 | ST-04 Data & Privacy | `164:991` | 数据隐私页 |
| 🟡 低 | ST-06 Feedback | `167:956` | 反馈页 |
| 🟡 低 | ST-07 Account | `167:980` | 账号页 |
| 🟡 低 | O-01 Welcome 精校 | `58:38` | 当前 SignInScreen 混入了 Welcome 内容，需拆分 |

#### 前端（其他）

- **字体 SplashScreen 保持**：expo-font 加载期间保持 SplashScreen，防止 FOUT
- **expo-image-picker 接入**：H-02 / H-04 Edit 的 photo strip（见 `docs/dev/PENDING_INTEGRATION_TODOS.md`）
- **S-02 WebView**：nestory-web 的 `/story/[id]` 页面还是 Next.js 占位页

#### 后端

- **Prisma schema** → `docs/dev/04_Nestory_数据库设计v1.7.md`
- **API 路由实现** → `/assets`, `/stories`, `/highlights`, `/children`, `/subscriptions`, `/shares`
- **Auth flow 接 Supabase** → Apple/Google sign-in 真实接通
- **AI Pipeline** → Planner / Brief / Generator / Validator
- **RevenueCat 接入** → 订阅购买 + Webhook

---

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
