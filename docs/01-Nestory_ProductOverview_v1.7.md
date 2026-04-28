# 产品定位与需求大纲

**文档版本：** v1.7
**创建日期：** 2026-04-20
**上一版本：** v1.6（2026-04-03）
**前置依赖：** `02-Nestory_PageStructure_v1.6.md`、`06-Nestory_SubscriptionRules_v1.3.md`、`W2-Nestory_StateMatrix_v1.0.md`
**团队成员：** Vicol (产品设计), Justin (后端开发)

---

## 版本变更记录

### v1.7（2026-04-20）
基于 Figma 设计稿落地与 `StateMatrix v1.0` 反推，对产品定义和 MVP 边界做对齐性修订：

- **订阅状态模型细化**（§5.1 / §5.2）：从"Free / Premium / 降级"三分法扩展为五态——`Never Paid` / `Trial Active` / `Premium Active` / `Trial Ended` / `Premium Ended`（后两者统称 `Ended`）。`Trial Active` 权益等同 `Premium Active`；`Ended` 态明确"**数据不伤害**"品牌承诺：所有历史数据（Story / Highlights / 孩子档案）完整保留且可访问，仅限制未来生成/新增
- **§4.1 Home · Tag 体系升级**：Tag 从"固定 8 个预设"扩展为"8 个预设 + 用户自定义 Tag（支持创建/管理）"；明确 Tag 存储采 **value 模型**（Memory 自包含字符串快照，不依赖 Tag Library 引用），保证 Tag 库变动不伤已有 Memory 和 Story；per-memory 10 个 Tag 上限
- **§4.3 Highlights · 交互升级**：Highlight 行在非 Premium + count ≥ 10 时呈 **Locked 态**（toggle 不置灰、无 lock 图标 + 行下方预告 caption `Free plan · 10 / 10 Highlights used` / `{kind} ended · 10 / 10 Highlights used`），运行时按 `subscription_status` 切 `{kind}`，点击 toggle 才弹 Paywall B
- **§4.6 新增：数据分层存储模型**：`Never Paid` / `Ended` 本地存储（device-only，无云同步）；`Trial/Premium Active` 双写云端同步（支持多设备、换机不丢数据）；对应 MVP 的 Initial Sync · Loading 过渡页（独立于 Onboarding 编号）
- **§5.5 付费转化机制 · 改为模型 X**：`PaywallModal` 在 DS 中为一个 COMPONENT_SET 的 A / B / C / D 四变体；触发点 → 变体映射按**功能主题**（Stories / Highlights / 多档案），不看订阅状态。Free 与 Ended 进同一个变体，CTA 文案由 R-11 的 Trial 资格规则运行时切换
- **§5.4 / §8.1 降级常驻 Notify**：`Ended` 态在 S-01 / HL-01 / ST-03a 顶部常驻 `Notify Type=Warning`（带挽回 CTA），在 Profile Switcher Ended 顶部常驻 `Notify Type=Info`（中性语境条，无 CTA；Renew 在 sheet 底部按钮）。取代原 Toast 方案
- **§6 设计原则 · 新增"数据不伤害"条款**：订阅到期不回收用户已生成的任何数据内容，拒绝"押金式"留存压力
- **§8.1 MVP "做"什么**：新增 Initial Sync · Loading 过渡页（Premium/Trial 首登或换设备）、custom tag 管理、降级常驻 Notify 组件
- **§8.2 MVP "不做"什么**：新增"不做 in-app 删除孩子档案入口"（走人工通道）、"不做 per-page skeleton loading"

**（2026-04-21 小版本补丁，不升版）** — 与 Figma `02 Main UI` / `04 Overlays` 对齐，合并进本版正文与变更记录：

- **§4.1.1 素材录入**：删除「仅在标记 Highlight 时展开的自定义描述输入框」；**单条 Memory 保存以「照片 + 正文」为必填、Tag 为选填**（与 `PageStructure v1.6 · H-02` 及 §4.5 Disabled CTA 规则一致）。**Highlight** 通过 H-02 / H-04 的 **「Mark as Highlight」Toggle** 标记；若 Memory **≥ 2 张照片**，打开 Toggle 时弹出 **`H-02 / Sheet · Select Highlight Cover`** 让用户选定**唯一** Highlight 封面；仅 1 张时默认该张为封面。用户追加照片后**不自动改封面**，可通过 **`Change cover photo`** 再次打开同一 Sheet。Highlight **展示标题由 AI 从该 Memory 的正文 + Tag 提取**（保存后或异步生成，产品规则见 `PageStructure`）；**不再维护独立 Highlight 长文 Note 字段**，原 Highlight Note Sheet 废弃。
- **§4.3 Highlights**：Highlight 定位为「**单张封面 + AI 标题**」的轻量定格；**HL-01** 卡片仅 **封面 + 标题 + 日期**（无描述区 / Tag chip）；**HL-02** 为单张 hero（封面 **仅 3:4 竖图或 4:3 横图** 两档，与 HL-01 横卡 4:3 对齐），含 **「View original memory」** 进入对应 H-04；用户可在 HL-02 通过 **`HL-02 / Sheet · Edit Highlight Title`** 覆写 AI 标题。**H-04 Read Only**：已标记 Highlight 时展示 **`highlightCard`**（72×72 `Photo` + TabBar 同源 **star-fill** + 固定标题 **「Marked as a highlight」** + AI 标题单行省略），整块可点 → HL-02。
- **全屏看图 FS-01**：触发收敛为 **H-02 / H-04** 的**已上传缩略图**点击；**H-01 轮播、HL-02 封面不走 FS-01**（详见 `PageStructure` / `StateMatrix`）。

