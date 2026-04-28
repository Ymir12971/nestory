# Vibe Coding 启动简报 · Nestory（iOS + Android 双端）

> **本文件是你的第一份输入。** 进入本项目后，请完整读完本文件再做任何事。
>
> **本文件不是给人看的**，是给你（AI 编码助手）看的工作指令。

---

## 0 · 本交付包范围与文档分工

- **交付边界**：你当前能读到的就是 **`Nestory_Delivery/` 本目录**内的文件（及开发方随后放入的 `dev/`）。**不包含**本目录之外未列出的其它本地资料；实现与对稿**仅以本包内文件 + Figma 为准**。
- **各文档专注什么**：
  - **`01-Nestory_ProductOverview_v1.7.md`（PRD）**：产品定位、核心循环、五态语义、MVP 边界与原则；**少改、偏稳定**。
  - **`02-Nestory_PageStructure_v1.6.md`（Page Structure）**：有哪些页面（O / H / S / HL / ST）、各页**职责与主流程**、**跨页跳转**提纲。**单屏内的布局、控件、间距、逐字文案**以 **`07-Nestory_Figma0420.fig`** 对应 **Page · Frame** 及图层 **annotation** 为准；本文不重复抄录 Figma 已能表达的细节。
  - **`06-Nestory_SubscriptionRules_v1.3.md`（Subscription Rules）**：计费、配额、降级、Paywall 触发点等**可执行订阅规则**。其它文档凡涉及订阅机制，**以 06 为权威**，别处只写指针或一句结论。
  - **`W2-Nestory_StateMatrix_v1.0.md`（State Matrix）**：状态矩阵、Overlays 命名与归类、Notify/Toast 边界、与 01/02/06 交叉引用时的**事实源**之一。
  - **`07` / `08`**：视觉与 Token 的**导出物**；与 Figma variables 冲突时以 **Figma** 为准（见下文「冲突仲裁」）。
- **如何指 Figma**：优先写 **`01 Design System` / `02 Main UI` / `03 States` / `04 Overlays` · `Frame 名`**，便于人类检索；**Node ID 仅作可选辅助**（删节点重建后可能失效，以 frame 名为准回溯）。

---

## 1 · 你是谁

你是一个即将为 **Nestory**（iOS / Android 双端亲子记忆记录应用）产出代码的 AI 编码助手。

**你的第一项任务不是写代码**，而是按本文件的指引读完本目录下的全部文档，建立对项目产品、设计、规则、技术栈的完整理解。只有在用户（产品方 vicol / 开发方 Justin）明确分配具体编码任务之后，你才开始写代码。

---

## 2 · 项目一句话

Nestory 是一款 **iOS / Android 双端 App**（React Native + Expo），让家长记录孩子的日常（照片+文字+Tag/Highlight），按月由 AI 自动生成图文回顾 Story，用户可把特别的时刻 Pin 成 Highlight。核心价值是**低负担、高回忆密度**。

---

## 3 · 读文档的顺序

**按下列顺序分阶段读**，每阶段读完做一次自检。不要一次性加载所有文档。

### Stage 1 · 产品理解
读 `01-Nestory_ProductOverview_v1.7.md`。

读完后你应能回答：
- Nestory 的目标用户是谁？核心循环是什么？
- 订阅**五态**是哪五个？（答案：`Never Paid / Trial Active / Premium Active / Trial Ended / Premium Ended`）
- 「数据不伤害原则」是什么？
- MVP **不做**的事情有哪些？

### Stage 2 · 页面骨架
追加 `02-Nestory_PageStructure_v1.6.md`。

读完后你应能回答：
- 项目有哪些主页面？（O / H / S / HL / ST 五个系列）
- `H-01 Home` 在不同订阅态下的差异是什么？
- Onboarding 是几步？（答案：5 步 `O-01..O-05`；Terms / Privacy / Initial Sync 是非编号的详情 / 过渡页）

### Stage 3 · 订阅规则与边界
追加 `06-Nestory_SubscriptionRules_v1.3.md`。

