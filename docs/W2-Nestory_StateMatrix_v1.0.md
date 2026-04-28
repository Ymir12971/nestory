# Nestory · 设计状态矩阵


| 项目       | 内容                                                                 |
| -------- | ------------------------------------------------------------------ |
| **文档版本** | v1.0                                                               |
| **创建日期** | 2026-04-20（2026-04-21 文档内同步补丁，版本号仍为 v1.0）                          |
| **前置依赖** | ProductOverview v1.7 / PageStructure v1.6 / SubscriptionRules v1.3 |
| **作用**   | 指导每张页面到底要补哪些状态变体；规范文件组织方式；约束 Vibe Coding 工具读 Figma 时的预期            |


> **文档同步（2026-04-21，版本号仍为 v1.0）：** Highlight 简化为「单封面 + AI 标题」；废除 `H-02 / Sheet · Highlight Note`，新增 `H-02 / Sheet · Select Highlight Cover` 与 `HL-02 / Sheet · Edit Highlight Title`；`photoCarousel` 仅跨 **H-01 / H-04 Read Only**；**FS-01** 触发改为 **H-02 / H-04** 缩略图；**HL-02** 不再进 §2.4a / §3.5 的 FS-01 表；H-04 Read Only 增加 `**highlightCard`**。权威条文已并入 `PageStructure v1.6` / `ProductOverview v1.7` 同日补丁条。

> **文档同步（补丁，版本号仍为 v1.0）：** `H-02 / Sheet · Add Photo Source` 去掉 **Files** 行，仅 **Take Photo / Choose from Album / Cancel**；触发点含 **H-01 Add Memory** 与 **H-02 照片区「+」**；系统权限总策略见 `PageStructure v1.6 §4.3`。**地理位置**：`ST-01` 新增 **Stories · Location** Toggle（默认 Off）；**首条 Memory Save 成功（0→1）** 后弹 **系统**定位权限；拒绝则 Toggle 保持 Off，同意则 Toggle On（详见 `PageStructure · ST-01` / `H-02` / `§4.3`）；**Justin / DataModel 持久化可选 `location`** 见 `PageStructure` **Story 生成规则**与 **ST-01**；Figma 落地见 **§5「已完成」**（`621:900` / `622:905` / `623:905`）。

---

## 1. 使用说明

### 1.1 状态分类标准

每个交叉格子使用以下标记之一：


| 标记  | 含义                     | 落地形式                                          |
| --- | ---------------------- | --------------------------------------------- |
| ✓   | 必须做                    | 在 `03 States` 页面里建一个完整的页面级 frame              |
| ◐   | 部分区域变化                 | 在 `02 Main UI` 主页面下方贴一个局部 frame，并写明所属区域       |
| C   | 用 component variant 解决 | 不出 frame，靠 DS 里组件的 variant 传 props            |
| O   | 体现为 overlay            | 该状态以 sheet/modal/toast 形式呈现，去 `04 Overlays` 找 |
| A   | 仅用 annotation 说明       | 不可视的约束（数据规则、防抖等），用 Figma 原生 annotation 绑在节点上  |
| —   | 不存在                    | 该页面没有这种状态                                     |


### 1.2 命名规范


| 类别                      | 命名格式                                  | 示例                          |
| ----------------------- | ------------------------------------- | --------------------------- |
| 主页面（02 Main UI）         | `<Page ID> <Page Name>`               | `H-02 Add Memory`           |
| 主页面的不同 mode             | `<Page ID> <Page Name> · <Mode>`      | `H-04 Memory Detail · Edit` |
| 状态变体（03 States）         | `<Page ID> <Page Name> · <State>`     | `H-02 Add Memory · Empty`   |
| 局部区域变体                  | `<Page ID> / <Region> · <State>`      | `H-01 / quotaCard · Locked` |
| 通用 overlay（04 Overlays） | `<Trigger Page ID> / <Type> · <Name>` | `H-02 / Sheet · Tag Picker` |
| 跨页面共用 overlay           | `<Type> · <Name>`                     | `Modal · Paywall · A`       |


分隔符统一用 `·`（空格 + 中点 + 空格），区域路径用 `/`。AI 解析这个 pattern 是稳定的。

---

## 2. 页面状态矩阵

> 列定义参见下方"列说明"；不在矩阵中的列（loading 等）默认为 `—` 或 `A`。

### 2.1 Onboarding


| Page                      | Default | Empty | Loading | Error                    | Locked | Permission | 备注                                                                |
| ------------------------- | ------- | ----- | ------- | ------------------------ | ------ | ---------- | ----------------------------------------------------------------- |
| O-01 Welcome              | ✓       | —     | —       | A                        | —      | —          | 纯展示页                                                              |
| O-02 Sign In              | ✓       | —     | A       | O `Toast · Login Failed` | —      | —          | 登录失败用 toast                                                       |
| O-03 Create Child Profile | ✓       | —     | —       | A                        | ◐      | —          | Free 第 2 个档案的 inline 提示已由 O-03a 原图自带的 Notify（`63:211`）覆盖，无需单独局部变体 |
| O-04 Permissions          | ✓       | —     | —       | —                        | —      | C          | 通知权限授予前/后 = 按钮 component variant                                  |
| O-05 Plan Introduction    | ✓       | —     | —       | —                        | —      | —          | Yearly / Monthly = component variant（已用两张 frame，可保留也可合并）          |


### 2.2 Home


| Page               | Default | Empty                                | Loading | Error                                                   | Locked                                | Permission | 备注                                                                                                                                                                                                                                                                            |
| ------------------ | ------- | ------------------------------------ | ------- | ------------------------------------------------------- | ------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-01 Home          | ✓       | ✓（有档案无 Memory）                       | —       | A                                                       | —                                     | —          | Onboarding 强制创建档案，故无 "no profile" 态；多档案切换 = `O · H-01 / Sheet · Profile Switcher`；H-01 不承担升级转化职责（见 §2.7.2），故无 Locked 态；加载策略见本节末 "加载兜底策略"；**精选照片区用 `photoCarousel` Variants（见 §2.4a），tap photo → H-04，不走 FS-01**                                                               |
| H-02 Add Memory    | ✓       | ✓                                    | —       | O `Toast · Photo Upload Failed` / `Toast · Save Failed` | O `Modal · Paywall · B`（Highlight 上限） | —          | Tag/Date/Highlight：`Sheet · Tag Picker` / `Sheet · Date Picker` / `**Sheet · Select Highlight Cover`**；**无** Highlight Note；**tap 72×72 已上传缩略图 → `FS-01`**；Save 四态动态文案见 `PageStructure · H-02`                                                                                |
| H-03 Memory List   | ✓       | C（组件层，按月用 `MemoryCard Status=Empty`） | —       | A                                                       | —                                     | —          | Save 成功 = `O · Toast · Memory Saved`；加载策略见 §2.2 末 "加载兜底策略"；Memory 卡片缩略图 72×72                                                                                                                                                                                                 |
| H-04 Memory Detail | ✓       | —                                    | —       | A                                                       | —                                     | —          | Edit Mode / Read Only = 主 mode（建议留在 02 Main UI），Delete = `O · H-04 / Sheet · Delete Memory Confirm`；**查看模式用 `photoCarousel`（见 §2.4a），tap 轮播槽位内照片 → `FS-01`（见 §3.5）**；**Read Only 且已标记 Highlight 时展示 `highlightCard`（整块 → HL-02）**；编辑模式 = 72×72 缩略图平铺，**tap 已上传缩略图 → `FS-01`** |


#### 加载兜底策略（H-01 / H-03 / S-01 / HL-01 / S-02 通用）

Nestory 采用"本地优先、首次一次性同步"策略，四个内容页（H-01 / H-03 / S-01 / HL-01）**不画 per-page 骨架**：


| 场景                   | 体验                                     | 兜底设计                                                                               |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Free 用户任意进入          | 全本地，毫秒级瞬时                              | 不需要 loading UI                                                                     |
| Premium 用户日常进入       | 显示本地缓存 + 后台静默云 diff                    | 不需要 loading UI（用户无感知）                                                              |
| Premium 新设备首次登录 / 重装 | 本地缓存空，需从云拉全量                           | `03 States · Sync · Initial Loading`（`407:208`）一次性过渡页，位于 O-02 Sign In 之后、进 H-01 之前 |
| 网络断 / 云不可达           | 按页面走整页 WebIssue 或 `Toast · No Network` | 详见 §3.3（Toast · No Network）与 §5 已完成（S-01 / HL-01 / H-03 Network Issue 整页态）         |