### v1.6（2026-04-03）
- **§4.2 Stories**：Story 生成触发时间从 UTC 00:00 改为用户本地时区次月 1 日 00:00
- **§8.1 MVP "做"什么**：新增 H5 页面底部品牌标识 + App 下载链接要求

### v1.5（2026-04-02）
- **§4.1.1 素材录入引导体系**：删除 Milestone Picker 概念，仅保留日常 Tag（8 个）+ 自定义描述输入框（Highlight 标记时展开）
- **§4.2 Stories 当月状态卡片**：修正 v1.3 Changelog 中"三项"表述，与正文对齐为两项（素材总数 + 倒计时）
- **§4.2 Stories**：精简内容，删除生成任务判断伪代码、配额字段说明、当月状态卡片信息项、素材质量详细说明（已在 PageStructure 和 SubscriptionRules 中完整定义）；保留核心定位、生成频率概述、呈现形式、视觉样式、分享机制、只读原则、核心价值
- **§4.3 Highlights**：删除 Milestone 相关描述；补充卡片模板匹配规则（按 Tag 匹配，无 Tag 时使用默认样式）
- **§6 设计原则 · 自然转化**：删除"高清导出"，改为"允许分享"
- **§8.1 MVP "做"什么**：将"关键词提取提醒用户标记 Highlights"移至 §8.2
- **§8.2 MVP "不做"什么**：新增 Highlight 关键词提取提醒（后续迭代）

### v1.4（2026-04-01）
- **第4章 · Home**：Tag 体系说明从 §4.1 移出至独立段落 §4.1.1；新增精选照片展示说明（10 张轮播）；新增当月 Memory 区块入口说明（数量 + View All → Memory List 页面）
- **第4章 · Stories**：当月状态卡片删除"文字字数"，保留素材总数、倒计时两项
- **第4章 · Stories**：Story Detail 页面去掉 Tab 结构，变为纯 Story 阅读页（Memory 列表移至 Home 模块下独立页面）
- **第4章 · 功能关系**：更新 Home 和 Stories 的职责描述，Home 新增 Memory 管理职责，Stories 聚焦 AI 内容消费

### v1.3（2026-03-30）
- **第4章 · Home**：补充两层 Tag 体系说明（日常 Tag × 8 + Milestone Picker，仅 Highlight 标记时出现）
- **第4章 · Stories**：新增 Story 生成规则段落（自然月周期、时区定义、配额模型逻辑）
- **第4章 · 附件特色功能**：更新定位为事件触发型功能，不设独立页面；补充 Birthday Celebration Push 为已确认示例
- **第5章 · Free Plan**：Story 限制从"1 个月"改为"2 份配额模型"；新增降级处理规则（历史 Story 水印状态永久锁定）
- **第5章 · 付费转化机制**：触发点 A 时机更新；新增触发点 C（第 3 月 Story 锁定）和触发点 D（档案切换 / 添加）
- **第6章 · 自然转化**：更新 Free 体验描述，与 2 份配额对齐
- **第8章 · MVP 开发边界**：新增配额模型技术说明

### v1.2（2026-03-21）
- **第4章 · Stories**：新增 story 呈现形式说明（H5 渲染 + App 内 WebView 内嵌）；新增视觉样式系统说明（多套样式由系统自动分配，用户不可选择，保留惊喜感）；新增分享机制说明（系统 Share Sheet + Open Graph meta 标签）
- **第4章 · Highlights**：新增展示形式说明（精美静态卡片，模板根据 tag 或里程碑类型匹配）；新增分享机制说明（渲染为图片通过系统 Share Sheet 分享）
- **第8章**：新增 H5 渲染范围（静态图文排版、入场动效、翻页交互）；明确不做背景音乐；新增 Open Graph meta 标签配置要求