读完后你应能回答：
- **Paywall Model X** 是什么？（答案：Paywall 按**功能主题**映射到 A/B/C/D 四个变体，**不按订阅状态**映射。同一触发点对 Never Paid 和 Ended 用户指向同一个 Paywall。）
- Highlight 行在 Locked 态下的视觉是什么？（答案：toggle 保持 Off 视觉、**不加锁图标**、caption 用文字表达受限；点击 toggle 触发 Paywall B）
- `{kind}` 占位符的含义是什么？（答案：运行时替换；Trial Ended 用户显示 `"Trial"`，Premium Ended 显示 `"Premium"`）

### Stage 4 · 视觉源头
- `07-Nestory_Figma0420.fig` — Figma 设计源文件。通过 Figma MCP（如果启用）或人工截图读取。包含四页：`01 Design System` / `02 Main UI` / `03 States` / `04 Overlays`。
- `08-Nestory_DesignTokens.json` — Design Token 导出。分两层：`01 Primitive`（原始色 / 数值 / 字符串）和 `02 Tokens`（语义别名，指向 Primitive）。**代码里直接用这份 JSON 作 token 源**，不要硬编码颜色 / 尺寸。

### Stage 5 · 状态精度参考
追加 `W2-Nestory_StateMatrix_v1.0.md`。

这份文档是 01 / 02 / 06 里所有 `StateMatrix §X.Y.Z` 引用的事实源头。包含：
- `§2.7.7` — Paywall Model X 的完整路由表
- `§3` — Bottom Sheets / Modals / Overlays / Inline Banners 分类与命名约定
- `§4` — Notify vs Toast vs Banner 的边界
- `§5` — Figma `03 States` 页的精确坐标布局

遇到前面文档里表述模糊的地方回这里查。

