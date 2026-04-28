# Nestory 订阅与权限规则文档

**Subscription & Permission Rules**


| 项目       | 内容                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------- |
| **文档版本** | v1.3                                                                                                     |
| **创建日期** | 2026-04-20                                                                                               |
| **上一版本** | v1.2（2026-04-03）                                                                                         |
| **前置依赖** | `01-Nestory_ProductOverview_v1.7.md`、`02-Nestory_PageStructure_v1.6.md`、`W2-Nestory_StateMatrix_v1.0.md` |
| **编写者**  | Vicol                                                                                                    |


---

## 版本变更记录

### v1.3（2026-04-20）

基于 Figma 设计稿落地与 `StateMatrix v1.0` §2.7 订阅状态交叉矩阵反推，对订阅状态语义、Ended 态行为、触发机制等条目做系统性修订：

- **订阅状态定义扩展**：从"Free / Premium / 降级"三分法扩展为五态语义——`Never Paid` / `Trial Active` / `Premium Active` / `Trial Ended` / `Premium Ended`（后两者合称 `Ended`）。全文用词同步更新
- **R-01 Story 生成**：补 `Trial Active` 行为（等同 `Premium Active`，生成无水印，不消耗配额）
- **R-04 Highlights 上限**：(a) 触发机制从"Toggle 点击时直接拦"改为"Locked 态预告 caption + 点击 toggle 弹 Paywall B"（H-02 / H-04 编辑模式同）；(b) HL-01 提示条文案扩展为 4 场景（Never Paid / Ended count ≥ 10 / Ended count < 10 / Premium·Trial）
- **R-05 档案限制**：Ended 态**所有档案可点击切换**（不置灰，兑现"数据不伤害"品牌承诺），底部 CTA 指向 Renew Premium → Paywall D；`非活跃档案置灰`规则仅对 Never Paid 生效
- **R-10 降级 Toast → 降级 Notify**（重写）：原"首次打开 App 触发一次 `Toast · Premium Ended`"改为"降级后在 S-01 / HL-01 / ST-03a 顶部常驻 `Notify Type=Warning`（带 CTA），在 Profile Switcher Ended 顶部常驻 `Notify Type=Info`（无 CTA）"；`Toast · Premium Ended` 组件已废弃；`{kind}` 运行时切 "Trial" / "Premium"
- **Paywall 路由改为模型 X**（全章统一）：触发点映射 Paywall 变体按**功能主题**（Stories / Highlights / 多档案），不看订阅状态。HL-01 四场景全部 → Paywall B；Profile Switcher Free 与 Ended 底部 CTA、ST-03a 顶部 Notify CTA 全部 → Paywall D；S-01 锁定卡片 / S-01 topNotify / H-01 进度文字链全部 → Paywall C。详见 `StateMatrix §2.7.7`
- **Notify Type 全章勘误**：所有旧 `Notify Type=Tone4` 统一为 `Type=Info`（Figma DS 实际变体名）；Profile Switcher Ended 的 Notify 由 `Warning` 修正为 `Info`（Figma instance name `"Info message"`，中性语境条，CTA 在 sheet 底部按钮）
- **触发点 B / C / D 机制更新**：按模型 X 重写触发位置与变体映射，并覆盖 Ended 状态
- **ST-03a 顶部 Notify 整合**：Figma 只画一版 `Type=Warning` 原生 INSTANCE（Never Paid / Ended 共用，运行时控制显隐），不拆 Free / Ended 双 frame
- `**+ Add Child` 按钮**：明确所有订阅状态均可点击（不做 disabled 态），兑现"数据不伤害"承诺
- **第四章技术实现位置**：R-10 从 Toast 实现改为 Notify 常驻；R-04 补"Locked caption 运行时 `{kind}` 切换"实现说明；R-11 补"Trial 资格按 `never_paid` 独占"说明；Paywall 触发点按模型 X 重写
- **全文加 StateMatrix 脚注**：订阅状态相关规则附"详见 StateMatrix §2.7 / §2.7.7"指针，双向可达

**（2026-04-21 小版本补丁，不升版）** — 与 `PageStructure v1.6` / `StateMatrix v1.0` / `ProductOverview v1.7` 对齐的 **产品语义** 补充（**不改变** R-04 配额数字与 Paywall B 路由）：Highlight **不再有独立长文 Note 字段**；H-02 / H-04 的 Highlight 交互以 **`Select Highlight Cover` + `Change cover photo`** 为准；HL-02 标题以 **AI 提取 + 用户 Sheet 覆写** 为准。R-04 **Save 时**后端校验 Highlight 总数、`HIGHLIGHT_LIMIT_REACHED` 等机制**保持不变**。

### v1.2（2026-04-03）

- **R-01 Story 生成配额**：触发时间从"每月最后一天 UTC 00:00"改为"用户本地时区次月 1 日 00:00"；补充后端按 timezone 分组调度说明

### v1.1（2026-04-02）