例外：`S-02 Story Detail · Loading`（`344:108`）保留并非上述策略的对立面——AI Story 每次进详情都可能跑后端生成，是**页面内组件级加载**（hero 保留 + body 骨架条），不同于内容列表页的首次同步场景。

### 2.3 Stories


| Page              | Default | Empty                                                    | Loading       | Error           | Locked                                    | Permission | 备注                                                                                                                                                                                         |
| ----------------- | ------- | -------------------------------------------------------- | ------------- | --------------- | ----------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S-01 Stories List | ✓       | C（组件层，按月用 `StoryCard Type=History, Status=NotGenerated`） | —             | A               | ◐（当月卡片锁定态 / Memory 太少 = `GeneratedLight`） | —          | 当月卡片 4 个 active 状态（Empty / Collecting / Locked / Generating）= 局部变体；历史月有 3 态（Generated / GeneratedLight / NotGenerated）；加载策略见 §2.2 末 "加载兜底策略"；**历史 Story Card 封面 353×198（16:9），整张卡片 +18px** |
| S-02 Story Detail | ✓       | —                                                        | ◐（WebView 加载） | ◐（WebView 加载失败） | —                                         | —          | 触发点 A 的 paywall = overlay                                                                                                                                                                  |


### 2.4 Highlights


| Page                     | Default | Empty                             | Loading | Error | Locked         | Permission | 备注                                                                                                                                                                                                                                  |
| ------------------------ | ------- | --------------------------------- | ------- | ----- | -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HL-01 Highlights Gallery | ✓       | ✓（用 `Abnormal/EmptyIllustration`） | —       | A     | ◐（10/10 顶部提示条） | —          | 加载策略见 §2.2 末 "加载兜底策略"；卡片 = **封面 + AI 标题 + 日期**；方向由**用户选定封面单张**照片方向决定（竖 → 3:4；横 → 4:3），详见 `PageStructure v1.6 · HL-01`                                                                                                               |
| HL-02 Highlight Detail   | ✓       | —                                 | —       | —     | —              | —          | Remove = `O · HL-02 / Sheet · Remove Highlight Confirm`；**单张 hero**（3:4 / 4:3），**不**使用 `photoCarousel`；**不走 FS-01**；标题可编辑 = `O · HL-02 / Sheet · Edit Highlight Title`；局部变体 `**HL-02 · Portrait` / `HL-02 · Landscape`**（`345:829`） |


### 2.4a photoCarousel 组件状态与 FS-01 交互（跨 H-01 / H-04 Read Only）

> **用途**：**H-01** 精选照片主视觉区域、**H-04 Read Only** 照片区复用同一个 DS 组件，本节集中说明其 Variant 状态与点击行为。规则的权威定义在 `PageStructure v1.6 · 照片比例与裁切规则`。**HL-02 不使用 `photoCarousel`。**

#### Variant 状态


| Variant          | Figma ID | 槽位规格（中 / 两侧）                | 适用源图                        |
| ---------------- | -------- | --------------------------- | --------------------------- |
| `Type=Portrait`  | `509:48` | 225×300（3:4） / 195×260（3:4） | 集合中 `width < height` 的照片占多数 |
| `Type=Landscape` | `509:52` | 300×300（1:1） / 260×260（1:1） | 集合中 `width ≥ height` 的照片占多数 |


- 行高恒为 **300px**，槽间距 **12px**（绑 `Number/Spacing/M-12`）
- 组件集 ID：`510:1484`，位于 `01 Design System · 03 Molecules`
- **组件只包含一行照片槽位**，PhotoIndicator 由调用方外部组合（H-01 / H-04 Read Only 的"outer photoCarousel"FRAME 是 VERTICAL auto-layout：`photoCarousel` 实例 + `PhotoIndicator`，itemSpacing=12）

#### Variant 选择规则（Dominant Orientation）


| 页面        | 计算集合                     | 选择结果           |
| --------- | ------------------------ | -------------- |
| H-01 精选区  | 当前展示的 10 张照片（可能跨 Memory） | 集合多数派方向决定      |
| H-04 查看模式 | 该 Memory 下所有照片           | Memory 多数派方向决定 |


- 源图 `width ≥ height`（含 1:1）计为"横向"，`width < height` 计为"竖向"
- 多数派决定整组槽位形态，集合内个别照片仍按全局裁切规则填入该槽位（不破坏行高一致性）
- 数量相等时随机选择，结果写入会话级缓存避免反复跳动

#### Tap Photo 交互


| 页面               | 点击行为                                 | 理由                            |
| ---------------- | ------------------------------------ | ----------------------------- |
| H-01             | → H-04 Memory Detail                 | 承担 Memory 再次进入的钩子，不让看图打断浏览流   |
| H-04 Read Only   | → `FS-01`（见 §3.5），集合 = 该 Memory 所有照片 | 用户已在该 Memory 语境内，看图是自然延续      |
| H-02 / H-04 Edit | → `FS-01`（见 §3.5），集合 = 当前 Memory 照片  | 缩略图入口与轮播一致，全屏保留原图比例           |
| HL-02            | —（单张封面 hero，**不**走 FS-01）            | 全屏看图仅在 Memory 语境（H-02/H-04）提供 |


#### 照片本身的裁切态

所有进入 photoCarousel 槽位的照片统一按全局规则居中裁切（`object-fit: cover`）；**原图比例仅在 FS-01 中保留**（`object-fit: contain`）。详见 `PageStructure v1.6 · 照片比例与裁切规则`。

### 2.5 Settings


| Page                      | Default                          | Empty | Loading | Error               | Locked        | Permission | 备注                                                                                |
| ------------------------- | -------------------------------- | ----- | ------- | ------------------- | ------------- | ---------- | --------------------------------------------------------------------------------- |
| ST-01 Settings            | ✓                                | —     | —       | A                   | C（Upgrade 标记） | —          | Free / Premium 差异在订阅入口的标记，靠 component variant；**新增** **Stories · 地理位置** Toggle（默认 Off）与 **首条 Memory Save（0→1）后系统定位权限** 联动，详见 `PageStructure · ST-01` / `§4.3`                                     |
| ST-02 Subscription        | ✓ × 2（Free / Premium，已用两张 frame） | —     | —       | O `Toast · Network` | —             | —          | Cancel 流程 = `O · ST-02 / Sheet · Cancel Step 1` + `Step 2`                        |
| ST-03a Child Profile List | ✓                                | ✓     | —       | —                   | ◐（顶部提示条）      | —          |                                                                                   |
| ST-03 Child Profile Edit  | ✓                                | —     | —       | A                   | —             | —          | 不提供 App 内删除档案入口；极端情况走"联系我们"人工流程（产品决策）                                             |
| ST-04 Data & Privacy      | ✓                                | —     | —       | —                   | —             | —          |                                                                                   |
| ST-05 About               | ✓                                | —     | —       | —                   | —             | —          |                                                                                   |
| ST-06 Feedback            | ✓                                | —     | —       | —                   | —             | —          | 提交成功 = `O · Toast · Feedback Sent`                                                |
| ST-07 Account             | ✓                                | —     | —       | —                   | —             | —          | Logout / Delete = `O · ST-07 / Sheet · Logout Confirm` + `Delete Account Confirm` |


### 2.6 Paywall


| Page                    | Default              | 备注                                                                                                                                                                                               |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-01 Contextual Paywall | ✓ × 4（A / B / C / D） | 4 个变体按功能主题区分利益点排序（路由规则见 §2.7.7 Paywall 路由模型）。实现上是 `01 Design System · PaywallModal` COMPONENT_SET (`49:1056`) 的 4 个 variant；`04 Overlays · Paywall Variants` 行里的 4 个 frame 就是这 4 个 variant 的实例摆位 |


### 2.7 订阅状态 × 受影响页面交叉矩阵

