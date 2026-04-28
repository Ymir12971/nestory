# Nestory · 交付文档说明（给 vicol & Justin）

> 本文件不是给 Vibe Coding 工具看的，是给**你俩**看的，说明这个文件夹的组织方式和使用流程。
> AI 工具进入项目后的启动简报在 `README.md`。

---

## 📦 文件清单

编号沿用 `VibeCoding_DocChecklist` 的规范，方便 vicol / Justin 对照。

### 产品方（vicol 提供）

| # | 文件 | 说明 | 版本 |
|---|---|---|---|
| 01 | `01-Nestory_ProductOverview_v1.7.md` | PRD：产品定位、五态订阅模型、核心机制、MVP 边界 | v1.7 |
| 02 | `02-Nestory_PageStructure_v1.6.md` | 每页 / 组件的内容规格、权限差异、跨页跳转 | v1.6 |
| 06 | `06-Nestory_SubscriptionRules_v1.3.md` | 订阅规则、Locked caption、Ended Notify、Paywall 触发点 | v1.3 |
| 07 | `07-Nestory_Figma0420.fig` | Figma 设计源文件（四页：DS / Main UI / States / Overlays） | 2026-04-20 |
| 08 | `08-Nestory_DesignTokens.json` | Design Token 导出（Primitive 76 + Semantic 48，含 alias 链） | 2026-04-20 |
| W2 | `W2-Nestory_StateMatrix_v1.0.md` | 状态矩阵（01/02/06 中所有 `StateMatrix §...` 引用的事实源头） | v1.0 |

### 开发方（Justin 提供）