### Stage 6 · 技术栈与实现约束
追加 `dev/` 子目录下的所有文档（由开发方 Justin 准备），覆盖：
- `dev/03_1_Nestory_技术架构文档_v1.3.md` — RN + Expo 版本、Fastify 后端、AI Pipeline、订阅与付费转化
- `dev/03_2_Nestory_目录结构_v2.0.md` — Monorepo 底座（apps/* + packages/{core,ai-pipeline,media,push,ui,db,config,types}）
- `dev/04_Nestory_数据库设计v1.7.md` — Prisma schema、表清单、索引、字段决策
- `dev/05_Nestory_API设计v1.3.md` — Fastify 接口契约、错误码、调用时序
- `dev/06_Nestory_安全与合规_v1.0.md` — 认证、文件上传安全、限流、GDPR/COPPA、密钥轮换
- `dev/09_Nestory_环境与CI_v1.0.md` — 环境变量、签名、CI/CD、监控、错误追踪
- `dev/ARCH-DECISIONS-20260425.md` — 架构选型决策日志（产品底座方向）

> 如果 `dev/` 为空或缺少文件，**停下来问开发方 Justin**，不要用常识猜测技术栈。

---

## 4 · 硬规则（违反 = 代码错误）

以下是贯穿全项目的硬约束。写任何代码前确保每一条都理解：

### 4.1 术语
- **五态**只能写成 `Never Paid / Trial Active / Premium Active / Trial Ended / Premium Ended`。
- **禁用**别名：`Free` / `Paid` / `Expired` / `Subscribed` / `Lapsed` / `Grace`。
- `Ended` = `Trial Ended` ∪ `Premium Ended` 的合集，用 `{kind}` 区分。

### 4.2 Paywall 路由（Model X）
- Paywall 变体 **A / B / C / D** 按**功能主题**映射：
  - **A** = Onboarding 情感入口
  - **B** = Highlights 相关触发
  - **C** = Stories 相关触发（含 S-01 Locked 卡片、ST-01 Renew 入口）
  - **D** = 多档案 / Profile Switcher 相关触发
- **同一触发点对 Never Paid 和 Ended 用户指向同一个变体**。路由逻辑里**不要**按订阅状态分支到不同 Paywall。
- Model X 的完整映射表在 `W2-Nestory_StateMatrix_v1.0.md §2.7.7`。

### 4.3 Notify 类型选择
- **`Type=Warning`**：有 CTA 且引导付费 / 续费的场景（如 S-01、HL-01、ST-03a 的 Ended 常驻 Notify）。
- **`Type=Info`**：中性上下文解释，无 CTA（如 Profile Switcher 的 Ended 态副标题）。
- **不要**用 `Type=Tone4` 或其他自造类型名；Figma 里对应名称是 `Type=Info`。

### 4.4 Locked 态与 `{kind}`
- Highlight 行 Locked 态：toggle 视觉保持 `Off`，**不加锁图标**，caption 用文字表达受限（如 `"Free plan · 10 / 10 Highlights used"`）。
- `{kind}` 是**运行时占位符**，不是静态文案。根据用户实际降级来源（Trial 或 Premium）替换为 `"Trial"` 或 `"Premium"`。
- Caption 文案和 Notify 文案中凡出现 `{kind}` 的地方，必须在渲染层做字符串替换。

### 4.5 Onboarding 结构
- Onboarding **只有 5 步**：`O-01 Welcome / O-02 Create Account / O-03 Permissions / O-04 Add Child / O-05 Choose Plan`。
- `Terms of Service` / `Privacy Policy` / `Sync · Initial Loading` **不是编号步骤**，是详情页和过渡页。
- Figma 原 frame `O-06 Initial Sync · Loading` 已改名为 `Sync · Initial Loading`（避免与 `O-06 Terms of Service` 冲突）。

### 4.6 Design Token
- 颜色 / 尺寸 / 字号 / 圆角 / 间距 **必须**从 `08-Nestory_DesignTokens.json` 读，保留 alias 链（例如 RN 侧实现 `Surface.Card → Primitive.Neutral.White`，不要直接写 `#ffffff`）。
- **禁用**硬编码十六进制色值、魔法数字。

### 4.7 Figma 引用规范
- 提及 Figma 节点时用格式 `page · frame name (ID)`，例如 `02 Main UI · H-01 Home (19:58)`。
- 禁止写裸 ID（如只写 `(19:58)`）。

### 4.8 图标系统
- **唯一来源**：[Remix Icon](https://remixicon.com/)（3058 个图标，MIT 授权）。通过 `@expo/vector-icons` 或直接引入 SVG 资源使用，双端通用。
- **不允许**引入 SF Symbols（Apple 原生集，仅 iOS）、Feather / Lucide / Font Awesome / 任何其他图标库。
- **不允许**自制 SVG 图标。如果 Remix 里找不到合适的图标，**停下来问用户**，由 vicol 决定是加到 Figma 后同步 Remix、还是换一个已有的 Remix 图标表达。
- **引用方式**：图标名称与 Figma frame 的命名完全一致（例如 Figma 里叫 `star-line` 则代码里也叫 `star-line`）。
- **App 图标 / Splash logo 不属于图标系统范畴**，是单独设计的品牌资产，不能从 Remix 取。

### 4.9 组件库
- **不引入第三方 UI 组件库**（NativeBase / React Native Paper / 任何造型类包）。
- 用 **React Native 原生控件**（`View` / `Text` / `TouchableOpacity` / `ScrollView` / `Modal` / `FlatList`…）作为底层，双端通用。
- 在原生控件外包一层 **Nestory 自己的薄封装**（如 `NestoryButton` / `NestoryNotify` / `NestoryToast`），样式从 `08-Nestory_DesignTokens.json` 读 token，不硬编码。
- **允许引入的单一用途开源包**：`expo-image`（图片加载缓存，替代 Kingfisher）、`lottie-react-native`（复杂动画，非必需）、`expo-in-app-purchases` 或 `react-native-purchases`（IAP，双端通用，替代 StoreKit 2）。
- 其他包引入前**必须先征得 vicol 同意**，并写进 `dev/03-TechStack.md`。

### 4.10 MCP 配置建议（Remix Icon 搜索）
- 使用 `remixicon-mcp` 作为 MCP server，让本工具在需要图标时按关键词搜名字，而不是凭感觉猜。
- Cursor / Claude Code 的 MCP 配置片段：
  ```json
  {
    "mcpServers": {
      "remixicon": {
        "command": "npx",
        "args": ["-y", "remixicon-mcp"]
      }
    }
  }
  ```
- 用法示例：找"分享"图标 → 调 `remixicon.search_icons` 传关键词 `share` → 返回候选（如 `share-line` / `share-2-line` / `share-forward-line`）→ 你选一个最贴合语境的 → 代码里用对应的 Remix Icon 名称引用（具体引用方式以 `dev/03-TechStack.md` 为准）。

---

## 5 · 禁止事项

- ❌ 不要发明新订阅状态 / 新 Paywall 变体 / 新 Notify 类型。有歧义**停下来问**。
- ❌ 不要改 Figma 的组件命名约定。
- ❌ 不要在代码里硬编码文案；文案全部来自 Figma 或规则文档，由 Localizable / 常量管理。
- ❌ 不要绕过 Design Token 硬编码颜色 / 尺寸。
- ❌ 不要引入 Remix 以外的图标库、不要自制 SVG 图标、不要用 Apple SF Symbols（仅 iOS，不双端）。
- ❌ 不要引入第三方 UI 组件库。薄封装 + 原生 React Native 控件是唯一路径。
- ❌ 不要用常识或单平台（纯 iOS 或纯 Android）开发惯例覆盖本文档里的明文规则；本文档里写了的规则**优先级最高**。
- ❌ 不要在没读 `dev/` 技术文档之前选型或引入依赖库。

---

## 6 · 冲突仲裁

| 冲突 | 以谁为准 |
|---|---|
| `01-PRD` ↔ `02-PageStructure` 或 `06-SubscriptionRules` | `W2-StateMatrix` |
| `W2-StateMatrix` ↔ `07-Figma` 源文件 | `07-Figma`（视觉事实源头） |
| `08-DesignTokens` ↔ `07-Figma` variables | `07-Figma` |
| 产品侧文档 ↔ `dev/` 开发文档 | 停下来找 vicol 对齐 |

仲裁后，**记录冲突**（在你的回复里明确告诉用户），不要默默修正。

---

## 7 · 读完后的第一件事

**不要立刻写代码**。读完 Stage 1–5（Stage 6 如果 `dev/` 已有内容则也读完）后，向用户汇报：

1. **产品理解**：用你自己的话复述 Nestory 是什么、用户是谁、核心循环。
2. **五态识别**：列出订阅五态及各自的代码含义。
3. **Paywall Model X**：画一张映射表（功能主题 → 变体 → 典型触发点）。
4. **不确定清单**：列出文档里让你感到模糊、矛盾、或需要用户决策的点。
5. **建议的首个任务**：你认为合理的第一个编码切入点是什么。

然后**等待用户确认** / 分配具体任务。

---

## 8 · 持续工作原则

- **每完成一段工作**，把改动摘要告诉用户，包括：动到哪些文件、做了什么取舍、有没有偏离本 README 的规则。
- **发现文档问题**：报告给用户，不要擅自"修正"文档。文档的单一事实源是 vicol（通过 StateMatrix）和 Figma。
- **依赖添加**：所有第三方库引入必须先取得用户同意，并更新 `dev/03-TechStack.md`。
- **任何时候搞不清都可以问**。宁可多问一次，也不要基于假设生成代码。

---

## 9 · 参考资料入口

- 本包内：见 `HANDOFF_GUIDE.md` 了解完整清单
- Figma 文件：`07-Nestory_Figma0420.fig`（优先通过 Figma MCP 访问；若无 MCP，请 Justin 提供导出的页面截图）
- 设计 Token：`08-Nestory_DesignTokens.json`（两层结构：Primitive + Semantic，带 alias 和 resolved value）

---

**开始阅读 `01-Nestory_ProductOverview_v1.7.md`。**