### v1.1（2026-03-20）
- **第4章 · Highlights**：更新定位，新增阶梯方案（Free 上限10个 / Premium 无限，样式无差异），明确其承担情感峰值付费转化的战略角色
- **第4章 · Stories**：新增当月状态卡片说明、素材质量与 story 生成逻辑、story 只读原则
- **第4章 · Home**：补充进度信息展示说明及文字输入非强制的逻辑
- **第4章 · 附件特色功能**：更新为内容待定，上线前若未确定则暂不展示
- **第5章 · Free Plan**：取消上传数量限制；story 生成从3个月改为1个月；新增 Highlights 上限10个
- **第5章 · 新增 5.3**：付费转化机制，包含 Contextual Paywall 说明及两个触发点的利益点优先级排序
- **第6章**：新增"Free plan 体验完整性"和"付费文案原则"两条设计原则
- **第7章**：北极星指标更新为 story 生成后次周活跃上传用户比例；付费信号列入关键 KPI
- **第8章**：新增 story 只读、打印服务后移、低质量输入 MVP 阶段不深入处理等边界说明

---

**重要说明：**
本文档使用中文撰写，但 Nestory 产品的全线用户界面、文案、交互内容均使用英文呈现。

---

# 1. 产品概述

## 1.1 产品定位

Nestory 是一款由 AI 驱动的、面向年轻父母的孩子成长记录应用（移动端）。父母日常随手上传孩子的照片、文字备注，AI 定期自动将这些碎片化内容整理成一份有叙事感的精美成长 story，帮助父母留住孩子成长过程中每一个珍贵的瞬间。

## 1.2 产品名称由来

Nestory = Nest（巢，象征家庭的温暖） + Story（故事）
寓意：在温暖的家里，把孩子的故事一点一滴记录下来。

## 1.3 核心差异化

市面上现有产品（Famileo、TinyBeans、Bebememo 等）多为照片存储或模板排版，没有任何产品在做 AI 文字故事叙事。Nestory 是第一个将 AI 内容生成与成长记录结合的产品，生成的不是流水账，而是像父母亲手写的成长日记。

---

# 2. 目标用户

父母年龄：25-40 岁的年轻父母。

孩子年龄：0-5 岁（成长变化最快、最难再现、最值得记录的阶段）。

地区：全球市场。

特征：
- 对孩子成长记录有强烈的情感需求
- 日常生活忙碌，希望用最低的操作成本换取高质量的记录内容
- 愿意为情感类产品付费

---

# 3. 核心价值主张

## 3.1 解决的问题

孩子在 0-5 岁的成长变化是最快、最难再现的阶段，但父母普遍面临以下困境：
- 手机里有几千张照片，从来没有时间整理，大量珍贵瞬间淹没在相册里
- 当时感动的细节，几年后已经记不清楚
- 没有设计能力，不知道如何把照片做成值得珍藏的内容
- 现有的记录工具要么太复杂，要么只是简单存档，缺乏情感温度

## 3.2 提供的价值

**对父母的当下：**
每月收到一份有故事感的成长 story，感觉自己没有错过孩子的成长，获得心理慰藉。

**对父母的未来：**
长大后能看到孩子以前小时候的样子、当时记录的文字，这是无法替代的时间礼物。

## 3.3 差异化价值

AI 自动生成有情感温度的故事性成长 story。不是 AI 辅助排版，不是云端存储，不是按月归档——而是把碎片化上传转化成像父母亲手写的成长日记的叙事文本。

---

# 4. 核心功能模块

## 4.1 Home - 记录当下 (Capturing the Present)

**功能说明：**
提供快速记录入口，同时展示孩子当前的成长状态，让父母每次打开 App 都能感受到"孩子在成长"。Home 同时承载当月 Memory 的管理入口，用户完成记录后可立即在 Memory 时间线中看到结果。

**精选照片展示：**
Home 主视觉区域展示精选照片（最多 10 张），优先当月上传的照片，不足时自动回溯历史照片补足，以自动轮播形式呈现。

**当月 Memory 入口：**
精选照片区域下方展示当月 Memory 数量及 "View All" 入口，点击进入完整的 Memory 时间线页面。用户添加 Memory 后可直接在时间线中看到新增内容，形成即时反馈闭环。

**核心逻辑：**
引入"主动引导"设计，在用户录入时通过启发式提示（如 "Did your little one smile today?"）引导父母提供有价值的文字线索。Home 层仍以 Tag 等轻量线索为兜底；**进入 Add Memory（H-02）后，单条 Memory 的正文与照片为必填**（与 `PageStructure v1.6 · H-02` 一致，详见 §4.1.1）。

**进度信息展示：**
在当月 Memory 区块下方弱化展示 Story 生成倒计时。素材数量已在 Memory 区块中展示，进度区块仅显示剩余天数，信息保持极简。

**核心价值：**
- 情感驱动：通过可视化孩子的当前状态，激发父母"想记录当下"的冲动
- 即时反馈：添加 Memory 后在时间线中立刻可见，强化记录成就感
- 进度感知：让父母了解本阶段的记录进度和即将到来的 story
- 操作便捷：提供一键记录入口，降低记录门槛

---

## 4.1.1 素材录入引导体系

录入素材时，系统提供以下引导兜底，帮助父母在不写文字的情况下也能为 AI 叙事提供基础线索：