> **用途**：按订阅状态快速查 UI 表现，避免每次设计/开发都从头把五种订阅态过一遍
> **范围**：只列"订阅状态会影响 UI"的页面 / 组件。H-03 / H-04 / ST-03a 等纯本地功能页不在此表（订阅状态对它们无视觉影响）
> **规则来源**：订阅规则本身（Trial 机制、降级触发、配额数字等）权威定义在 `SubscriptionRules v1.3`；本节只做 UI 呈现映射，不重复规则

#### 2.7.1 订阅状态速查


| 状态             | 对应规则                      | 特征                                                 |
| -------------- | ------------------------- | -------------------------------------------------- |
| Never Paid     | R-01 / R-04 / R-05        | 从未订阅 / 从未享受 Free Trial 的原生 Free；配额按 Free 基线执行      |
| Trial Active   | R-01 / R-11               | 正在 Free Trial 期内，权益同 Premium；`{kind}=Trial` 用于降级文案 |
| Premium Active | R-01                      | 当前订阅有效；权益全开                                        |
| Trial Ended    | R-04 / R-05 / R-10 / R-11 | 试用结束未转付费，回到 Free；历史数据全保留；`{kind}=Trial`            |
| Premium Ended  | R-04 / R-05 / R-10 / R-11 | 订阅到期回到 Free；历史数据全保留；`{kind}=Premium`               |


> **R-11（`{kind}` 区分）**：五态在 UI 视觉表现上只分 3 档（Never Paid / Active / Ended），其中 Ended 档在文案里用 `{kind}` = "Trial" / "Premium" 区分具体来源，不做视觉上的双份 frame。权威定义见 `SubscriptionRules v1.3 R-11`

> **Trial Ended 与 Premium Ended 的处理规则**：UI **视觉完全一致**，仅文案开头词不同。下表用 **Ended** 统称；文案中 `{kind}` = "Trial" 或 "Premium"，运行时根据用户订阅历史自动选择

#### 2.7.2 交叉矩阵（行 = 订阅状态，列 = 受影响页面/组件）


| 订阅状态           | S-01 顶部         | HL-01 顶部               | HL-01 Gallery 超额 | H-02 Highlight Row    | ST-01 订阅入口     |
| -------------- | --------------- | ---------------------- | ---------------- | --------------------- | -------------- |
| Never Paid     | —               | 场景 ①（`count = 10`）     | 不可能发生            | `count ≥ 10` → Locked | "Upgrade"      |
| Trial Active   | —               | —                      | —                | Default               | "Trial Active" |
| Premium Active | —               | —                      | —                | Default               | "Premium"      |
| **Ended**      | 常驻 Ended Notify | 场景 ②/③/④（按 `count` 判断） | 全亮保留             | `count ≥ 10` → Locked | "Renew"        |


> **ST-01 订阅入口落地补充**：Free / Premium 差异在设计稿里已通过 component variant 实现。
>
> **H-01 无升级入口**：H-01 不承担升级转化职责（产品定位：即便 Free 用户，也让他们尽可能多地在 Nestory 里沉淀孩子的 Memory），故矩阵不列该列
>
> **读法**：`—` = 该订阅状态下不渲染这个组件/变体；`Default` = 显示主页默认样式（等同于 "Premium Active"），即该订阅状态对此格的视觉无影响

下面四节（2.7.3 – 2.7.6）展开矩阵中涉及多态的格子。

#### 2.7.3 S-01 顶部 Notify（2 态，视觉一致）


| 场景              | 触发         | Figma 文案（以 `02 Main UI · S-01 / topNotify · States` 为准）                               | CTA       |
| --------------- | ---------- | ------------------------------------------------------------------------------------- | --------- |
| `Premium Ended` | 订阅到期回 Free | `"Premium ended — your Stories will pause next month. Upgrade to keep them going. →"` | Paywall C |
| `Trial Ended`   | 试用结束未转付费   | `"Trial ended — your Stories will pause next month. Upgrade to keep them going. →"`   | Paywall C |


**Paywall 路由**：→ Paywall C（上下文主题 = Stories 挽回；见 §2.7.7）

落地：`02 Main UI · S-01 / topNotify · States` 局部变体（`392:853`，x=64 / y=5471 / 393×164），画 2 态纵向堆叠。位置：NavBar 下方、时间选择轴之上（Notify 标准位置）

> Trial / Premium 两版因开头词不同，Figma 里画成两个子 frame 而非一个 frame 用 `{kind}` 占位（这是 S-01 和 HL-01 的实现差异：HL-01 Scenario 2-4 硬编码 `Premium` 运行时替换，S-01 双份 frame）

#### 2.7.4 HL-01 顶部 Notify（4 态，互斥显示）


| 场景                                 | 触发                        | Figma 文案（以 `02 Main UI · HL-01 / topNotify · States` 为准）                                                   | CTA       |
| ---------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| ① `Scenario 1 · Free 10/10`        | Never Paid + `count = 10` | `"10 / 10 Highlights used. Upgrade for unlimited. →"`                                                      | Paywall B |
| ② `Scenario 2 · Ended Under Limit` | Ended + `count < 10`      | `"Premium ended — new Highlights capped at 10. Upgrade for unlimited. →"`                                  | Paywall B |
| ③ `Scenario 3 · Ended At Limit`    | Ended + `count = 10`      | `"Premium ended — you've reached the Free limit of 10. Upgrade to add more. →"`                            | Paywall B |
| ④ `Scenario 4 · Ended Over Limit`  | Ended + `count > 10`      | `"Premium ended — your existing Highlights are safe. New ones are capped at 10. Upgrade for unlimited. →"` | Paywall B |


**互斥优先级**：④ > ③ > ② > ①（越特异越优先；"Ended" 的语境解释"为什么突然受限"，比单纯的配额提示信息量更大，故覆盖 ①）

**Paywall 路由**：全部 → Paywall B（按"模型 X"映射：HL-01 topNotify 的上下文主题就是 Highlights 配额，不看订阅状态，统一走 Highlights 主题的 Paywall B。见 §2.7.7 Paywall 路由模型）

**运行时 `{kind}` 处理**：Figma 里 Scenario 2/3/4 硬编码为 `"Premium ended —"`，运行时当用户的降级来源是 Trial 时，开发把 `Premium` 替换为 `Trial`；不画双份 frame。这是 R-11 `{kind}` 机制在 UI 层的具体表现。

落地：

- `02 Main UI · HL-01 / topNotify · States` 局部变体（`394:859`，x=64 / y=6676 / 393×300），①②③④ 四态纵向堆叠
- 原 `HL-01 / locked Banner`（`363:160`）已删除，场景 ① 归并到新变体的 `Scenario 1 · Free 10/10`
- Trial Ended / Premium Ended 文案差异在 annotation 说明，不画双份

#### 2.7.5 HL-01 Gallery 超额显示规则（Ended + `count > 10`）

- **已有 Highlight 全量显示**（不半透明、不隐藏、不加锁图标）
- **新增入口受限**：H-02 Highlight Row 走 Locked 态（见 §2.7.6）
- **删除入口不受影响**：HL-02 Remove Highlight 对所有用户可用；删到 `< 10` 后自动转入 ② 场景
- **理由**：Nestory 不伤害用户数据是品牌承诺的核心；"Premium 期间存的 Highlights 都还在"是这条承诺最直接的视觉表达。视觉上"锁定 / 隐藏"会引起"我的数据被扣押"的负面观感，与产品气质冲突

#### 2.7.6 H-02 Highlight Row 三态


| 态           | 触发条件                                          | 视觉                                                                   | 点击行为                                                                          |
| ----------- | --------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Default Off | 可新增，未开启                                       | 标准 toggle 关闭                                                         | 切到 On                                                                         |
| Default On  | 可新增，已开启                                       | toggle 开启 + 露 `**Change cover photo`** 子行（多图场景；单图可不展示子行）             | 切到 Off / 点 `**Change cover photo`** → `H-02 / Sheet · Select Highlight Cover` |
| Locked      | `Premium/Trial Active = false` 且 `count ≥ 10` | toggle 保持视觉原样（不置灰）+ 行下方多一行 Text/Secondary caption，文案运行时按订阅状态切两版（见下方） | 点击 toggle → 弹 `Modal · Paywall · B`                                           |