- **R-04 Highlights 上限**：明确降级用户规则——与 Free 共用 count ≥ 10 判断逻辑；新增 HL-02 Remove Highlight 操作说明
- **R-05 档案限制**：后端不限制档案创建数量，仅在切换时校验身份
- **R-09 Onboarding 档案创建**：对齐 R-05 变更，明确后端全程不拦截创建
- **新增 R-10**：降级用户首次打开 App 的 Toast 通知规则
- **新增 R-11**：Free Trial 资格规则（平台管理，每账户一次）
- **Milestone 概念删除**：全文删除 Milestone 相关引用
- **第四章技术实现位置**：R-04 补充 HL-02 删除操作的前后端拦截说明；R-05 更新后端校验说明
- **R-05 档案限制**：H-01 切换逻辑从"直接弹 P-01"改为"Bottom Sheet 置灰 + 提示 + Upgrade"；ST-01 档案管理对所有用户开放编辑，添加按钮对非 Premium 禁用

---

**重要说明：**
本文档使用中文撰写，但 Nestory 产品的全线用户界面、文案、交互内容均使用英文呈现。

---

# 第一章 — 规则总览表

快速参照表，覆盖所有权限维度。详细的触发条件、系统行为、用户体验见第二章。

> **订阅状态语义**（本文档全文通用，详见 `StateMatrix §2.7`）：
>
> - `Never Paid`：从未付费，Free 用户（包含 Onboarding 选 "Start with Free" 的新用户）
> - `Trial Active`：Free Trial 期间，权益等同 `Premium Active`
> - `Premium Active`：已付费且未到期
> - `Trial Ended` / `Premium Ended`：曾付费（Trial 或订阅）到期后回到 Free，统称 `**Ended`**
>
> **权益判断逻辑**：`Trial Active` = `Premium Active`（生成无水印、无限 Highlights、无限档案、附加特权）；`Ended` 在数量限制上等同 `Never Paid`，但**已有数据全部保留且可访问**（已生成 Story / 超 10 个 Highlights / 超 1 个档案）


| #    | 规则域             | Never Paid                                        | Trial / Premium Active               | Ended（Trial Ended / Premium Ended）                                                                                                                  |
| ---- | --------------- | ------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | Story 生成        | 配额模型，初始 2 份；每月底生成消耗 1 份；归零后不再生成                   | 每月生成，无限制                             | 配额 = 0，不重置，不生成                                                                                                                                      |
| R-02 | Story 水印        | 带 Nestory 水印                                      | 无水印                                  | 已生成 Story 保持原状态（付费/Trial 期间无水印永久无水印；Free 期间带水印永久带水印）                                                                                                |
| R-03 | 已生成 Story 访问    | ✅ 可阅读所有已生成 Story                                  | ✅ 可阅读                                | ✅ 可阅读所有已生成 Story（不锁定、不回收）                                                                                                                           |
| R-04 | Highlights      | 上限 10 个；Locked 态预告 caption + 点 toggle → Paywall B | 无限制                                  | 同 Never Paid（count ≥ 10 不可新增）；已超 10 个的保留展示；Locked caption 文案切 Ended 版                                                                               |
| R-05 | 孩子档案            | 1 个活跃档案；Profile Switcher 非活跃档案置灰（创建不限制）           | 无限制                                  | **所有档案保留且可切换**（不置灰，兑现"数据不伤害"）；底部 CTA 指向 Renew Premium → Paywall D                                                                                   |
| R-06 | 附件特色功能          | ✘ 不可用                                             | ✔ 事件触发型（如 Birthday Celebration Push） | ✘ 不可用                                                                                                                                               |
| R-07 | Memory 上传       | 无限制                                               | 无限制                                  | 无限制                                                                                                                                                 |
| R-08 | Memory 编辑 / 删除  | 当月可编辑删除，历史只读                                      | 同 Never Paid                         | 同 Never Paid                                                                                                                                        |
| R-09 | Onboarding 档案创建 | 不限数量（限制仅在进入 Home 后生效）                             | N/A                                  | N/A                                                                                                                                                 |
| R-10 | 降级后 UI 提示       | —                                                 | —                                    | S-01 / HL-01 / ST-03a 顶部常驻 `Notify Type=Warning`（带 CTA，按模型 X 路由）；Profile Switcher Ended 顶部常驻 `Notify Type=Info`（无 CTA，Renew 在 sheet 底部按钮）；重新订阅后自动消失 |
| R-11 | Free Trial 资格   | 首次订阅享受一次                                          | 平台管理                                 | N/A（Ended 用户再次订阅不再享受 Trial，由平台判定）                                                                                                                   |


---

# 第二章 — 逐条规则详述

每条规则按三要素展开：**触发条件 → 系统行为 → 用户体验**。

---

## R-01 · Story 生成配额

### 触发条件

用户本地时区次月 1 日 00:00 触发 Story 生成任务。后端按用户 timezone 字段分组，hourly cron 检查哪些时区刚进入次月，对该批次用户执行生成判断。

### 系统行为

判断逻辑（后端生成任务）：

```
if subscription_status in (premium_active, trial_active):
    生成 Story，无水印
elif story_quota > 0:
    生成 Story，带水印
    story_quota -= 1
else:
    不生成
```

字段说明：