- **预设 Tag（8 个固定标签）：** Playtime / Mealtime / Bedtime / Bath Time / Outdoor / Family Time / Funny Moment / Learning，多选 chip
- **自定义 Tag（User Tag Library）：** 用户可在 Tag Picker 中自由创建新 tag，持久化在 user tag library；下次打开 Tag Picker 自动显示可复用。创建即自动选中（iOS 标准交互：打字创建的目的就是"这个 memory 要用它"）
- **Per-memory 10 个 Tag 上限**（预设 + 自定义合计）：超限触发 `Toast · Tags Limit`（`"Maximum 10 tags per memory."`）
- **Memory 正文 + 照片（必填）+ Tag（选填）：** 保存一条 Memory 须至少已上传 **≥1 张照片** 且 **正文非空**；不满足时主 Save CTA 保持 Disabled，按钮文案按全局四态切换（见 `PageStructure v1.6 · H-02`）。Tag 仍为选填，用于分类与 **Highlight 标题 AI 提取的输入信号之一**。
- **Highlight 标记：** 通过 **「Mark as Highlight」Toggle**；无独立「Highlight 长文 Note」字段。若需多图选封面，走 **`H-02 / Sheet · Select Highlight Cover`**（见 `PageStructure` / `StateMatrix`）。

**Tag 存储模型（value 不是 reference）：**
- Memory.tags 存储字符串数组，独立于 user tag library
- Memory 自包含，save 时对所选 tag 做一次快照
- × 删除 custom tag 仅从 user tag library 移除；**已保存的 Memory.tags 字符串不受影响**，旧 Memory 打开编辑态仍会显示（orphan chip 语义）
- Story 是一次性生成的 artifact，后续 tag library 变动不回改已生成 Story
- 设计目的：保证 tag 库变动和降级行为都**不伤害**用户已有数据内容

**Normalize 规则：** 创建 custom tag 时 trim 首尾空格 + lowercase 作 matching key（"Bath Time" / "bath time" 视为同一个 tag），display form 以用户首次输入为准。

预设 8 个 Tag 在 MVP 阶段固定，后续可基于用户数据迭代。详见 `PageStructure v1.6 H-02` 与 `StateMatrix §3.1 Tag Picker`。

---

## 4.2 Stories - AI 自动叙事 (AI-Powered Storytelling)

**功能说明：**
系统在用户本地时区次月 1 日 00:00 自动触发当月 Story 生成任务。以时间轴形式展示，最新内容置顶。Story 是承载当月完整叙事的沉浸式体验，内容量大，有起承转合，是产品情感价值的核心载体。Stories 模块专注于 AI 生成内容的消费与分享，不承载素材管理功能。

**呈现形式：**
Story 详情页统一采用 H5 渲染，为纯阅读体验页面。App 内查看时通过 WebView 内嵌同一套 H5 页面，外部分享时直接打开同一个 H5 链接，两端样式完全一致，Justin 只需维护一套渲染代码。

**视觉样式系统：**
后台预设多套视觉样式，由系统根据以下规则自动分配，用户无法手动选择，比如：

- **季节**：冬天飘雪、夏天微风等季节性动态元素
- **节日**：临近圣诞、万圣节等节日时触发对应主题元素
- **孩子月龄**：不同成长阶段匹配不同视觉基调

用户在 story 生成前不知道样式，保留惊喜感，强化"期待每次打开 App"的产品体验。

**分享机制：**
- 分享时生成对应的 H5 链接，通过系统 Share Sheet 分享至任意平台
- H5 页面配置 **Open Graph meta** 标签，确保链接在微信、WhatsApp、iMessage、Twitter 等平台分享时呈现精美预览卡片（封面图 + story 标题 + 简短描述）
- 分享目标平台由系统 Share Sheet 统一处理，无需逐一对接

**Story 只读原则：**
MVP 阶段，story 一旦生成即为只读状态，不允许任何形式的编辑、增加素材或删除操作。

**核心价值：**
- 父母无需动手整理，AI 自动完成编辑工作
- 叙事感让 story 不是流水账，而是值得珍藏的成长记录
- 可分享至社交平台，成为高质量的社交内容，同时具备病毒传播属性

---

## 4.3 Highlights - 高光时刻

**功能说明：**
用户可以从日常素材中标记某些内容为 Highlights（重要时刻）。被标记的素材以精美静态卡片的形式在独立视图中展示，形成孩子成长的高光时刻合集。与 story 的沉浸式叙事不同，Highlight 是单个瞬间的定格，内容轻量，更接近一张精美卡片。

**产生路径：**
用户在 **H-02 Add Memory** 或 **H-04 编辑模式** 打开 **「Mark as Highlight」**；系统为该 Memory 创建/更新一条 Highlight 引用，**封面 = 用户选定的一张照片**（多图时通过 Bottom Sheet 选择；单图默认该张），**标题 = AI 从该 Memory 正文 + Tag 提取**（用户可在 HL-02 通过 Bottom Sheet 覆写）。