**Locked caption 运行时两版**（视觉一致，字符由开发按订阅状态填入，不拆 frame）：


| 订阅状态                              | Caption 文案                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Never Paid（`count ≥ 10`）          | `"Free plan · 10 / 10 Highlights used"`                                         |
| Ended（Trial/Premium，`count ≥ 10`） | `"{kind} ended · 10 / 10 Highlights used"`（`{kind}` 运行时解析为 "Trial" 或 "Premium"） |


两版差异的设计理由：Never Paid 用户没被降级，"Free plan" 是 neutral 事实陈述；Ended 用户需要语境解释"为什么突然受限"，沿用 §2.7.4 HL-01 Notify 的 `{kind} ended` 语境风格。整套套路与 §2.7.3 S-01 topNotify "两版文案一套视觉" 一致

> **交互决策**：Locked 态采用"信息透明不预阻拦"而非"toggle 预置灰"。理由：(1) `"10/10"` 数字孤立显示字义模糊，caption 可写完整一句让上限存在感清晰；(2) 不强行改 toggle 视觉，保持 H-02 整页的布局稳定；(3) 点击瞬间弹 Paywall 作为最终硬拦截，不会让用户实际完成一个"无效开启"的动作

落地：`02 Main UI · H-02 / highlightRow · States` 局部变体（`398:871`，x=521 / y=2311 / 393×311），画 3 态纵向堆叠；**Default On** 态子行已改为 `**Change cover photo`**（配合 `Sheet · Select Highlight Cover`）。Locked 子 frame (`398:896`) 已挂 annotation 说明两版 caption 运行时切换逻辑

#### 2.7.7 Paywall 路由模型（模型 X · 按功能主题映射）

**核心原则**：一个触发点对应一个固定的 Paywall 变体，映射规则看**触发点的功能主题**（Stories / Highlights / 多档案），不看用户当前的订阅状态。好处：触发点和 Paywall 解耦，利益点排序稳定；不出现"同一按钮根据订阅态弹不同 Paywall"的复杂逻辑。


| Paywall 变体 | 主题              | Figma 主标文案                               | 利益点首位             | 覆盖的触发点                                                                                                                                                                                    |
| ---------- | --------------- | ---------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**      | Stories · 情感路线  | "Your baby's first year only comes once" | 持续生成 Stories      | 新用户第 2 份 Story 看完返回 S-01；ST-02 Free 主 `Upgrade to Premium` CTA                                                                                                                            |
| **B**      | Highlights · 配额 | "Don't miss a single milestone"          | 无限 Highlights     | H-02 Highlight Row Locked toggle；H-04 Highlight toggle Locked；HL-01 `topNotify · States` 全部 4 个 Scenario CTA（无论 Never Paid 还是 Ended）                                                      |
| **C**      | Stories · 挽回    | "Keep the story going"                   | 持续生成 Stories      | S-01 `topNotify · States` 两态 CTA（Trial/Premium Ended）；ST-01 `subscriptionEntry · States · Renew` CTA；ST-02 `Sheet · Cancel Step 2` 之前的 Renew（续订入口）                                        |
| **D**      | 多档案 · 扩展        | "Your family is growing"                 | 无限 child profiles | H-01 `Sheet · Profile Switcher` Free 底部 `Upgrade to Premium` CTA；H-01 `Sheet · Profile Switcher` Ended 底部 `Renew Premium` CTA；ST-03a base body 顶部 Notify CTA；ST-03a "+ Add Child" 触发的扩档场景 |


**说明**：

- Never Paid 和 Ended 状态下"同一个按钮"走同一个 Paywall（例如 HL-01 topNotify Scenario 1 = Never Paid；Scenario 2/3/4 = Ended，全部 → Paywall B）
- Paywall A 主要覆盖"用户自己点进去看"的主动升级场景，Paywall C 主要覆盖 topNotify 挽回场景
- 触发点来源详表见 `SubscriptionRules v1.3 §5`

#### 2.7.8 反向同步：SubscriptionRules 需更新项

> 跨文档 PRD 同步的完整清单（SubscriptionRules + PageStructure + ProductOverview）以 `_AGENT_HANDOFF.md §9` 为权威。本节只列 SubscriptionRules 部分。

**✅ 已全量回流（2026-04-20）**：原 3 条 SubscriptionRules 同步项（R-04 四场景扩展、R-10 Toast→Notify 常驻、触发点 B Locked caption）已全部落地到 `SubscriptionRules v1.3`。本节目前无未决项。

若后续出现新的"Figma/StateMatrix 先行，SubscriptionRules 待同步"条目，往这里加即可。

---

## 3. Overlays 总清单（04 Overlays 页面要做的所有件）

### 3.1 Bottom Sheets


| Sheet ID                                           | Trigger Page      | 触发                                                                 | 内容要点                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `H-02 / Sheet · Tag Picker`                        | H-02              | 点 Tags 行                                                           | 8 固定 tag + custom tag 创建/删除 + Done；per-memory 10 个选中上限（固定+自定义合计），第 11 个触发 `Toast · Tags Limit`；custom tag 采 value 存储模型（详见 `PageStructure v1.6 · H-02` Tag Picker 表、Figma `215:1057` annotation）                                                                                                                                                                           |
| `H-02 / Sheet · Date Picker`                       | H-02              | 点 Date 行                                                           | 当月日历 + 解释只能选当月 + Done                                                                                                                                                                                                                                                                                                                                                     |
| `H-02 / Sheet · Select Highlight Cover`            | H-02 / H-04（Edit） | Toggle On 且 Memory **≥2** 张照片首次开启时自动弹出；或点 `**Change cover photo`** | 3 列 1:1 封面格 + **Done**；选中态描边 = **brand**（`Border/Brand`）                                                                                                                                                                                                                                                                                                                  |
| `HL-02 / Sheet · Edit Highlight Title`             | HL-02             | 点标题区 / 编辑图标                                                        | 单行输入 AI 标题 + **Save**；空标题 Disabled                                                                                                                                                                                                                                                                                                                                        |
| `H-02 / Sheet · Add Photo Source`                  | H-01 / H-02       | **H-01**：点底部 **Add Memory** 主按钮；**H-02**：点照片平铺区尾部 **「+」** 槽（含删光全部后再次添加、已有图继续追加） | iOS Action Sheet 风格：**Take Photo** / **Choose from Album** / Cancel（**无**「从文件选择」）；**首次**点拍照 / 相册行时发起对应系统权限 → 拒绝走 `Toast · Camera Denied` / `Toast · Library Denied`                                                                                                                                                                                                                 |
| `H-01 / Sheet · Profile Switcher`                  | H-01              | 点档案切换入口                                                            | 三态：· Free（`257:218`，非活跃档案半透明 + Premium badge + 底部 `Upgrade to Premium` CTA → Paywall D）/ · Premium（`257:265`，全亮无 badge、无 CTA）/ · Ended（`418:243`，档案列表视觉同 Free，但降级后所有档案仍可点击切换；titleBlock 下方挂 Notify `Type=Info`（**不是 Warning**），文案 `"Premium ended. All your profiles are still here — renew to keep switching freely."`；底部 CTA `"Renew Premium"` → `Modal · Paywall · D`） |
| `H-04 / Sheet · Delete Memory Confirm`             | H-04 (Edit)       | 点 Delete Memory                                                    | 二次确认，Delete 红色                                                                                                                                                                                                                                                                                                                                                            |
| `HL-02 / Sheet · Remove Highlight Confirm`         | HL-02             | 点 Remove Highlight                                                 | 二次确认，Remove 红色                                                                                                                                                                                                                                                                                                                                                            |
| `ST-02 / Sheet · Cancel Step 1`                    | ST-02             | 点 Cancel Subscription                                              | 挽留弹窗                                                                                                                                                                                                                                                                                                                                                                      |
| `ST-02 / Sheet · Cancel Step 2`                    | ST-02             | Step 1 选 Continue to Cancel                                        | 离开原因收集                                                                                                                                                                                                                                                                                                                                                                    |
| `ST-07 / Sheet · Logout Confirm`                   | ST-07             | 点 Log Out                                                          | 二次确认                                                                                                                                                                                                                                                                                                                                                                      |
| `ST-07 / Sheet · Delete Account Confirm · Free`    | ST-07             | 点 Delete Account（无订阅用户）                                            | 强二次确认：用户必须在输入框手输 `DELETE` 才会启用 Delete Account 按钮（Disabled → Default 红色）                                                                                                                                                                                                                                                                                                   |
| `ST-07 / Sheet · Delete Account Confirm · Premium` | ST-07             | 点 Delete Account（付费用户）                                             | 在 Free 版本基础上加橙色 subscription notice 区块：明确告知"删除账号会自动取消下一期续费（月付/年付通用），保留 Premium 直到本计费周期结束"。手输 DELETE 同时构成"知情同意"，无需额外勾选                                                                                                                                                                                                                                                     |