- `subscription_status`：当前订阅状态，取值 `never_paid` / `trial_active` / `premium_active` / `trial_ended` / `premium_ended`
- `story_quota`：`never_paid` 用户 Story 配额，新用户初始值 = **2**
- `trial_active` / `premium_active` 用户不消耗配额（按 `subscription_status` 判断，不走 quota 分支）
- `trial_ended` / `premium_ended`（统称 `Ended`）用户 `story_quota` 设为 **0**，不重置
- `Trial` 期间按 `Premium Active` 待遇处理；到期后转为 `Trial Ended`

### 用户体验


| 订阅状态                                     | S-01 当月状态卡片                                        | 说明                                                                           |
| ---------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Never Paid`（配额 > 0）                     | 状态一/二（正常收集态）                                       | 月底正常生成，带水印                                                                   |
| `Never Paid`（配额 = 0）                     | 状态三（锁定态），可点击 → P-01（触发点 C）                         | 文案："You've used your 2 free Stories. Upgrade to keep recording every month." |
| `Trial Active` / `Premium Active`        | 状态一/二（正常收集态）                                       | 每月正常生成，无水印                                                                   |
| `Ended`（`Trial Ended` / `Premium Ended`） | 状态三（锁定态），同 Never Paid 配额 = 0；另外顶部常驻 Notify（见 R-10） | 当月卡片点击 → P-01 触发点 C                                                          |


> 详见 `StateMatrix §2.7.3`（S-01 跨订阅状态交叉矩阵）

---

## R-02 · Story 水印规则

### 触发条件

Story 生成时根据用户身份决定是否添加水印。

### 系统行为

- `subscription_status in (trial_active, premium_active)` → 生成无水印 Story
- `subscription_status == never_paid && story_quota > 0` → 生成带水印 Story
- `subscription_status in (trial_ended, premium_ended)` → 不生成（详见 R-01）
- Story 一旦生成，其水印状态**永久锁定**，不因后续身份变化而改变

### 用户体验

- `Never Paid` 用户：S-02 Story Detail 内容带 Nestory 水印；分享链接同样带水印
- `Trial/Premium Active` 用户：无水印
- `Ended` 用户：付费/Trial 期间生成的 Story 永久无水印；Free 期间生成的 Story 永久带水印

---

## R-03 · 已生成 Story 访问权限

### 触发条件

用户在 S-01 点击任何已生成的 Story 卡片。

### 系统行为

- **所有已生成 Story 均可访问**，无论用户当前是 Free、Premium 还是降级用户
- 后端不对已生成 Story 的阅读做身份校验
- 锁定仅发生在**当月状态卡片**（配额 = 0，Story 无法生成）和**"未生成"卡片**（历史月份有 Memory 但未生成 Story 的月份）

### 用户体验

S-01 历史 Story 卡片状态表（仅 2 种）：


| 状态  | 适用场景                     | 视觉                | 点击行为                |
| --- | ------------------------ | ----------------- | ------------------- |
| 已生成 | 所有已正常生成的 Story（无论用户当前身份） | 封面图 + 月份标题 + 简短摘要 | → S-02 Story Detail |
| 未生成 | 有 Memory 但 Story 未生成的月份  | 缺省占位图（灰调 / 虚线）    | 不可点击                |


**"未生成"卡片补充说明：**

- 文案："No Story was created for [Month]."
- 底部轻量文字链："Upgrade to generate Stories every month →"（点击 → P-01），不作为卡片整体点击行为

---

## R-04 · Highlights 数量限制

### 触发条件

非 `Trial/Premium Active` 用户（即 `Never Paid` 或 `Ended`）在以下入口尝试标记 Highlight：

- H-02 Add Memory "Mark as Highlight" Toggle
- H-04 Edit Memory 编辑模式 Toggle

当 `current_highlight_count >= 10` 时拦截。

### 系统行为

判断逻辑（前端 + 后端双重校验）：

```
if subscription_status in (trial_active, premium_active):
    允许新增（无上限）
else:  # never_paid / trial_ended / premium_ended
    if current_highlight_count >= 10:
        Toggle 呈 Locked 态（预告 caption），点击 → 触发 P-01（触发点 B）
    else:
        允许新增
