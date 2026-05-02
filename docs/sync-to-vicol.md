# 致 Vicol · 待确认 / 同步项

> **单一记录源**，按日期组织。
> 每条问题都标了"问题 / 临时方案 / 需要 vicol 决策"。确认后请在条目末尾注明日期 + 结论，或回 Justin 让他更新代码。
> 已确认的条目用 ~~删除线~~ + 结论行保留作历史。

---

## 2026-05-01

### ~~Q5 · 双层删除 UX 流程缺设计稿（🔴 高）~~

**背景**：决策 5（见 `docs/dev/ARCH-DECISIONS-API-DB-20260501.md`）引入"软删 + 30 天恢复窗"机制，**Figma 里完全没这个流程**。

**适用范围**：users / children / raw_assets（Memory）/ highlights — 用户主动删除这些资源时默认走软删，30 天后 cron 物理清除；用户可在窗口期内恢复。

**当前 API 行为**：
- `DELETE /resource/:id` → 软删（默认）
- `DELETE /resource/:id?hard=true` → 硬删（"最近删除"页二次确认才能触发）
- `POST /resource/:id/restore` → 恢复
- `GET /resource/trash` → 列出软删项

**需要 vicol 决策的 UX 问题**：

1. **"最近删除"列表入口在哪**：
   - 选 a：Settings → Data & Privacy 下加一行 "Recently Deleted"
   - 选 b：Memory List / Highlights / Profile List 各页顶部加 "Trash" 入口
   - 选 c：合并到一个 Trash 全局页（跨资源类型）
2. **删除按钮文案**：当前 H-04 / HL-02 上是 "Delete Memory" / "Remove Highlight"，是否改为 "Move to Trash"？
3. **硬删（"Delete Forever"）入口**：仅在 Trash 列表内提供，还是允许从详情页直接 hard delete？
4. **30 天倒计时怎么展示**：Trash 列表每条上显示 "Auto-delete in 22 days"？还是不显示？
5. **恢复后的位置**：恢复一个软删的 Memory 后，回到原月份位置还是新加到当月？
6. **多档案场景**：删孩子档案进 Trash，期间该档案的 Memories 是否还能看？（当前实现：父档案软删后子查询会被 middleware 过滤掉，相当于不可见）

**临时实现**：mobile 还没接 trash UI；当前 API 已经支持，但屏幕上还没有"最近删除"入口。

**确认 (vicol, 2026-05-01)**：MVP **不做** Trash / 恢复窗。Memory / Highlight 用户删除时**直接彻底删除**，不走软删路径，不暴露 trash / restore 入口。users / children 的软删策略待 Justin 单独评估后对齐。

---

### ~~Q6 · R-08 历史月份 Memory 编辑限制的 UX 表达（🟠 中）~~

**背景**：R-08 规定历史月份的 Memory 不可编辑/删除（避免影响已生成的 Story 内容连贯性）。

**API 已实现**：`PATCH /assets/:id` 和 `DELETE /assets/:id` 在历史月份直接返回 `403 STORY_READ_ONLY`。

**当前 mobile 行为**：进入历史 Memory Detail 时，编辑按钮静默 disabled（仅靠服务端返回的 `isEditable: false` 字段判断），用户没有任何提示。

**需要 vicol 决策**：是否需要在历史 Memory 详情页加一个 banner / tooltip 说明"This memory is from a past month and can no longer be edited"？还是保持静默？

**确认 (vicol, 2026-05-01)**：**不新增**额外提示组件。H-03 列表层不区分只读/可编辑为预期行为。以 **Figma H-04 Memory Detail (Read Only)** 为准对齐实现；若当前仅静默 disabled 且与 Figma 只读态不一致，按 Figma 调整。

---

### ~~Q7 · Subscription 5 态命名的 user-visible 文案审核（🟡 低）~~

**背景**：决策 2 把订阅状态确定为 5 态枚举：

| 后端字段 | mobile 当前 user-facing 显示 |
|---|---|
| `never_paid` | "Free Plan" |
| `trial_active` | "Premium" + "Active" badge |
| `premium_active` | "Premium" + "Active" badge |
| `trial_ended` | "Premium" + "Renew" badge + 灰色文案 "Expired Jan 15, 2026" |
| `premium_ended` | "Premium" + "Renew" badge + 灰色文案 "Expired Jan 15, 2026" |

**需要 vicol 确认**：上面 user-facing 文案是否符合 Figma 原意；尤其 `trial_ended` 和 `premium_ended` 是否要展示"曾经订阅过"的差异（目前显示一样）。

文档处：`SubscriptionRules v1.3` R-10 章节。

**确认 (vicol, 2026-05-01)**：`trial_ended` 和 `premium_ended` **不需要区分**，UI 展示保持一致（均显示 Renew / Expired 语境）。当前实现正确，无需改动。

---

## 2026-04-30

### ~~Q1 · 品牌绿背景上的文字颜色缺 Semantic Token（🟠 中）~~

**出现位置**：`02 Main UI · O-02 Sign In (58:57)`，以及所有使用 `Surface.Brand`（Primary/500）作为背景的屏幕。