### 3.2 Modals


| Modal ID              | 主题              | 主要触发点（完整路由表见 §2.7.7）                                                                                    | 利益点排序                            |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `Modal · Paywall · A` | Stories · 情感路线  | Never Paid 看完第 2 份 Story 返回 S-01；ST-02 Free 主 CTA `Upgrade to Premium`                                  | ①持续生成 ②无水印 ③无限 Highlights ④Extra |
| `Modal · Paywall · B` | Highlights · 配额 | H-02 / H-04 Highlight Locked toggle；HL-01 `topNotify · States` 全部 4 Scenario CTA                        | ①无限 Highlights ②持续生成 ③无水印 ④Extra |
| `Modal · Paywall · C` | Stories · 挽回    | S-01 `topNotify · States` 两态 CTA；ST-01 `subscriptionEntry · Renew` CTA；Free 第 3 月起当月 Story 卡片 Locked 点击 | ①持续生成 ②无水印 ③无限 Highlights ④Extra |
| `Modal · Paywall · D` | 多档案             | H-01 `Sheet · Profile Switcher` Free/Ended 底部 CTA；ST-03a 顶部 Notify CTA；`+ Add Child` 扩档                 | ①无限档案 ②持续生成 ③无限 Highlights ④无水印  |


### 3.3 Toasts


| Toast ID                    | Trigger                      | 文案                                                                     |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `Toast · Memory Saved`      | H-02 Save 成功 → H-03 顶部       | "Memory saved!"                                                        |
| `Toast · Feedback Sent`     | ST-06 Submit 成功              | "Thanks for your feedback!"                                            |
| `Toast · Photos Limit`      | H-02 上传第 11 张                | "Maximum 10 photos per memory."                                        |
| `Toast · Tags Limit`        | H-02 Tag Picker 选第 11 个      | "Maximum 10 tags per memory."                                          |
| `Toast · No Network`        | 通用                           | "No internet connection. Please try again."                            |
| `Toast · Story Load Failed` | S-02 WebView 加载失败            | "Couldn't load your Story. Pull down to retry."                        |
| `Toast · Login Failed`      | O-02 第三方登录失败                 | "Couldn't sign you in. Check your account and try again."              |
| `Toast · Camera Denied`     | H-02 Take Photo 用户拒授权        | "Camera access is off. Enable it in Settings to take photos."          |
| `Toast · Library Denied`    | H-02 `Sheet · Add Photo Source` 点 **Choose from Album** 拒相册权限 | "Photo Library access is off. Enable it in Settings to choose photos." |


> **Toast component set**：原单组件 `Toast` 已升格为 COMPONENT_SET（`329:48`），含 3 个 type variant：`Type=Success` (`251:37`，绿)、`Type=Warning` (`329:36`，琥珀)、`Type=Error` (`329:42`，红)。每个 toast 用对应 type 的 INSTANCE 改文案即可，icon/色全自动跟随。

### 3.4 Inline Banners（不归 04 Overlays，归到所在页面的局部区域变体）

> 全部使用 `01 Design System · Notify` 组件集（`48:697`）的 4 个 type variant：`Type=Success` (`40:34`) / `Type=Warning` (`40:37`) / `Type=Error` (`40:40`) / `Type=Info` (`41:51`)。Notify 的定义：常驻 NavBar 下方、不可关、条件解除后系统决定消失。Notify 本身无点击行为，由页面层赋予点击；可点击时文案末尾加 `→` 提示。
>
> **Warning vs Info 的用法**：`Type=Warning`（琥珀）用于带挽回 CTA 的场景（S-01 / HL-01 / ST-03a 顶部降级/限额提示，下方都挂 Paywall）；`Type=Info`（蓝色）用于**非挽回语境**的中性语境解释，例如 H-01 `Sheet · Profile Switcher · Ended` 顶部 `"Premium ended. All your profiles are still here — renew to keep switching freely."`（列表里所有档案仍可点击，CTA 在 sheet 底部，不在 Info 条上）。

> **检查优先**：在建新 Banner 局部变体之前，**先看 base page 是否已经有 Notify**（ST-03a base body 第一个 child 就是 Notify；O-03a Second Child 在 NavBar 下方已内置 Notify）。重复叠加是坑。


| Banner 位置                                                                                       | 触发                                      | Notify Type | 文案                                                                                                                                       | 跳转               | 备注                                                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `S-01 / topNotify · States`（`392:853`）                                                          | Premium Ended / Trial Ended             | Warning     | 见 §2.7.3                                                                                                                                 | P-01 Paywall · C | 2 态局部变体；运行时 `{kind}` 切 Trial / Premium                      |
| `HL-01 / topNotify · States`（`394:859`）                                                         | Never Paid 10/10 或 Ended × 3 种 count 范围 | Warning     | 见 §2.7.4                                                                                                                                 | P-01 Paywall · B | 4 态局部变体；互斥优先级 ④ > ③ > ② > ①；取代原 `HL-01 / locked Banner`     |
| `02 Main UI · ST-03a Child Profile List` base body 内置 Notify（INSTANCE `172:958`，`Type=Warning`） | Free / Ended 用户，上限语境提示                  | Warning     | `"Free plan supports one active profile. You can add more, but switching requires Premium."` + CTA `"Upgrade to keep the story going →"` | P-01 Paywall · D | 原图自带，不新增局部变体；CTA 按 §2.7.7 模型 X 路由 → Paywall D               |
| `02 Main UI · O-03a Second Child` NavBar 下方内置 Notify（INSTANCE `63:211`，`Type=Info`）             | Free 用户从 Settings 进第 2 个档案创建页           | Info        | 提示第 2 个档案需要 Premium 才能切换                                                                                                                 | —                | 原图自带；Onboarding 流程无法触发（Onboarding 第一个档案必建），仅 Settings 进入时出现 |
| ~~H-01 locked Banner~~                                                                          | —                                       | —           | 取消：H-01 不承担升级转化职责（见 §2.7.2 注）                                                                                                            | —                | —                                                           |
| ~~H-03 Save Success Banner~~                                                                    | —                                       | —           | 已由 `Toast · Memory Saved` 兜底                                                                                                             | —                | —                                                           |


### 3.5 Fullscreen Photo

跨页面共用的全屏照片查看 overlay，规则权威定义在 `PageStructure v1.6 · FS-01 Fullscreen Photo（跨页面通用）`。