**阶梯方案（对齐五态订阅模型）：**
- `Never Paid` / `Ended` 用户：可标记 Highlight，上限 **10 个**
- `Trial Active` / `Premium Active` 用户：无限标记
- 所有状态展示样式完全一致

**Highlight 行交互（v1.7 更新）：**
当 `Never Paid` / `Ended` 用户 Highlight count ≥ 10 时，H-02 / H-04 的 Highlight 行呈 **Locked 态**（toggle 视觉保持 Off、不置灰、无 lock 图标；行下方出现预告 caption），让用户**先知情再决策**，而非点击时静默拦截。caption 按订阅状态运行时切换：
- `Never Paid`：`"Free plan · 10 / 10 Highlights used"`
- `Ended`（count ≥ 10）：`"{kind} ended · 10 / 10 Highlights used"`（`{kind}` 运行时替换为 `Trial` / `Premium`）

点击 Locked Toggle → **统一触发 Paywall B**（按 `StateMatrix §2.7.7` 模型 X，以功能主题映射，不看订阅状态）。

**战略定位：**
Highlights 同时承担情感峰值时刻的付费转化角色。当 `Never Paid` 用户触达 10 个上限时，系统在情感峰值场景下触发付费引导，利用损失厌恶心理驱动升级。`Ended` 用户同样触发，但 CTA 指向 Renew（不降级已有数据，只限制新增）。

**呈现形式：**
- **HL-01 Gallery：** 每张为精美静态卡片，展示 **封面图 + AI 标题 + 日期**；卡片竖/横版型由**封面照片本身方向**决定（竖图 → 3:4 竖卡；横图 → 4:3 横卡）。卡片模板仍可按 Tag 匹配视觉样式；无 Tag 时用默认模板。模板不跟随季节变化。
- **HL-02 Detail：** **单张封面 hero**（仅 **3:4** 与 **4:3** 两档，与 HL-01 横卡 4:3 对齐，不在此页使用 1:1 大图槽）；可选相框类视觉模板；**「View original memory」** 进入对应 H-04；**Remove Highlight** 保留。

**分享机制：**
Highlight 卡片渲染为图片后，通过系统 Share Sheet 分享至任意平台。

**核心价值：**
- 满足父母"想突出某些特殊瞬间"的情感需求
- 长期使用后，形成孩子成长关键节点的完整记录
- 与 AI 生成的阶段性 story 互补（story 是整体叙事，Highlights 是关键节点）

---

## 4.4 附件特色功能

**功能说明：**
仅开放给 Premium 用户，作为增值体验。定位为**事件触发型功能**——不占用固定页面入口，在特定时刻自动触发（如孩子生日时推送祝贺弹窗）。不设独立占位页面。

已确定的功能示例：**Birthday Celebration Push**（孩子生日当天推送专属祝贺卡片）。

具体功能列表待定，上线前若未确定则 Paywall 和对比表中仅保留文字描述及已确认的示例。

---

## 4.5 功能关系

用户上传素材（照片 + 文字），形成素材库 →
- AI 自动叙事取材于素材库（自动生成）
- Highlights 内容取材于素材库（手动标记）

**三个视角看孩子成长：**
- **Home：** 记录当下 + 管理素材（关注孩子现在的状态，记录入口和 Memory 时间线均在此）
- **Stories：** 回顾过去（纯消费 AI 整理的阶段性 story，不承载素材管理）
- **Highlights：** 重要节点（父母标记的关键时刻）

---

## 4.6 数据分层存储模型

Nestory 按订阅状态分层存储用户数据，同时保证"数据不伤害"的品牌承诺：

| 订阅状态 | 存储策略 | 换设备体验 |
|---|---|---|
| `Never Paid` | **本地存储（device-only）**：Memory / Highlight / 孩子档案 / user tag library 全部落盘在设备本地，不上传云端 | 换设备登录后不会带走本地数据（明确告知，不误导用户） |
| `Trial Active` / `Premium Active` | **双写云端同步**：本地落盘的同时异步双写云端，支持多设备同步、换机续接 | 换设备登录 → 触发 **Initial Sync · Loading** 过渡页（非 Onboarding 编号页）→ 拉云端数据 → 完成后进 H-01 |
| `Trial Ended` / `Premium Ended` | **云端数据全部保留**（只读友好），本地继续可写本地，订阅期间的云端数据**不回收、不清除** | 换设备登录仍能拉取降级前在云端的所有数据 |

**核心原则："数据不伤害"：**
- 订阅到期后，已生成的 Story（含付费期生成的无水印版本）、已标记的 Highlights（含超过 10 个的）、已创建的孩子档案（含超过 1 个的）**全部保留且可访问**
- 仅限制未来新增行为（新 Story 生成、新 Highlight 标记、新档案切换），不回收历史
- 拒绝"押金式"留存压力，让用户不因担心数据丢失而被迫续费

详见 `SubscriptionRules v1.3 R-03 / R-05` 与 `PageStructure v1.6` Initial Sync · Loading 节。