**Figma 实际使用**：
- 副标题 / body 文字：`Color.Primary.100`（`#d1f5de`）
- footer 强调链接文字：`Color.Primary.50`（`#edfbf2`）

**问题**：`02 Tokens` 语义层里没有这两个颜色的 Semantic alias。现有最接近的：
- `Surface.Brand-Subtle` = `Color.Primary.50` → 但这是 Surface 用途，不是 Text
- `Text.OnColor` = `Neutral.White` → 颜色不匹配

**当前临时方案**（开发侧自定义，待覆盖）：
- `text.onBrandSubtle` = `palette.primary[100]`（`#d1f5de`）
- `text.onBrandEmphasis` = `palette.primary[50]`（`#edfbf2`）

**需要 vicol 决策**：是否在 `02 Tokens` 里补充 `Text.OnBrand-Subtle` 和 `Text.OnBrand-Emphasis` 两个 Semantic alias？确认后 Justin 会替换为正式 token 名。

**确认 (vicol, 2026-05-01)**：无语义 Token 时**以 Figma 色值为准**，不强制升格为 Token。当前开发侧临时方案（`palette.primary[100]` / `palette.primary[50]`）**可保持**，MVP 阶段不需要替换为正式 token 名。

---

### ~~Q2 · O-01 Welcome hero 三色渐变不在 Token 系统里（🟡 低）~~

**出现位置**：`02 Main UI · O-01 Welcome (58:38)` hero 区域背景。

**Figma 实际使用**：三色渐变
- `#14171c`（0%）
- `#47291a`（55%）
- `#d98c38`（100%）

**问题**：这三个颜色均不在 `01 Primitive` 或 `02 Tokens` 中。它们不属于 Primary / Accent / Neutral / Notify 任何一个调色板。

**当前临时方案**：作为 one-off 直接写在 `WelcomeScreen.tsx` 的 `LinearGradient` 里，不经过 token。

**需要 vicol 决策**：
1. 这是设计稿特意使用的 one-off 值，不需要进 token，保持现状？
2. 还是需要加入 `01 Primitive` 作为命名色（例如 `Hero.Dark` / `Hero.Mid` / `Hero.Warm`）并在 `02 Tokens` 补充 semantic alias？

**确认 (vicol, 2026-05-01)**：one-off 渐变**无需 token 化**，`WelcomeScreen.tsx` 直接写色值的方式正确，保持现状。

---

## 2026-04-25 · 技术栈定为 RN/Expo 双端

> 历史同步项 — **vicol 已回复（2026-05-01）**：图标以 Remix Icon 为准，双端一致；Justin 需复核 Android 交付方式。
>
> **Justin 复核结论（2026-05-01）**：`react-native-remix-icon` v4.7.0 用 SVG 矢量组件交付（非字体文件），底层依赖 `react-native-svg`，iOS / Android 渲染路径完全一致，无平台差异，无已知限制。

### 1. App 是 iOS + Android 双端，不是纯 iOS

技术栈选的是 React Native + Expo，一套代码同时编译 iOS 和 Android。产品文档（README 和 PRD）之前一直写 "iOS app"，已统一修正。

**对设计影响**（vicol 知悉即可，不需要出两套稿）：
- **返回手势**：iOS 右滑返回，Android 系统返回键 / 左滑；Bottom Sheet 关闭手势也有差异
- **底部安全区**：iOS 有 Home Indicator，Android 各机型不同
- **系统弹窗风格**：相机 / 相册权限弹窗、Action Sheet — RN 自动走平台原生样式，不需要画两套
- **字体**：iOS 默认 SF Pro，Android 默认 Roboto；Nestory 用自定义字体（Manrope + Inter）已统一

MVP 阶段以 iOS 设计稿为主，平台差异由开发处理。如某交互需特别说明，请在 Figma annotation 里注明 "iOS/Android 行为不同，开发按平台处理"。

### 2. 图标系统调整（不影响 vicol）

原方案是把 Remix Icon 封装成 SF Symbols 格式 → 现改为直接用 Remix Icon 的 React Native 包。Figma 里继续用 Remix Icon 命名规则，**不要用 SF Symbols**（Android 不支持）。

### 3. 组件库原则不变

薄封装 + Design Token 驱动，底层从 SwiftUI 换成 React Native 原生控件。Token JSON（`08-Nestory_DesignTokens.json`）继续是颜色 / 尺寸 / 字号的唯一来源。

### 4. Story 分享页（H5）独立

Story 详情页是独立 H5 页面，Next.js + Vercel 部署。App 内 WebView 内嵌，外部分享链接直接打开。如后续要出 Story H5 设计稿，单独在 Figma 处理。

---

## 使用约定

- **新增条目**：在最新日期 section 顶部加（按日期倒序）
- **vicol 回复后**：在条目末尾追加 "**确认 (vicol, YYYY-MM-DD)**：<结论>"，整条用 ~~删除线~~ 标记，但保留以备查
- **超过 30 天未回复**的高优先级问题，Justin 应主动提一次 reminder