| Overlay ID                           | Trigger Page        | 触发                                                                                                      | 内容要点                                                                                                                                                                                                               |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FS-01 Fullscreen Photo`（`510:1461`） | **H-02** / **H-04** | **H-02**：点 **72×72** 已上传缩略图；**H-04 Read Only**：点 `photoCarousel` 槽位内照片；**H-04 Edit**：点 **72×72** 已上传缩略图 | 纯黑底（`Color/Neutral/Black`，`VariableID:1:96`）+ Status Bar + NavBar（返回键 `arrow-left-s-line` 绑 `Text/OnColor`）+ 照片区（`object-fit: contain`，竖图 393 全出血）+ 底部 PhotoIndicator + 34px Home Indicator safe area；**编辑态不提供删除** |


**状态：**


| 态         | 触发             | 视觉                         |
| --------- | -------------- | -------------------------- |
| `default` | 刚进入，定位到用户点击的那张 | 照片居中，PhotoIndicator 指向当前位置 |
| `swiping` | 用户左右滑动         | 照片切换，PhotoIndicator 同步更新   |


**退出行为：**

- 点 NavBar 返回键 → 返回来源页面（**H-02** / **H-04**）
- 点击任意空白处（照片以外区域）→ 返回来源页面
- 不提供"N / M"文本计数，位置感由 PhotoIndicator 承担

**H-01 不走 FS-01**：H-01 精选照片区 tap → H-04 Memory Detail，不触发 FS-01（见 §2.4a Tap Photo 交互表）。

**落地归属**：Figma `04 Overlays` 页面底部单 frame 维护，独立于其他 sheet / modal / toast。作为全局 overlay frame，不为 H-02 / H-04 分别建实例。

**排除**：**H-01** 精选 `photoCarousel`、**HL-02** 单张封面 hero **不**触发 FS-01（见 §2.4a）。

---

## 4. 文件组织约定


| Page               | 内容                                                          | 对 AI Vibe Coding 工具的意义                           |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------ |
| `00 Cover`         | 封面（可选）                                                      | —                                                |
| `01 Design System` | Atoms / Molecules / Foundations / Image Assets              | 提供 component 索引和 token 定义                        |
| `02 Main UI`       | 所有主页面（happy path）+ 主页面的不同 mode（Read Only / Edit / Filled 等） | 主结构源；按 frame 直接产代码                               |
| `03 States`        | 所有"页面级"的 abnormal states（empty / loading / error / locked）  | 每个 frame 是同名主页面的一个 state variant，AI 推断为同一组件的状态分支 |
| `04 Overlays`      | Sheets / Modals / Toasts / Tooltips 的具体场景实例                 | AI 把它们识别为弹层组件，不和具体页面强绑                           |


### 4.1 Canvas 内布局规则

- **02 Main UI**：每个模块（O / H / S / HL / ST）一行，模块内按 page ID 升序从左到右排列
- **03 States**（2026-04-20 重排）：**单行横向排列**，按 **O → H → S → HL → ST** 系列顺序；同一系列内按 page ID 升序（如 S-02 `Loading` 在 `Load Failed` 之前）。起点 (64, 80)，帧间 80px gap，全部 y 对齐
- **04 Overlays**（2026-04-20 重排）：**按系列分行**，每系列占一行；行顺序 **H → HL → ST → Global**（Global 行放 Toasts + Paywall Variants 等跨系列组件）。每行起点 x=64，帧间 80px gap；行之间 120px vertical gap，同一行内 y 顶对齐
- 所有同级 frame 之间统一 80px gap（页面之间），局部变体与所属页之间 64px gap

#### 局部变体（◐）的列宽约束

为避免局部变体侵占相邻页的列空间，所属页正下方的局部变体 frame **宽度必须 ≤ 该主页面宽度（393）**：

- 命名 `<Page ID> / <Region> · <States>`，作为 02 Main UI 的同级 frame
- x 坐标对齐所属主页 x；y = 主页 bottom + 64
- 多个变体在该 frame 内**纵向堆叠**，不要横向并排（否则会撞到右侧相邻页的列）
- frame 内不要再加横向 padding，让 frame 宽度 = 内容宽度 = 393
- 范例：`H-01 / avatarRow Variants` 在 (64, 2311, 393×372)，正下方对齐 H-01；H-02 那一列 (521, 2311, 393×?) 留空给以后 H-02 的局部变体用

### 4.2 Safe Bottom 规则（强制）

iPhone 底部有 Home Indicator，所有主页面和 bottom sheet 的"最底层可见区"必须留 safe-area。

- **变量**：`Number/Spacing/SafeBtm`（id `VariableID:7:55`，值 = 34）
- **绑定方式**：用 `setBoundVariable('paddingBottom', SAFE)`，**不要硬编码 34**
- **应用位置**（按页面类型）：
  1. 有底部固定按钮区（CTA / 双按钮）→ 该按钮区 frame 的 `paddingBottom` 绑 SafeBtm
  2. 没有底部按钮、只有内容 → 最底下那个内容 frame 的 `paddingBottom` 绑 SafeBtm
  3. 有 TabBar → TabBar 那一层 `paddingBottom` 绑 SafeBtm（TabBar 是 INSTANCE 也要绑）
  4. Bottom Sheet → `bsContent` 的 `paddingBottom` 绑 SafeBtm；sheet root 不动
- **DS 自带 SafeBtm 的组件**：`PaywallModal` 系列、`Toast`、`TabBar` master 已内置；引用时不要再叠
- **检查方法**：审计某 frame 时看 `boundVariables.paddingBottom.id` 是否 = `VariableID:7:55`

### 4.3 异常态页面高度规则（强制）

03 States 里的非滚动异常态（Empty / Loading / Network Issue / Load Failed 等）**必须锁定到标准 iPhone 视口高 852**，不能让 auto layout 把页面 hug 到内容高度，否则在画布上看起来就是个"半截页"。

- 实现方式：page root `primaryAxisSizingMode = 'FIXED'` + `resize(393, 852)`
- 中段内容区（通常是 `body`）用 `layoutAlign = 'STRETCH'` + `layoutGrow = 1` 占满剩余空间
- WebIssue / Empty / 单一信息卡放在 body 里居中（`primaryAxisAlignItems = 'CENTER'` + `counterAxisAlignItems = 'CENTER'`）
- Loading 骨架条这种从顶部往下排的：body 改成 `MIN` 对齐
- 如果原页是滚动页（>852，例如 S-02 hero+body+cta=1394），异常态**仍然按 852**做（异常态不需要滚动）

### 4.4 Notify vs Toast vs Banner 的边界


| 类型                | 出现位置         | 触发       | 消失         | 用户可关 | 用法示例                                                                                         |
| ----------------- | ------------ | -------- | ---------- | ---- | -------------------------------------------------------------------------------------------- |
| **Notify**        | NavBar 下方常驻条 | 系统判断状态   | 系统决定（条件解除） | ✗    | 配额耗尽提示、降级提示条、ST-03a 顶部 Premium 提示条                                                           |
| **Toast**         | 屏幕中央浮层       | 用户操作直接结果 | 2 秒后自动消失   | ✗    | Memory Saved、Feedback Sent、Photos Limit、Tags Limit、No Network、Story Load Failed、Login Failed |
| **Inline Banner** | 嵌在内容区某一段     | 业务状态     | 持续直到状态变化   | 通常 ✗ | H-04 只读月份的说明条、H-03 当月/历史月份说明                                                                 |


设计系统里：

- `Notify`（组件集 `48:697`，4 type variant：`Type=Success` / `Type=Warning` / `Type=Error` / `Type=Info`）= 上面 Notify
- `Toast`（组件集 `329:48`，3 type variant：Success `251:37` / Warning `329:36` / Error `329:42`）= 上面 Toast

### 4.5 Figma 节点引用约定（硬规则）

文档引用 Figma 节点时，**优先用"所在 page · frame / 组件名"作为主引用**，Node ID 作为辅助参考。理由：

- **人类可读**：`H-02 / Sheet · Tag Picker` 一眼能懂；裸 ID `215:1057` 必须回 Figma 查
- **抗失效**：Node ID 在 `detachInstance()` / 删除重建 / 跨 page 剪贴时会变化；**名称作为主引用**，即使 ID 变了也能通过名称找回
- Node ID 本身在拖动、改属性时**是稳定的**（只要节点没被删除/detach），所以仍可用作 Agent 程序化访问的锚点

#### 推荐写法

```
✅ 好：`04 Overlays · H-02 / Sheet · Tag Picker`（ID `215:1057`，供 Agent 程序化访问）
✅ 好：`01 Design System · Button` 组件集（ID `47:475`）
❌ 差：点击 → 弹出 `215:1057`
```

#### 例外

- 在 StateMatrix / handoff 这种**频繁被 Agent 直接消费**的内部工作文档里，可以接受 ID 前置（Agent 用得更方便）；但第一次出现一个节点时仍应写全名
- Figma Node ID 本身在节点被删除后**永久失效**，绝不会被新节点复用——所以失效的 ID 必然对应"节点已不存在"，文档 review 时要一并扫描

### 4.6 表单与输入框通用规则（硬规则）

- **系统权限总策略（相机 / 相册 / 通知 / 地理位置）**：详见 `PageStructure v1.6 §4.3`
- **必填字段未满足 → 主 CTA 保持 Disabled 灰态**。**不使用 Toast 做字段验证反馈**（Toast 语义仅限系统事件通知）
- **Date Picker 特殊情况**：有默认值无法"空置"，用二次确认 Bottom Sheet 承担验证（`O-03b Birthday` → `O-03b Birthday Confirm` 是范例）
- **键盘类型硬规则**：
  - 身高 / 体重 → `**decimalPad`**（不能用 `numberPad`，无小数点）
  - DELETE 确认框 → `default` + `autocapitalizationType=allCharacters`
  - Child Name → `default` + `autocapitalizationType=words`
  - Custom Tag 输入 → `default` + `autocorrectionType=no`
  - 其余 multi-line 文本 → `default` + `autocapitalizationType=sentences`
- **全量字段与属性表**：详见 `PageStructure v1.6 §4.5`（完整清单 + 附加属性说明）

### 4.7 Annotation 使用边界

**用 annotation 写**：

- 数据规则（字段长度、防抖时间、缓存策略）
- 数据来源（来自哪个 API）
- 跳转关系（Save 后去哪、带什么参数）
- 业务规则（Date Picker 只能选当月的原因）

**不要用 annotation 写**：

- 状态变化（用 frame 或 variant）
- 视觉差异（用 frame 或 variant）

---

## 5. 当前进度

### 已完成

- **架构决策（2026-04）：云同步分层（已更新为 Path B）** — 所有用户（含 Never Paid）数据均写入后端；"device-only" 是 UX 层区分，不是 DB 层约束：Never Paid 不提供跨设备同步 UI，Premium 用户 Memories + Highlights 走云同步，故 H-03 / HL-01 才会出现 Network Issue 整页态。SyncStatus 常驻状态条**已确定不加**（2026-04）：iOS HIG 不推崇常驻 sync 指示，pull-to-refresh 的 native spinner + `Toast · No Network` 兜底已足够。相关 DS 组件 `SyncStatus` COMPONENT_SET（原 `366:45`）+ 两个局部变体（原 `367:36` / `367:47`）已全部删除
- **订阅状态 UI 补齐（2026-04）**：落地 §2.7 订阅状态交叉矩阵对应的 4 个局部变体
  - `02 Main UI · S-01 / topNotify · States`（`392:853`，2 态 Premium Ended / Trial Ended）— 降级后常驻 Notify
  - `02 Main UI · HL-01 / topNotify · States`（`394:859`，4 态 ①②③④）— 替代原 `HL-01 / locked Banner`（`363:160`，已删）
  - `02 Main UI · H-02 / highlightRow · States`（`398:871`，3 态 Default Off / Default On / Locked）— Locked 态 toggle 视觉不变 + 下方 caption "Free plan · 10 / 10 Highlights used"，点击 toggle 弹 Paywall B
  - `02 Main UI · ST-01 / subscriptionEntry · States`（`403:880`，3 态 Upgrade / Premium / Renew）— 补齐 Ended 态的 "Renew" 入口；Premium 态 badge Type=Active（绿）
  - 配套：`04 Overlays · Toasts` 的 `Toast · Premium Ended`（`330:224`）已删除（由 S-01 / HL-01 顶部常驻 Notify 取代，`Toast · Premium Ended` 组件废弃）
  - 受影响的 Main UI 画布布局：HL 行及以下（HL-01 / HL-02 / HL-02 Highlight Variants / ST-01~ST-07 主页 + Settings/Highlight section）的 y 值整体下移 200px，为 S-01 / topNotify 腾出空间
- `02 Main UI`：所有主页面 frame
- `03 States`（2026-04-20 重排，按 **O → H → S → HL → ST** 系列顺序单行横排，10 帧；起点 x=64 / y=80，帧宽 393、帧间 80px gap，全部 y 对齐；最右边界 x=4321+393=4714）：
  - `Sync · Initial Loading`（`407:208`，x=64）— 一次性过渡页，首次登录且本地缓存为空时（新设备 / 重装 Premium 账号）播放，走完进 H-01。**不占 Onboarding 编号**（frame 名用 `Sync ·` 前缀与 O-01..O-05 并列而非嵌套）；语义上仅对"已注册 + 本地缓存空"的用户触发，新用户走正常 Onboarding 不会经过此页（annotation 已注明）。背景 Surface/Default；body frame (`408:1346`) 内置一个 DS `Loading/Page` INSTANCE (`408:1347`)，INSTANCE 自带绿色 spinner + Title "Syncing your memories…" + Caption "This will only take a moment."。**承载全局"加载兜底策略"**（详见 §2.2 末），H-01 / H-03 / S-01 / HL-01 因此都不画 per-page 骨架
  - `H-01 Home · Empty`（`94:420`，x=537）— 有 Emma 档案但 0 memory；文案对齐 PageStructure v1.6 §H-01
  - `H-02 Add Memory · Empty`（`96:459`，x=1010）
  - `H-03 Memory List · Network Issue`（`363:76`，x=1483）— Premium 用户 Memories 云端 backup 断网时；NavBar / Filter / TabBar 保留，timeline 中央放 `Abnormal Type=WebIssue` INSTANCE，override Title="Memories couldn't load"、Caption="Check your connection and try again."
  - `S-01 Stories List · Network Issue`（`344:169`，x=1956）— StatusBar / NavBar / TabBar 保留，content 区整片替换为 `Abnormal Type=WebIssue` INSTANCE，override Title="Stories couldn't load"、Caption="Check your connection and try again."；这是**通用 WebIssue 模式**的 canonical 范例
  - `S-02 Story Detail · Loading`（`344:108`，x=2429）— hero 保留，body 替换为骨架条 (7 行宽窄变化) + "Loading your Story…" caption；CTA 仍在
  - `S-02 Story Detail · Load Failed`（`344:140`，x=2902）— hero 保留，body 中央放 `Abnormal Type=WebIssue` INSTANCE，override Title="Couldn't load this Story"、Caption="Check your connection and pull down to retry."；CTA 隐藏
  - `HL-01 Highlights Gallery · Empty`（`289:216`，x=3375）— INSTANCE 自 `01 Design System` 的 `Abnormal` 组件集（`290:2562`）的 `Type=EmptyIllustration`；override Title="No Highlights yet"，Caption="Mark special moments as Highlights while adding a memory."；header sub 改为 "0 / 10 used"
  - `HL-01 Highlights Gallery · Network Issue`（`363:36`，x=3848）— Premium 用户 Highlights 云同步断网时；header / TabBar 保留，gridWrap 中央放 `Abnormal Type=WebIssue` INSTANCE，override Title="Highlights couldn't load"、Caption="Check your connection and try again."
  - `ST-03a Child Profile List · Empty`（`202:1002`，x=4321）— ST 系列唯一的 03 States 帧
  - **架构决定 — 哪些页面需要整页 WebIssue？**「本地优先」原则：只有"纯服务器内容、本地无 fallback"的页面才走整页 WebIssue。当前 S-01 / S-02（AI Story 完全跑后端）+ HL-01（Premium 用户 Highlights 云同步）+ H-03（Premium 用户 Memories 云端 backup）均已补齐。其他页面（H-01 / H-02 / HL-02 / ST-03a / 各 Settings）都是本地优先 → 网络断时显示本地缓存 + 全局 `Toast · No Network` 兜底，不做整页 WebIssue
  - 注：Onboarding v1.6 补丁（2026-04-20）确认 Name + Birthday 必填，Figma 已移除 1st child 流程 Birthday / Birthday Confirm 页的 Skip 按钮，H-01 永远有 ≥1 个档案，无 "no profile" 态（PageStructure v1.6 已同步）
  - 注：H-03 Memory List 的"当月空 / 全空"态不做整页 frame，改在组件层用 `MemoryCard, Status=Empty`（`290:2522`）逐月表达；时间标签月份正常显示、日期显示 "—"
  - 注：S-01 Stories List 的"无生成 Story"态不做整页 frame，改在组件层用 `StoryCard, Type=History, Status=NotGenerated`（`44:55`）逐月表达；并新增 `Type=History, Status=GeneratedLight`（`295:38`）表示 Memory 太少导致 Story 质量浅
- `04 Overlays · H-02 Overlays`：`Sheet · Tag Picker` / `Sheet · Date Picker` / `**Sheet · Select Highlight Cover`** / `Sheet · Add Photo Source`（`371:36` — iOS Action Sheet 风格 **Take Photo / Choose from Album + Cancel**，**无** Files 行；触发点含 **H-01 Add Memory** 与 **H-02「+」**）
- `04 Overlays · H-04 Overlays`：`Sheet · Delete Memory Confirm`（从原 `02 Main UI` 的 `H-04 Delete Confirmation` 整页拆出 sheet 部分）
- `04 Overlays · Toasts`：9 个 INSTANCE 排成 wrap 网格 — `Toast · Memory Saved` / `Feedback Sent`（Success）/ `Photos Limit` / `Tags Limit`（Warning）/ `No Network` / `Story Load Failed` / `Login Failed` / `Camera Denied` / `Library Denied`（Error）；每个挂 annotation 写明 trigger 页与上下文。`Toast` 单组件已升格为 COMPONENT_SET `329:48`（Success/Warning/Error 3 type variant，icon + 色自动跟随）
- **`02 Main UI · ST-01 Settings · Stories · Location`（2026-04-21）**：在 **NOTIFICATIONS** 与 **MORE** 之间插入 **`group · Stories · Location`**（`621:900`）：`STORIES` 分区标题 + 单行 **Stories · Location**（副文案说明 opt-in）+ **Toggle 默认 Off**；`ST-01 Settings` 画布旁 **`annotation · ST-01 · Stories · Location + Justin`**（`623:905`）注明 **Justin 按 DataModel 须持久化可选 `location`**；`H-02 Add Memory` 画布旁 **`annotation · H-02 · first Memory save → system Location`**（`622:905`）注明 **账户首条 Memory Save（0→1）成功后 → iOS 系统定位权限** 与 ST-01 开关联动。规则源：`PageStructure v1.6 · ST-01` / `H-02` / **`## 4.3`** / **Story 生成规则 · Justin 与 `location`**
- `04 Overlays · Paywall Variants`：`Modal · Paywall · A / B / C / D`（基于 `01 Design System` 的 `PaywallModal` 组件集 4 variant）
- `04 Overlays · H-01 Overlays`：`Sheet · Profile Switcher · Free` (`257:218`) + `· Premium` (`257:265`) + `· Ended` (`418:243`) — 三态横向并排
  - Free：当前档案 `Current` 徽章（绿），其他档案半透明 0.6 + `Premium` 徽章（暖色）+ 底部 `Upgrade to Premium` CTA
  - Premium：当前档案 `Current` 徽章（绿），其他档案干净可点，无底部 CTA
  - Ended：档案列表视觉同 Free（非当前档案半透明 0.6 + Premium badge），但降级后所有档案仍可点击切换（兑现"不伤害用户数据"承诺）+ titleBlock 下方挂 `Notify Type=Info` INSTANCE（蓝色中性语境条，Figma 里 instance name = `"Info message"`，文案 `"Premium ended. All your profiles are still here — renew to keep switching freely."`）+ 底部 `renewButton` INSTANCE（Button `Type=Premium` variant，琥珀渐变同 Free Upgrade，文字 `"Renew Premium"`），点击 → `Modal · Paywall · D`。与 Free 的视觉差异仅两点：(1) subtitle 容器换 `Notify Type=Info` 组件；(2) CTA 文案 `Upgrade to Premium` → `Renew Premium`。**注意**：Profile Switcher Ended 顶部用 Info 而非 Warning，与 S-01 / HL-01 / ST-03a 顶部的 Warning Notify 不同，理由见 §3.4 "Warning vs Info 的用法"