**可选数据 · 地理位置（Stories）：** 为提升 AI Stories 的语境丰富度，提供 **ST-01「Stories · 地理位置」开关（默认 Off）** 与 **首条 Memory 成功保存（账户下 0→1 条）后** 触发的 **iOS 系统定位权限**；用户拒绝则开关保持 Off，同意则开关打开，并可在设置中再次手动开启。规则与工程边界见 `PageStructure v1.6 · ST-01` / `H-02` 与 **`## 4.3` 系统权限请求策略**。**工程 DataModel（开发方 Justin 落实）** 须在数据模型中**持久化可选字段 `location`**（与开关及系统授权联动；无授权或未开启时不写入），详见 `PageStructure v1.6` 中 **「Story 生成规则 · Justin 与 `location`」** 与 **ST-01 · Stories · 地理位置**。

## 4.7 远程推送策略（MVP）

- **未登录**：不发送任何远程推送。
- **Stories 生成**：仅在 **Story 生成完成**后发送 **1 条**推送；须 **已登录**、**系统通知已授权**、**ST-01「Story 生成通知」开启**；标题、正文、落地页及文案变体以 `PageStructure v1.6` **第三章「Story 生成完成通知」**为准。
- **上传静默召回**：绑定 **ST-01「上传提醒」** Toggle（「每 3 天提醒一次」）；须 **已登录**、**系统通知已授权**、该 Toggle **开启**。在连续 **3 个本地自然日内，每日**同时满足「**未**将 App 置前台」「**无** Memory 保存成功」「**无** Story 生成完成（服务端）」后发送 **1 条**召回；点击落地 **H-01 Home**；**不按孩子档案拆分**。与 Story 生成完成推送**同日则只发 Story 推送**；**Story 生成完成**或**本条召回发出**后，**三日观察窗口均重新起算**。

**可执行条件、逐日判定与频控**以 `PageStructure v1.6` **第三章 · Story 生成规则**（**「Story 生成完成通知」**、**「上传提醒与三日静默召回推送（MVP）」**）为权威条文。

---

# 5. 订阅方案

## 5.1 订阅状态五态模型

Nestory 采用五态订阅状态（详见 `SubscriptionRules v1.3` 与 `StateMatrix §2.7`）：

| 状态 | 说明 | 核心权益 |
|---|---|---|
| `Never Paid` | 从未付费，Free 用户 | Story 配额 2 份（带水印）/ 10 个 Highlights / 1 个活跃档案 |
| `Trial Active` | Free Trial 期间 | **等同 Premium Active** |
| `Premium Active` | 已付费且未到期 | 无限 Story（无水印）/ 无限 Highlights / 无限档案 / 附加特色功能 |
| `Trial Ended` | Trial 到期未订阅 | Story 配额 = 0 / 不新增 Highlights / 档案可切换但显示 Ended 语境 |
| `Premium Ended` | 订阅到期未续 | 同 `Trial Ended` |

`Trial Ended` + `Premium Ended` 合称 `Ended`。

---

## 5.2 Free Plan（`Never Paid`）

**价格：** $0

**功能限制：**
- 无上传数量限制；Tag per-memory 10 个上限
- Story 带有 Nestory 水印
- 可生成 **2 份** Story（配额模型）；配额耗尽后不再生成新 Story，但用户仍可上传并查看原始素材流
- 孩子档案：创建不限，但仅 **1 个活跃档案**（Profile Switcher 非活跃档案置灰不可切换）
- Highlights 上限 **10 个**（H-02 / H-04 Highlight 行到上限呈 Locked 态预告 caption）
- 数据本地存储（device-only），不做云端同步

---

## 5.3 Premium Plan（`Trial/Premium Active`）

**价格：**
- Monthly：$9.99/月（首月免费，Trial 期内按 Trial Active 待遇），允许随时取消
- Yearly：$100/年（首月免费，省 $19.88），允许随时取消

**功能特权：**
- 无限制上传素材
- Watermark-Free Sharing
- 永久保存并可持续生成历史 story
- 无限 Highlights
- 无限孩子档案
- 附件特色功能（事件触发型，如 Birthday Celebration Push）
- 本地 + 云端双写同步，支持多设备同步、换机不丢数据（触发 Initial Sync · Loading 过渡页）

---

## 5.4 降级处理规则（`Ended`）

用户从 `Trial/Premium Active` 到期转为 `Ended`（`Trial Ended` / `Premium Ended`）后：