| # | 文件（放入 `dev/`） | 说明 |
|---|---|---|
| 03_1 | `dev/03_1_Nestory_技术架构文档_v1.3.md` | RN + Expo + Fastify + Prisma + Supabase + RevenueCat 全栈选型、AI Pipeline、订阅与付费转化 |
| 03_2 | `dev/03_2_Nestory_目录结构_v2.0.md` | Monorepo 底座结构（apps/* + packages/{core,ai-pipeline,media,push,ui,db,config,types}） |
| 04 | `dev/04_Nestory_数据库设计v1.7.md` | PostgreSQL（Supabase）schema、Prisma migration、索引、字段决策 |
| 05 | `dev/05_Nestory_API设计v1.3.md` | Fastify REST 接口契约、错误码、调用时序 |
| 06 | `dev/06_Nestory_安全与合规_v1.0.md` | 认证、文件上传安全、限流、GDPR/COPPA、密钥轮换 |
| 09 | `dev/09_Nestory_环境与CI_v1.0.md` | 环境变量、双端签名（iOS + Android）、CI/CD、监控、错误追踪 |
| ADR | `dev/ARCH-DECISIONS-20260425.md` | 架构选型决策日志（产品底座方向） |

编号 / 文件数量不必拘泥；只要最终覆盖「技术栈 / 数据 / 接口 / 构建 / 安全」五个维度即可。

---

## 🚀 给 Justin 的启动流程

1. **把整个 `Nestory_Delivery/` 文件夹拷进你的项目根目录**（或放到任何 Vibe Coding 工具能读到的位置）。
2. **把你的 4 份技术文档写好，放进 `dev/` 子文件夹**（编号参考上表）。
3. **打开 Vibe Coding 工具（Cursor / Claude Code / Windsurf 等），让它先读 `README.md`**。
   - `README.md` 里写好了身份、读序、硬规则。
   - 工具读完后会按指令回传它的理解，你检查一遍再分配任务。
4. **不需要额外写 prompt**，`README.md` 已经是完整的启动简报。

---

## 🧭 文档之间的冲突处理

当 AI 工具报告某两份文档互相矛盾时（偶尔会发生，文档随 Figma 迭代难免滞后）：

| 场景 | 以谁为准 |
|---|---|
| `01-PRD` ↔ `02-PageStructure` 或 `06-SubscriptionRules` | `W2-StateMatrix` |
| `W2-StateMatrix` ↔ `07-Figma` 源文件 | `07-Figma` 源文件 |
| `08-DesignTokens` ↔ `07-Figma` variables | `07-Figma`（token JSON 自动从 Figma 导出） |
| 产品侧文档 ↔ 开发侧文档（`dev/`） | 找 vicol 对齐，不要猜 |

---

## 🎨 资产与依赖决策

这部分决定已经在 `README.md §4.8 / §4.9 / §4.10` 里作为硬规则写给了 Vibe Coding 工具。HANDOFF_GUIDE 这里是给**人**看的"为什么"版本。

### 图标：Remix Icon（React Native 方案，双端通用）

- **来源**：[Remix Icon](https://remixicon.com/) 3058 个图标，MIT 授权。通过 `@expo/vector-icons` 或 `react-native-remix-icon` 直接引入，iOS 和 Android 同一份代码同一份资源。
- **授权**：Remix Icon License v1.0（2026-01），允许在 app 里商用，禁止作为 logo / 图标包独立产品销售。Nestory 的 app 图标需要**单独设计**，不能用 Remix。
- **集成方式**：通过 npm 包引入，按需 tree-shake；App Icon / Splash logo 单独走 expo-splash-screen 与 app.json 配置。
- **Figma ↔ 代码名称一致**：Figma 里图标 frame 叫什么，代码里就引用什么（例如 `star-line` / `home-3-fill`）。
- **禁用 SF Symbols**：SF Symbols 仅 iOS 可用，Android 不支持。Figma 里也不允许出现 SF Symbols。
- **MCP 搜索**：Vibe Coding 工具接入 `remixicon-mcp`，按关键词搜图标名。配置片段见 `README.md §4.10`。

### 组件库：无第三方库 · React Native 原生控件 + 薄封装

- **不引入**第三方 UI 组件库（NativeBase / React Native Paper / 任何造型类包）。
- **做法**：RN 原生控件（`View` / `Text` / `TouchableOpacity` / `ScrollView` / `Modal` / `FlatList`）外包一层 Nestory 薄封装（`NestoryButton` / `NestoryNotify` / ...），样式全部从 `08-Nestory_DesignTokens.json` 读。
- **允许的单一用途开源包**：`expo-image`（图片加载缓存）、`lottie-react-native`（如需动画）、`react-native-purchases`（RevenueCat 双端 IAP，封装 App Store 与 Google Play）。
- **新依赖**：Justin 引新包前先跟 vicol 对齐，更新到 `dev/03_1_Nestory_技术架构文档_v1.3.md`。

### Figma 图标命名审计（2026-04-20，已完成）

- 已核查 4 个页面的所有图标节点，现在**全部使用 Remix 标准命名**（`add-line` / `arrow-up-down-line` / `star-line` / `arrow-right-s-line` 等）。
- 已批量处理的 14 处非标图标（原先用 `chevron` / `switchChevron` 临时命名 + 描边画法）：
  - `chevron` (20×20) × 13 处 → 统一替换为 `arrow-right-s-line`（列表行右端 "可点进" 指示，H-02 / H-04 / ST-01 / ST-03a / ST-07 / 03 States 中的 H-02·Empty）
  - `switchChevron` (24×24) × 1 处 → 替换为 `arrow-up-down-line`（H-01 Profile Switcher 入口）
- 所有替换均复用自 Design System 中的同名参考组件，**保留原颜色变量**（`Text.Hint` / `Text.Onsurface`）和外框尺寸。

---

## 📋 版本记录

| 日期 | 变动 |
|---|---|
| 2026-04-20 | 建立交付包，加数字编号前缀对齐 DocChecklist 规范 |
| 2026-04-20 | DesignTokens collection 名修正 `Premitive` → `Primitive` |
| 2026-04-20 | Paywall Model X（按功能主题路由 A/B/C/D）全文落地 |
| 2026-04-20 | Figma frame `O-06 Initial Sync · Loading` 改名 `Sync · Initial Loading` 避免与 O-06 Terms of Service 编号冲突 |
| 2026-04-20 | 新增图标系统约定（Remix via Open Symbols）、组件库约定（无第三方库）、MCP 配置建议；Figma 图标审计 |
| 2026-04-20 | Figma 批量替换 14 处非标图标为 Remix 标准命名（`chevron` → `arrow-right-s-line`，`switchChevron` → `arrow-up-down-line`）；需手动导出覆盖 `07-Nestory_Figma0420.fig` |
| 2026-04-25 | 技术栈定为 RN + Expo 双端，HANDOFF_GUIDE 全文从 iOS 单端改写为双端表述；图标方案从 Open Symbols 改为 RN 原生包；组件层由 SwiftUI 替换为 RN 原生控件；StoreKit 2 替换为 RevenueCat；Kingfisher 替换为 expo-image |
| 2026-04-25 | dev/ 文件清单与实际命名对齐，新增 06 安全合规、09 环境与 CI 两份文档 |

---

## 📮 联系

- 产品 / 设计：vicol
- 开发：Justin
- 任何关于文档内容的疑问：直接找 vicol，**不要让 AI 工具瞎猜**。