- `04 Overlays · ST-02 Overlays`：`Sheet · Cancel Step 1`（挽留：标题 + loss list 4 项 + Keep My Plan + Destructive Continue to Cancel）+ `Sheet · Cancel Step 2`（原因收集：5 项单选，Other 展开 textarea + 全宽红色 `Button Type=DestructivePrimary` Confirm Cancel + Text Back）
- `01 Design System · Button` 组件集新增 `Type=DestructivePrimary` 3 个 variant（Default / Pressed / Disabled）— 全宽红色 destructive primary CTA；与原有 ghost-style `Type=Destructive`（次级文字按钮）区分。token：bg=`Color/Notify/Error/Main` (`1:103`)、Pressed=`Color/Notify/Error/Strong` (`1:104`)、Disabled=`Surface/Disabled` (`7:73`)、文字=`Text/OnColor`
- `04 Overlays · HL-02 Overlays`：`Sheet · Remove Highlight Confirm`（Keep it / Remove）+ `**Sheet · Edit Highlight Title`**
- `04 Overlays · ST-07 Overlays`：`Sheet · Logout Confirm`（Stay Signed In / Log Out）+ `Sheet · Delete Account Confirm · Free` + `Sheet · Delete Account Confirm · Premium`（后者多一个橙色 subscription notice 块，告知付费用户下一期自动取消；两版都要求手输 `DELETE` 才启用红色按钮）
- `01 Design System · StatusBadge` 新增 `Type=Premium` variant（`Surface/Premium-Subtle` + `Text/Premium`），与 Active / Inactive / Warning / Error 同级
- `02 Main UI · H-01 / avatarRow Variants`（局部变体，◐）：在 H-01 主页下方贴一组两态卡
  - Single Profile：原样，无 chevron，不可点
  - Multi Profile：右侧加白色 `arrow-down-s-line` chevron，整行可点 → 触发 `H-01 / Sheet · Profile Switcher`
  - section 上挂 annotation 解释两态切换逻辑与 Profile Switcher 三态（Free / Premium / Ended）的运行时对应关系
  - 宽度收紧到 393，垂直堆叠，避免侵占 H-02 列空间（参见 §4.1 列宽约束）