```

**触发机制（v1.3 修订）：**

- **原逻辑（v1.2）：** Toggle 点击时直接拦 → 弹 Paywall。用户不知道为什么点不动
- **新逻辑（v1.3）：** Toggle 在可见层面就呈 Locked 态（图标 + 预告 caption 如 "Upgrade to save unlimited highlights"），点击才弹 Paywall B。用户先知情后决策
- **前端拦截：** Toggle 点击若本地缓存 `highlight_count >= 10` → 弹出 P-01，不发请求
- **后端校验：** Save 时检查 Highlight 总数，count ≥ 10 → 拒绝写入，返回 403 + `HIGHLIGHT_LIMIT_REACHED`
- `Never Paid` 与 `Ended` 用户共用同一判断逻辑，不区分身份；仅 caption 文案可能切 Ended 版

**Remove Highlight 操作：**

- 入口：HL-02 Highlight Detail 页面
- 所有用户可用（任何订阅状态）
- 取消 Highlight 标记，Memory 本身不删除，count -1
- 后端接口：取消该 Memory 的 Highlight 标记，更新计数

### 用户体验

**H-02 Add Memory / H-04 编辑模式 Highlight 行 Locked 态（以 Figma `02 Main UI · H-02 / highlightRow · States · Locked` 为准）：**

- 非 `Trial/Premium Active` 且 count ≥ 10 → 行呈 Locked 态（**toggle 视觉保持 Off、不置灰、不换图标** + 行下方 Text/Secondary caption）
- caption 文案（Figma 只画 Never Paid 版作为 canonical，Ended 运行时替换）：
  - `Never Paid`：`"Free plan · 10 / 10 Highlights used"`
  - `Ended` 且 count ≥ 10：`"{kind} ended · 10 / 10 Highlights used"`（`{kind}` = Trial / Premium，运行时按降级来源切换，不拆 frame）
  - `Ended` 且 count < 10：caption 不显示（行正常可点）
- 点击 Toggle → 弹出 P-01 **Paywall B**（触发点 B；无论 Never Paid 还是 Ended 统一路由，按 `StateMatrix §2.7.7` 模型 X 按功能主题映射）
- P-01 关闭后 → 当前 Memory 保留为普通 Memory

**HL-01 Highlights Gallery 顶部提示条（以 Figma `02 Main UI · HL-01 / topNotify · States` 为准，4 场景互斥）：**


| 场景 (Figma frame 名)                                   | 触发                        | Notify Type | 文案                                                                                                         | CTA →         |
| ---------------------------------------------------- | ------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- | ------------- |
| `Scenario 1 · Free 10/10`                            | `Never Paid` + count = 10 | `Warning`   | `"10 / 10 Highlights used. Upgrade for unlimited. →"`                                                      | **Paywall B** |
| `Scenario 2 · Ended Under Limit`                     | `Ended` + count < 10      | `Warning`   | `"Premium ended — new Highlights capped at 10. Upgrade for unlimited. →"`                                  | **Paywall B** |
| `Scenario 3 · Ended At Limit`                        | `Ended` + count = 10      | `Warning`   | `"Premium ended — you've reached the Free limit of 10. Upgrade to add more. →"`                            | **Paywall B** |
| `Scenario 4 · Ended Over Limit`                      | `Ended` + count > 10      | `Warning`   | `"Premium ended — your existing Highlights are safe. New ones are capped at 10. Upgrade for unlimited. →"` | **Paywall B** |
| 其他（`Trial/Premium Active` / `Never Paid` count < 10） | —                         | 不显示         | —                                                                                                          | —             |


- **互斥优先级**：④ > ③ > ② > ①（Ended 语境覆盖 Never Paid 配额提示）
- **Paywall 路由**：4 个 Scenario 全部 → Paywall B（HL-01 上下文 = Highlights 配额主题）
- `**{kind}` 运行时**：Figma 里 Scenario 2/3/4 硬编码 `"Premium ended —"`，运行时 `Trial Ended` 替换为 `"Trial ended —"`，不拆 frame

**HL-02 Highlight Detail：**

- 底部 "Remove Highlight" 文字链 → Bottom Sheet 二次确认
- 确认后返回 HL-01，卡片移除

> 详见 `StateMatrix §2.7.4 / §2.7.6 / §2.7.7`（HL-01 / HL-02 跨订阅状态交叉矩阵、Locked caption、Paywall 路由模型 X）

---

## R-05 · 孩子档案数量限制

### 触发条件

Free 用户在以下入口尝试切换或添加孩子档案：

- H-01 顶部档案切换入口
- ST-01 Settings 添加孩子入口

### 系统行为

- **前端拦截：** 检查 `subscription_status`
  - `never_paid` → Profile Switcher 中非活跃档案置灰（0.6 opacity + Premium badge）不可选，底部 Upgrade CTA → **Paywall D**（多档案主题，按 `StateMatrix §2.7.7` 模型 X 统一）
  - `trial_active` / `premium_active` → 正常操作，所有档案全亮可切换
  - `trial_ended` / `premium_ended`（`Ended`）→ **所有档案可点击切换**（兑现"数据不伤害"承诺），视觉上非活跃档案仍保持 0.6 opacity + Premium badge（与 Free 一致），但点击可正常切换；底部 CTA 文案改 "Renew Premium" → **Paywall D**
- **后端不限制档案创建数量**，所有订阅状态的用户均可创建多个档案
- **切换接口校验**：
  - `never_paid` 切换非当前档案 → 返回 `403` + 错误码 `PROFILE_SWITCH_RESTRICTED`
  - `trial_active` / `premium_active` / `Ended` → 允许切换

### 用户体验

**H-01 Home（多档案时）· Profile Switcher 三态（以 Figma `04 Overlays · H-01 / Sheet · Profile Switcher` 为准）：**

- `Never Paid`（Free，`257:218`）：非活跃档案半透明 0.6 + Premium badge，点击无效；subtitle 纯文本 `"Free plan supports one active profile. Upgrade to switch between them."`；底部 CTA = "Upgrade to Premium" → **Paywall D**
- `Trial/Premium Active`（Premium，`257:265`）：所有档案全亮，无 badge，直接点击切换；无底部 CTA
- `Ended`（`418:243`）：非活跃档案视觉同 Free（0.6 opacity + Premium badge），**但可点击切换**；subtitle 用 `Notify Type=Info`（**不是 Warning** — Figma instance name `"Info message"`）文案 `"Premium ended. All your profiles are still here — renew to keep switching freely."`；底部 CTA = "Renew Premium" → **Paywall D**
  - 与 Free 视觉差异仅两点：(1) subtitle 容器换 `Notify Type=Info` 组件；(2) CTA 文案
  - Profile Switcher Ended 用 Info 而非 Warning，因为 CTA 在 sheet 底部按钮（不在 Notify 条上），Notify 只做中性语境解释；区别于 S-01 / HL-01 / ST-03a 顶部带 CTA 的 Warning 挽回条。详见 `StateMatrix §3.4` "Warning vs Info 的用法"

**ST-01 Settings → ST-03a Child Profile List → ST-03 编辑：**

- 所有订阅状态的用户可查看和编辑任意孩子的档案信息，无身份限制
- `Never Paid` / `Ended`：ST-03a 顶部内置 `Notify Type=Warning`（Figma base body 里的 INSTANCE `172:958`），文案 `"Free plan supports one active profile. You can add more, but switching requires Premium."` + CTA `"Upgrade to keep the story going →"` → **Paywall D**（Figma 只画一版 Notify，Never Paid 和 Ended 共用）
- `Trial/Premium Active`：ST-03a 顶部 Notify 运行时隐藏
- 添加孩子：所有订阅状态 `+ Add Child` 按钮均可点击（不做 disabled），仅 Never Paid 的新增档案在 H-01 切换受限

**Ended 用户行为小结：**

- 超出 1 个的档案数据全部保留且**全部可切换**（Profile Switcher 档案卡可点）
- H-01 切换行为 = `Premium`（切换本身无拦截），仅 UI 层通过 Notify + CTA 引导 Renew
- ST-01 编辑行为同所有用户（无限制）
- 默认激活最近使用的档案（而非"最早创建的"，避免降级后体验断裂）

### 默认激活规则

- 首次进入 H-01（冷启动）：激活**最近使用的档案**（session last_active）；若无记录，取最早创建的档案
- 降级转 `Ended` 时：保持当前活跃档案不变（不强制切换到第一个档案）

> 详见 `StateMatrix §2.7.2`（H-01 / Profile Switcher 三态交叉矩阵）、`§3.1 Bottom Sheets`（Profile Switcher 三变体 `257:218` / `257:265` / `418:243`）

---

## R-06 · 附件特色功能访问控制

### 触发条件

系统在特定事件发生时（如孩子生日当天）判断是否触发特色功能。

### 系统行为

- **后端校验：** 事件触发时检查 `subscription_status`
  - `premium` → 触发功能（如推送 Birthday Celebration 卡片）
  - `free` / 降级 → 不触发，静默跳过

### 用户体验

- Premium 用户：在特定时刻收到推送 / 弹窗
- Free / 降级用户：无感知，不提示"你错过了"
- Paywall 和对比表中保留文字描述："Extra Features (e.g., Birthday Celebrations)"

---

## R-07 · Memory 上传（无限制）

### 触发条件

任何用户在 H-02 Add Memory 页面执行 Save。

### 系统行为

- **不做身份校验，Free / Premium / 降级用户均无上传数量限制**
- 单条 Memory 约束（非权限规则，而是技术约束）：
  - 照片最多 10 张 / 条
  - 单张照片最大 10MB
  - 格式：JPEG / PNG / HEIF
  - 文字上限 500 字符

### 用户体验

- 超出单条限制时：Toast 提示（如 "Maximum 10 photos per memory."），不弹 Paywall
- 本条规则明确写入文档的目的是告诉工程实现：**上传环节不插入任何权限拦截逻辑**

---

## R-08 · Memory 编辑 / 删除权限

### 触发条件

用户在 H-04 Memory Detail 点击 "Edit" 或 "Delete Memory"。

### 系统行为

- **当月 Memory：** 可编辑（照片、文字、Tag、Highlight 标记）、可删除
- **历史月份 Memory（Story 已生成 / 未生成）：** 只读，不可编辑、不可删除
- 判断依据：Memory 所属月份是否为当前自然月
- **与订阅身份无关，Free / Premium / 降级用户规则一致**

### 用户体验

- 当月 Memory：H-04 右上角显示 "Edit" 入口
- 历史月份 Memory：H-04 隐藏 "Edit"，显示只读 Banner
  - Story 已生成月份文案："This memory was used to create a Story. We keep it as-is to preserve the authenticity of your records."
  - Story 未生成月份文案："This memory is part of your past records and can no longer be edited."

---

## R-09 · Onboarding 阶段特殊规则

### 触发条件

新用户进入 O-03 Create Child Profile 页面。

### 系统行为

- 后端全程不限制档案创建数量（已在 R-05 中统一定义）。Onboarding 阶段的特殊行为仅为：Free 用户创建第 2 个档案时前端显示 inline 提示。
- 档案数量限制仅在进入 H-01 Home 后生效
- Free 用户创建第 2 个档案时，前端显示 inline 提示（仅提示，不阻断）

### 用户体验

- Free 用户点击 "Add Another Child" 成功保存第 1 个档案后，页面顶部显示 inline 提示条
- 文案："Free plan supports one active profile. You can add more now, but switching requires Premium."
- 视觉：低权重信息条，不阻断操作，不弹窗
- 目的：用户知情，避免后续在 H-01 发现切换锁定时产生被欺骗感

---

## R-10 · 降级后 UI 常驻提示（Notify）

### 触发条件

用户订阅到期，身份从 `Trial Active` / `Premium Active` 变更为 `Trial Ended` / `Premium Ended`（统称 `Ended`）。

### 系统行为

**v1.3 重写（由 Toast 改为 Notify 常驻）：**

- 原方案（v1.2）：首次打开 App 触发一次 `Toast · Premium Ended`，5 秒后自动消失。问题：用户错过就看不到，降级状态无持续提示
- 新方案（v1.3）：降级后在多个位置常驻 `Notify`，直到用户重新订阅。**注意**：Notify 的 `Type` 按"是否带 CTA 挽回"分两类使用（Warning / Info），并非一套规则
- `Toast · Premium Ended` 组件**已废弃**（Figma `04 Overlays · Toasts` 中移除）

### 出现位置与 Notify Type 对照表（以 Figma 为准）


| 位置                                          | Figma 引用                                                                                        | Notify Type              | 文案                                                                                                                                       | CTA →                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `S-01 / topNotify · States`                 | `02 Main UI · S-01 / topNotify · States` (`392:853`)                                            | `Warning`                | `"Premium ended — your Stories will pause next month. Upgrade to keep them going. →"` / `"Trial ended — ..."` 两版子 frame                  | Paywall C                     |
| `HL-01 / topNotify · States` Scenario 2/3/4 | `02 Main UI · HL-01 / topNotify · States` (`394:859`)                                           | `Warning`                | Figma 里硬编码 `"Premium ended —"`，`{kind}` 运行时替换                                                                                            | Paywall B                     |
| `ST-03a` 顶部内置 Notify                        | `02 Main UI · ST-03a Child Profile List` base body (`172:958`)                                  | `Warning`                | `"Free plan supports one active profile. You can add more, but switching requires Premium."` + CTA `"Upgrade to keep the story going →"` | Paywall D                     |
| `H-01 Sheet · Profile Switcher · Ended` 顶部  | `04 Overlays · H-01 / Sheet · Profile Switcher · Ended` (`418:243`) 内 instance `"Info message"` | `**Info`**（非 Warning，例外） | `"Premium ended. All your profiles are still here — renew to keep switching freely."`（无 CTA，CTA 在 sheet 底部按钮 `"Renew Premium"`）          | （CTA 在 sheet 底部按钮）→ Paywall D |


- **Warning vs Info 的用法**：带挽回 CTA 的顶部常驻条用 Warning（琥珀色）；中性语境解释条（CTA 在其他位置）用 Info（蓝色）。见 `StateMatrix §3.4`
- 判断逻辑：
  ```
  if subscription_status in (trial_ended, premium_ended):
      在 S-01 / HL-01 顶部渲染 Notify Type=Warning（带 CTA）
      在 ST-03a 顶部渲染 Notify Type=Warning（带 CTA；base body 原生 INSTANCE，运行时控制显隐）
      在 Profile Switcher Ended 顶部渲染 Notify Type=Info（无 CTA；中性语境条）
  ```
- 运行时根据 `subscription_status` 具体值切文案中的 `{kind}` 占位（"Trial" / "Premium"）

### 交互

- 带 CTA 的 Warning Notify（S-01 / HL-01 / ST-03a）：右侧 CTA → 按位置路由到对应 Paywall（见上表）
- 无 CTA 的 Info Notify（Profile Switcher Ended）：只做语境解释，用户通过 sheet 底部 Renew 按钮进 Paywall D
- 不自动消失，随订阅状态恢复后自动消失

> 详见 `StateMatrix §2.7.1 / §2.7.3 / §2.7.4 / §3.4 / §2.7.7`

---

## R-11 · Free Trial 资格规则

### 触发条件

用户在 O-05 或 P-01 中选择订阅 Premium 时，平台判断是否提供 Free Trial。

### 系统行为

- **Free Trial 资格由平台（App Store / Google Play）管理**
- 同一 Subscription Group 内每个账户仅享受一次 Free Trial
- 无论选择 Monthly 或 Yearly，试用资格共享
- 取消后再次订阅不再享受 Free Trial
- **Nestory 后端不做 Trial 资格校验**，完全依赖平台逻辑

### 用户体验

- 首次订阅：CTA 显示 "Start Free Trial"
- 非首次订阅（平台返回无 Trial 资格）：CTA 显示为直接付费（如 "Subscribe Now"），不显示 Trial 相关文案
- CTA 文案根据平台返回的 Trial 资格动态调整

---

# 第三章 — Paywall 触发点规则

四个触发点的工程实现规格，覆盖触发条件、触发页面、频率限制、利益点排序。所有触发点共用 P-01 Contextual Paywall 组件。

---

> **路由模型（模型 X，v1.3 统一）**：触发点和 Paywall 变体的映射看**触发位置的功能主题**（Stories / Highlights / 多档案），不看订阅状态。详见 `StateMatrix §2.7.7`。

## 触发点 A — Stories 情感路线（→ Paywall A）


| 项目             | 内容                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| **触发位置**       | (a) `Never Paid` 用户看完第 2 份 Story 返回 S-01 时（情感峰值 + 损失厌恶叠加）；(b) ST-02 Free 视图主 `"Upgrade to Premium"` CTA（用户自发想升级的主动入口） |
| **触发条件（a）**    | Free 用户 + 正在查看的 Story 标记为 `is_last_free_story = true` + 用户点击返回 + 首次触发                                                 |
| **标记逻辑**       | 配额归零时生成的 Story 自动标记 `is_last_free_story = true`                                                                       |
| **频率限制**       | 同一 Story 周期内仅触发一次；关闭后不再弹出                                                                                             |
| **延迟**         | 返回 S-01 后延迟 0.5–1s 弹出                                                                                                 |
| **异常处理**       | 用户阅读中关闭 App → 下次进入 App 查看该 Story 后返回时触发                                                                               |
| **Paywall 变体** | → Paywall A（Figma 主标 `"Your baby's first year only comes once"`）                                                      |
| **利益点排序**      | ① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features                                        |


---

## 触发点 B — Highlights 主题（全部 → Paywall B）


| 项目             | 内容                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **触发位置**       | (a) H-02 Add Memory Highlight 行 Locked toggle；(b) H-04 Memory Detail 编辑模式 Highlight 行 Locked toggle；(c) HL-01 `topNotify · States` 4 个 Scenario 的 CTA（无论 Never Paid 还是 Ended） |
| **触发条件**       | `Never Paid` 或 `Ended` 用户 + Highlight 总数达到相应阈值（见 R-04 的四场景）                                                                                                                   |
| **Locked 态机制** | H-02 / H-04 toggle 在行内呈 Locked 态（toggle 不置灰 + 行下方 caption `"Free plan · 10 / 10 Highlights used"` / `"{kind} ended · 10 / 10 Highlights used"` 运行时切换），点击 toggle 才弹 Paywall B  |
| **Paywall 变体** | **全部 → Paywall B**（Figma 主标 `"Don't miss a single milestone"`，利益点首位 "Unlimited Highlights"）                                                                                   |
| **频率限制**       | 每次点击均触发                                                                                                                                                                       |
| **取消后行为**      | H-02 / H-04：当前 Memory 保留为普通 Memory，不标记 Highlight；HL-01 Notify：用户仍在 HL-01，可继续浏览已有 Highlights                                                                                   |
| **利益点排序**      | ① 无限 Highlights → ② 持续生成 Story → ③ Watermark-Free Sharing → ④ Extra Features                                                                                                  |


---

## 触发点 C — Stories 主题（全部 → Paywall C）


| 项目             | 内容                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **触发位置**       | (a) S-01 Stories List 当月状态卡片（锁定态）点击；(b) S-01 `topNotify · States` 两态 CTA（Trial/Premium Ended）；(c) ST-01 `subscriptionEntry · States · Renew` 行点击后 ST-02 里的 Renew CTA；(d) H-01 进度区块"Upgrade to keep the story going →"文字链 |
| **触发条件**       | `Never Paid`（配额 = 0，第 3 月起）或 `Ended` 用户在上述位置点击                                                                                                                                                                           |
| **Paywall 变体** | **全部 → Paywall C**（Figma 主标 `"Keep the story going"`，利益点首位 "Unlimited monthly Stories"）                                                                                                                                  |
| **频率限制**       | 每次点击均触发                                                                                                                                                                                                                  |
| **利益点排序**      | ① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features                                                                                                                                           |


---

## 触发点 D — 多档案主题（全部 → Paywall D）


| 项目             | 内容                                                                                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **触发位置**       | (a) H-01 `Sheet · Profile Switcher · Free` 底部 `"Upgrade to Premium"` CTA；(b) `Sheet · Profile Switcher · Ended` 底部 `"Renew Premium"` CTA；(c) ST-03a 顶部内置 Notify（`172:958`）的 CTA；(d) ST-03a `+ Add Child` 创建后的扩档场景（Never Paid 新增档案不可激活的引导） |
| **触发条件**       | `Never Paid` / `Ended` 用户在上述档案相关位置点击                                                                                                                                                                                                      |
| **Paywall 变体** | **全部 → Paywall D**（Figma 主标 `"Your family is growing"`，利益点首位 "Unlimited child profiles"）                                                                                                                                                  |
| **频率限制**       | 每次点击均触发                                                                                                                                                                                                                                   |
| **利益点排序**      | ① 无限孩子档案 → ② 持续生成 Story → ③ 无限 Highlights → ④ Watermark-Free Sharing                                                                                                                                                                      |


---

## P-01 共用结构（所有触发点）


| 元素         | 内容                                                |
| ---------- | ------------------------------------------------- |
| **呈现形式**   | Modal 弹窗，非全屏，背景半透明遮罩，右上角可关闭                       |
| **适用对象**   | 仅 Free 用户；Premium 用户不触发                           |
| **情感向标题**  | 根据触发点动态调整                                         |
| **利益点列表**  | 根据触发点调整优先级排序                                      |
| **计费周期切换** | Yearly / Monthly，Yearly 默认高亮选中                    |
| **价格展示**   | Yearly $100/年（省 $19.88）/ Monthly $9.99/月 + 首月免费标注 |
| **主 CTA**  | "Start Free Trial"                                |
| **次级文字链**  | "Maybe Later"（关闭弹窗）                               |
| **底部**     | 服务条款 + 隐私政策链接（App Store 合规要求）                     |
| **订阅成功**   | 弹窗关闭，页面状态实时更新                                     |


---

# 第四章 — 技术实现位置建议

每条规则标注建议的拦截位置，供 Justin Review 确认。


| 规则                 | 前端拦截                                                                                                                                                                                                                                   | 后端拦截                                                                                         | 说明                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| R-01 Story 生成      | —                                                                                                                                                                                                                                      | ✅ 生成任务判断                                                                                     | 纯后端逻辑，前端仅展示结果                                                               |
| R-02 Story 水印      | —                                                                                                                                                                                                                                      | ✅ 生成时写入                                                                                      | 水印状态随 Story 持久化，不动态计算                                                       |
| R-03 Story 访问      | —                                                                                                                                                                                                                                      | —                                                                                            | 无需校验，所有已生成 Story 均开放访问                                                      |
| R-04               | ✅ Highlight 行 Locked 态渲染（toggle 视觉不置灰、无 lock 图标、caption 两版文案按 `{kind}` 运行时切）+ 点击 toggle 弹 Paywall B；HL-01 `topNotify · States` 4 scenario 按 `subscription_status` + `highlight_count` 切换显隐                                             | ✅ Save 时校验 + 删除接口                                                                            | 双重校验；v1.3 改为**Locked caption 预告式**（非静默拦截）；HL-02 Remove 操作需后端更新 count        |
| R-05               | ✅ Profile Switcher 三变体切换（Free / Premium / Ended）；Ended 非活跃档案保持半透明但**可点击**；ST-03a `+ Add Child` 按钮所有订阅状态均可点击（不做 disabled）；ST-03a 顶部内置 Notify `Type=Warning` 在 Never Paid / Ended 下渲染；Profile Switcher Ended 用 `Notify Type=Info`（中性语境条） | ✅ 切换接口对 `Never Paid` 拒绝 `403 PROFILE_SWITCH_RESTRICTED`；`Ended` 放行                           | 前端控制 UI 状态 + 后端仅在 `Never Paid` 切换接口拒绝；`Ended` 切换不拦                          |
| R-06 特色功能          | —                                                                                                                                                                                                                                      | ✅ 事件触发时校验                                                                                    | 后端静默处理，不触发则不推送                                                              |
| R-07 Memory 上传     | ✅ 单条约束检查                                                                                                                                                                                                                               | ✅ 文件大小 / 格式校验                                                                                | 非权限规则，仅技术约束                                                                 |
| R-08 Memory 编辑     | ✅ UI 状态控制                                                                                                                                                                                                                              | ✅ 写入时校验月份                                                                                    | 前端隐藏 Edit 入口 + 后端拒绝非当月写入                                                    |
| R-09 Onboarding 档案 | ✅ Inline 提示展示                                                                                                                                                                                                                          | —                                                                                            | Onboarding 阶段后端不拦截档案创建                                                      |
| R-10               | ✅ 在 S-01 / HL-01 / ST-03a 渲染 `Notify Type=Warning`（带 CTA）；Profile Switcher Ended 渲染 `Notify Type=Info`（无 CTA，CTA 在 sheet 底部）；文案运行时切 `{kind}` = "Trial" / "Premium"                                                                     | ✅ 暴露 `subscription_status` 枚举（`trial_ended` / `premium_ended` 区分）+ `has_active_subscription` | v1.3 由 Toast 改为 Notify 常驻；`Toast · Premium Ended` 已废弃                       |
| R-11               | ✅ 根据 `subscription_status` + 是否已用过 Trial，动态控制 CTA 文案（`Start Free Trial` / `Subscribe now`）与 Trial 折扣徽标显隐                                                                                                                               | —                                                                                            | 依赖平台 SDK 返回 Trial 资格；仅 `never_paid` 首次触发时显示 Trial 优惠，`*_ended` 用户续订不再提供免费试用 |
| Paywall 触发点 A      | ✅ 返回时检查标记 + 路由 Paywall A                                                                                                                                                                                                               | —                                                                                            | `is_last_free_story` 标记由后端生成时写入，前端读取判断；**按模型 X**                            |
| Paywall 触发点 B      | ✅ Highlight 行 Locked toggle 点击时路由 Paywall B；HL-01 topNotify CTA 点击时路由 Paywall B                                                                                                                                                        | ✅ Save 时兜底                                                                                   | 同 R-04；**按模型 X** 统一到 B，不分 Free / Ended                                      |
| Paywall 触发点 C      | ✅ S-01 锁定卡片 / S-01 topNotify CTA / H-01 进度文字链点击时路由 Paywall C                                                                                                                                                                           | —                                                                                            | 前端根据 `story_quota` + `subscription_status` 展示锁定态；**按模型 X**                  |
| Paywall 触发点 D      | ✅ Profile Switcher Free/Ended CTA / ST-03a 顶部 Notify CTA 点击时路由 Paywall D                                                                                                                                                               | ✅ 切换时兜底（仅对 `Never Paid`）                                                                     | 同 R-05；**按模型 X** 统一到 D，不分 Free / Ended                                      |


---

**— 文档结束 —**