- **已生成的所有历史 Story 保持原状态且可正常访问**：付费/Trial 期间生成的无水印 Story 永久保持无水印；Free 期间生成的带水印 Story 保持带水印。降级不锁定已生成 Story 的阅读权限
- **当月及后续月份 Story 不再生成**：配额 = 0，不重置
- **Highlights：** 超出 10 个的已有 Highlights 保留展示，但无法新增标记；H-02 / H-04 Highlight 行呈 Locked 态（caption 文案 `"{kind} ended · 10 / 10 Highlights used"`，`{kind}` 运行时替换为 `Trial` / `Premium`）
- **孩子档案（核心变化 v1.7）：** 超出 1 个的档案**全部保留且可切换激活**（Profile Switcher Ended 变体视觉同 Free 但交互全通，兑现"数据不伤害"）；底部 CTA = "Renew Premium" → Paywall D
- **UI 提示（v1.7 变化）：** `Ended` 态在多处常驻 Notify，按"是否带挽回 CTA"分两类（以 Figma 为准）——S-01 / HL-01 / ST-03a 顶部用 `Notify Type=Warning`（琥珀色，带 CTA）；Profile Switcher Ended 顶部用 `Notify Type=Info`（蓝色中性语境条，无 CTA；Renew 在 sheet 底部按钮）。取代原"首次打开 Toast"方案；重新订阅后自动消失
- **数据保留：** 云端数据不回收、不清除；本地可继续写入，重新订阅即恢复双向同步

---

## 5.5 付费转化机制

采用 **Contextual Paywall** 机制：根据用户触发付费的**功能主题**（而非订阅状态），动态调整付费弹窗内展示的利益点优先级与标题文案。`PaywallModal` 在 `01 Design System` 中为一个 COMPONENT_SET，按 `Scenario` 维度有 **A / B / C / D 四个变体**；路由使用"模型 X"——触发位置 → 固定变体，同一位置的 `Never Paid` 与 `Ended` 用户进同一个变体（CTA 文案 `Start Free Trial` / `Subscribe now` 由 R-11 的 Trial 资格规则运行时切换）。详见 `StateMatrix §2.7.7` 与 `SubscriptionRules v1.3 第三章`。

**触发点 A — Stories 情感路线 → Paywall A**
- 触发位置：(a) `Never Paid` 用户看完第 2 份 Story 返回 S-01 时（情感峰值 + 损失厌恶叠加）；(b) ST-02 Free 视图主 "Upgrade to Premium" CTA
- Figma 主标：`"Your baby's first year only comes once"`
- 利益点排序：① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features

**触发点 B — Highlights 主题 → Paywall B**
- 触发位置：(a) H-02 / H-04 Highlight 行 Locked toggle；(b) HL-01 `topNotify · States` 四个 Scenario 的 CTA（Never Paid 与 Ended 共用）
- Figma 主标：`"Don't miss a single milestone"`
- 利益点排序：① 无限 Highlights → ② 持续生成 Story → ③ Watermark-Free Sharing → ④ Extra Features

**触发点 C — Stories 主题 → Paywall C**
- 触发位置：(a) S-01 当月锁定卡片点击；(b) S-01 `topNotify · States` 两态 CTA（Trial/Premium Ended）；(c) ST-01 `subscriptionEntry · Renew` 与 H-01 进度区"Upgrade to keep the story going →"文字链
- Figma 主标：`"Keep the story going"`
- 利益点排序：① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features

**触发点 D — 多档案主题 → Paywall D**
- 触发位置：(a) H-01 Profile Switcher Free 底部 "Upgrade to Premium" CTA；(b) Profile Switcher Ended 底部 "Renew Premium" CTA；(c) ST-03a 顶部内置 Notify `"Upgrade to keep the story going →"` CTA；(d) ST-03a `+ Add Child` 后续引导场景
- Figma 主标：`"Your family is growing"`
- 利益点排序：① 无限孩子档案 → ② 持续生成 Story → ③ 无限 Highlights → ④ Watermark-Free Sharing

---

# 6. 关键设计原则

**情感优先：**
设计决策优先考虑情感温度，而非信息密度。

**操作成本最小化：**
- Onboarding 分层，非核心信息可跳过
- 记录流程极简，打开即用

**AI 透明度：**
- 明确告知用户 AI 如何使用数据
- AI 叙事必须基于真实素材锚点

**Free plan 体验完整性：**
Free plan 的所有限制边界，不得影响用户对核心功能的完整体验。付费差异化体现在数量上限、持续生成能力和附加功能上，而非核心功能的可用性。

**自然转化：**
- Free 版提供完整核心体验（可生成 2 份完整 Story，允许分享），目的是让用户充分体验产品核心功能后再做付费决策
- 付费差异化明确（持续生成 + Watermark-Free Sharing + 无限 Highlights + 附加特色功能）
- 不在关键流程强插 paywall，避免破坏体验
- 采用 Contextual Paywall，在用户情感峰值时刻主动触发付费引导

**付费文案原则：**
所有付费引导文案，必须以"你可以拥有更多"为出发点，而非"你即将失去什么"。强调价值获得，而非资源剥夺。

**数据不伤害（v1.7 新增）：**
订阅到期（`Ended`）后，Nestory 不回收用户已生成的任何数据内容——已生成的 Story、已标记的 Highlights（含超过 10 个的）、已创建的孩子档案（含超过 1 个的）全部保留且可访问；云端数据不清除，重新订阅立即恢复双向同步。拒绝"押金式"留存压力，让用户因产品价值而续费，而非因担心数据丢失而被迫续费。降级态的所有"限制"仅限未来新增行为，不影响历史访问。