- `02 Main UI · HL-02 / Highlight Variants`（局部变体，◐）：在 HL-02 主页下方贴 **Portrait / Landscape** 两档 hero 对照（`345:829`）；**不再维护** With Note / Without Note 语义
- `02 Main UI · S-01 / monthCard · Active States`（局部变体，◐）：在 S-01 主页下方贴一列四态卡
  - 直接 INSTANCE 自 `01 Design System` 的 `StoryCard` 组件集（`48:680`）的：
    - `Type=Current, Status=Empty` — 无 Memory 起点
    - `Type=Current, Status=Collecting` — 默认主态
    - `Type=Current, Status=Locked` — Free 配额=0，CTA → `Modal · Paywall · A`
    - `Type=History, Status=Generating` — 月底翻页（本地 00:00）后 AI 正在跑生成的过渡态；生成完才进入历史列表变成 `History/Generated`
  - 开发只需传 props 切换；caption 与 annotation 已用英文写明触发条件
- `03 States · H-01 Home · Empty`（单一态，对齐 PRD §4.1 "已创建档案，但尚未上传任何 Memory"）：
  - 保留 Emma 名字 + Settings；Hero 空照片占位 + 引导文案
  - summary 文案改为 "0 memories this month"
  - CTA 副标题改为 "Every little moment counts."；按钮 "+ Add Memory"
  - 注：Onboarding v1.6 补丁后，"no profile" 态从 PRD §4.1 移除（PageStructure v1.6 已同步）
- **照片展示一致性（2026-04-20 补丁；2026-04-21 修订）**：`photoCarousel` + FS-01 初版落地后，**2026-04-21** 将 **HL-02 恢复为单张 hero**（3:4 / 4:3），`**photoCarousel` 仅保留在 H-01 / H-04 Read Only**；**FS-01** 触发改为 **H-02 / H-04**；新增 `**H-02 / Sheet · Select Highlight Cover`**、`**HL-02 / Sheet · Edit Highlight Title`**；废除 Highlight Note Sheet；H-04 Read Only 增加 `**highlightCard**`（`102:605`）。细则见 `PageStructure v1.6` 同日补丁条与 §2.4a / §3.5 本文档更新。

### 优先补的（按 ROI 排序）

- （插图素材替换由用户自行跟进，不在本文件追踪）

### 后续补

（暂无）

---

## 6. 维护节奏

- 每完成一组 state / overlay 后，回到本文档把"已完成"和"优先补"两节同步
- 当 PRD 或 Page Structure 文档新增页面 / 状态时，同步在矩阵里加行
- 当某个状态被合并 / 删除时，同步更新