**加强期待：**
期待 story 的生成，期待孩子的成长变化能展示出来，期待每次进入 App。

---

# 7. 成功指标

**北极星指标：**
story 生成后次周仍活跃上传的用户比例（留存信号）。

**关键 KPI：**
- Onboarding 完成率
- 人均月上传次数
- story 生成后 Premium 转化率（付费信号）
- Highlights 标记率
- Free → Premium 转化率

---

# 8. MVP 开发边界 (Technical Scope)

## 8.1 开发"做"什么：

- **元数据驱动故事：** 基于用户文本和照片元数据进行叙事，AI 仅做提取、串联、生成和必要的补充字词句
- **素材质量兜底：** 无论素材多少均生成 story，story 长度如实反映输入质量；文字稀少时，AI 可结合孩子月龄阶段的通用发育叙事进行补全，但不捏造用户未提及的具体事件
- **单人架构：** 仅支持单用户记录
- **Story 只读：** story 生成后不支持任何编辑、增减或删除操作
- **H5 渲染：** Story 详情页和分享页统一采用 H5 渲染，App 内通过 WebView 内嵌；H5 页面包含静态图文排版、入场动效、翻页交互
- H5 分享页品牌触点： Story H5 页面底部包含 Nestory 品牌标识 + App Store / Google Play 下载链接，作为最低成本的获客入口
- **Open Graph meta 标签：** Story H5 页面配置 Open Graph，确保在主流平台分享时呈现精美预览卡片
- **视觉样式系统：** 后台预设多套样式，系统根据季节、节日、孩子月龄自动分配，不开放用户手动选择
- **Highlight 卡片：** 渲染为静态图片，支持通过系统 Share Sheet 分享
- **配额模型：** `Never Paid` 用户 Story 生成采用配额制（初始 2 份），后端在生成任务中检查 `subscription_status` 和 `story_quota` 两个字段完成判断
- **Memory 时间线：** Home 模块下独立的 Memory List 页面，全量按年→月→天→条目层级展示，当月可编辑、历史月份只读
- **自定义 Tag 管理（v1.7 新增）：** Tag Picker 支持用户创建/删除 custom tag，持久化在 user tag library；采 value 存储模型（Memory.tags 存字符串快照，不依赖 library 引用），保证降级和库变动不伤已有 Memory；per-memory 10 个 Tag 上限
- **Initial Sync 过渡页（v1.7 新增）：** `Trial/Premium Active` 用户首次登录或换设备登录时走 Initial Sync · Loading 过渡页（独立于 Onboarding 编号页），集中承载云端同步等待态
- **降级常驻 Notify（v1.7 新增）：** `Ended` 态在 S-01 / HL-01 / ST-03a 顶部常驻 `Notify Type=Warning`（带挽回 CTA），在 Profile Switcher Ended 顶部常驻 `Notify Type=Info`（中性语境条，无 CTA）；取代原 Toast 方案
- **Highlight Locked 态 UI（v1.7 新增）：** H-02 / H-04 Highlight 行到 10 上限时呈 Locked 态（toggle 不置灰、无 lock 图标）+ 行下方预告 caption（`{kind}` 运行时替换），点击 Toggle 才弹 Paywall B

## 8.2 开发"不做"什么：

- **复杂动作识别：** 不做基于 CV 的自动动作判定（如自动识别爬行）
- **Highlight 关键词提取：** 从文本中自动提取 Highlight 线索并提醒用户标记，列入后续 roadmap
- **家庭共享：** MVP 暂不支持多角色共同编辑
- **站内社交：** 不开发复杂的社交互动系统
- **打印服务：** 第三方打印 API 对接列入后续 roadmap，MVP 不做
- **低质量输入的深度处理：** 文字极少场景下的叙事优化策略，MVP 阶段不深入处理，待真实用户数据回来后迭代
- **背景音乐：** H5 页面不做背景音乐，避免自动播放限制及影响分享体验
- **平台逐一对接：** 分享功能统一通过系统 Share Sheet 处理，不单独对接各社交平台 API
- **In-app 删除孩子档案入口（v1.7 新增）：** MVP 不提供 UI 入口，避免引入级联删除 Memory / Story / Highlight / 云端同步的复杂逻辑；父母如确需删除走人工通道（ST-06 Feedback 或 support 邮箱）
- **Per-page skeleton loading（v1.7 新增）：** 内容列表（H-03 / S-01 / HL-01）首次渲染不做骨架屏；有本地缓存直接渲染，无缓存仅在 NavBar 下方显示 inline 指示器。Initial Sync 场景集中走独立过渡页，日常使用保持 instant-render
- **降级用户的权益剥离（v1.7 明确）：** Nestory **不**回收 `Ended` 用户的历史 Story / 超限 Highlights / 超额档案；云端数据不清除；拒绝"押金式"留存