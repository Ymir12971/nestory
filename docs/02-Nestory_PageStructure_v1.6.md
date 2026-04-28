# Nestory 页面结构与功能说明

**Page Structure & Feature Specification**


| 项目       | 内容                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **文档版本** | v1.6                                                                                                                                  |
| **创建日期** | 2026-04-20                                                                                                                            |
| **上一版本** | v1.5（2026-04-03）                                                                                                                      |
| **前置依赖** | `01-Nestory_ProductOverview_v1.7.md`、`06-Nestory_SubscriptionRules_v1.3.md`、`W2-Nestory_StateMatrix_v1.0.md`（设计 / UI source of truth） |
| **编写者**  | Vicol                                                                                                                                 |


---

## 本文档定位（读前必读）

- **本文写什么**：**页面清单**（O / H / S / HL / ST 等系列）、各页**职责**、**User Flow** 与**跨页跳转**（例如 Save 后回哪一页）。便于工程与产品在不打开 Figma 时建立**路由与信息架构**心智模型。
- **本文刻意不写细**：单屏内的**布局、组件层级、间距、色、逐字文案、variant 选择**等，一律以 **`07-Nestory_Figma0420.fig`** 中对应 **`02 Main UI` / `03 States` / `04 Overlays`** 下的 **Frame** 及 **annotation** 为准；本文只必要时用 **「见 Figma：`page · frame`」** 指路，避免与画布双源维护。
- **订阅相关内容**：计费、五态、配额、Paywall 触发与路由等**权威条文**在 **`06-Nestory_SubscriptionRules_v1.3.md`**；本文若提到订阅，仅为流程上下文，**细节以 06 为准**。
- **状态 / overlay 清单**：与 **empty、error、overlay、Notify vs Toast** 等矩阵式约定，以 **`W2-Nestory_StateMatrix_v1.0.md`** 为准；本文 Flow 与第三章若与 W2 冲突，**先以 W2 与 Figma 对齐**。
- **交付范围**：工程方以收到的 **`Nestory_Delivery/`** 目录为准；**未列入该目录的文件不作为本包交付物**，亦不必在实现中依赖。

---

## 版本变更记录

### v1.6（2026-04-20）

基于 Figma 设计稿落地与 `StateMatrix v1.0` 反推，对页面规格与 User Flow 做系统性修订：

**术语统一：**

- 全文订阅状态表述对齐 `SubscriptionRules v1.3`：`Never Paid` / `Trial Active` / `Premium Active` / `Trial Ended` / `Premium Ended`（后两者合称 `Ended`）

**H-01 Home：**

- Profile Switcher Bottom Sheet 三态替代原"Free/Premium 二态"：新增 `Ended` 态（档案可切换但视觉同 Free，底部 CTA 改 "Renew Premium"），详见 Flow 5-bis 与第三章 H-01 弹窗
- 精选照片主视觉 avatarRow 三变体（Free / Premium / Ended），Free/Ended 统一呈 Premium badge + 0.6 opacity

**H-02 Add Memory：**

- Tag 行：新增 **per-memory 10 个 Tag 上限**（预设 + 自定义合计），第 11 个触发 `Toast · Tags Limit`（`"Maximum 10 tags per memory."`）
- Tag Picker Bottom Sheet 规则：custom tag 加即自动选中；custom tag 走 **value 存储模型**（Memory.tags 存字符串而非引用，保证降级/tag 库变动不伤已存数据）；删除 custom tag 仅从 user tag library 移除，已存 Memory 不受影响（orphan chip 语义）；输入前端做 trim + lowercase normalize
- Highlight 行：由单纯 Toggle 升级为带 **Locked 态预告 caption** 的行；Locked caption 运行时两版文案（Never Paid / Ended）；详见 §3 H-02 与 SubscriptionRules R-04

**H-04 Edit Memory：**

- 编辑模式 Highlight 行同 H-02 Locked 规则

**HL-01 Highlights Gallery：**

- 顶部提示条扩展为 **4 场景**（Never Paid ≥10 / Never Paid <10 / Ended ≥10 / Ended <10 降级常驻 Notify）

**Settings · ST-03a：**

- 顶部内置 `Notify Type=Warning`（Figma base body 原生 INSTANCE，Never Paid / Ended 共用）；文案 `"Free plan supports one active profile. You can add more, but switching requires Premium."` + CTA `"Upgrade to keep the story going →"` → Paywall D
- **删除档案入口不提供**：不做 in-app 删除流程；如父母需删孩子档案走人工通道（ST-06 Feedback 或 support 邮箱）

**S-01 Stories List：**

- `Ended` 态在 NavBar 下方常驻 `Notify Type=Warning`（带 CTA）→ Paywall C，取代原 `Toast · Premium Ended`（首次打开触发一次）方案

**H-01 Profile Switcher（04 Overlays）：**

- `Ended` 变体顶部新增 `Notify Type=Info`（中性语境条，无 CTA；Renew 走 sheet 底部按钮 → Paywall D）

**Loading 策略：**

- 新增 **Initial Sync · Loading** 过渡页（**独立于 Onboarding 编号页**）：`Premium Active`（含 `Trial Active`）用户首次登录或换设备登录时显示，承载云端数据同步等待态；完成后 → H-01
- 内容列表（H-03 / S-01 / HL-01）**不做 per-page skeleton**；所有加载态统一走 Initial Sync · Loading 过渡页或 NavBar 下方 inline 指示器

**Toast 清单：**

- 新增 `Toast · Tags Limit`；移除 `Toast · Premium Ended`（改 Notify 常驻）

**交叉引用：**

- 所有与订阅状态相关的页面说明附"详见 `StateMatrix §2.7.x`"指针，双向可达

**Onboarding O-03（2026-04-20 小版本补丁，不升版）：**

- Name + Birthday **必填**（原 PRD v1.6 交互细节只说 "名字为唯一必填项"，与内容列表 "出生日期（必填）" 矛盾，本轮订正为两者都必填）
- 产品依据：Birthday 是 AI Story tone 调优与 Highlights milestone 判定的基础数据，非可选参数
- Figma 已删除 1st child 流程中 Birthday / Birthday Confirm 页的底部 Skip 按钮（frames `62:111` / `62:158`）；More Details 页 Skip 保留（选填字段逃逸口）；2nd/3rd child 流程所有步骤 Skip 保留
- H-01 Empty "新用户尚未创建任何孩子档案（Onboarding 时跳过）" 段落移除，H-01 永远有 ≥1 个档案
- §4.3 末尾 "Onboarding 时跳过创建孩子档案" 小节移除（场景不再存在）

**Highlight 简化 + Memory 保存 + FS-01 + H-04 highlightCard（2026-04-21 小版本补丁，不升版）：**

- **Memory 保存**：单条 Memory **照片 + 正文必填**，Tag 选填；**Save / Save Changes** 主按钮 **全局统一四态动态文案**（`Save` / `Add photos to Save` / `Add a note to Save` / `Save`），未满足必填时 **Disabled**（对齐 §4.5 A，不用 Toast 解释字段缺失）。
- **Highlight**：废除 **Highlight Note** 与 `**H-02 / Sheet · Highlight Note`**；新增 `**H-02 / Sheet · Select Highlight Cover**`（多图时选唯一封面；选中态描边用 **brand** token）；Toggle On 后子行 `**Change cover photo`** 可再次打开。AI 标题从 Memory **正文 + Tag** 提取；**HL-02** 新增 `**HL-02 / Sheet · Edit Highlight Title`**（用户覆写标题）。
- **HL-01 / HL-02**：HL-01 卡片仅 **封面 + AI 标题 + 日期**；HL-02 **单张 hero**（仅 **3:4 / 4:3** 与 HL-01 对齐，**不**再使用 `photoCarousel`）；局部变体 frame 更名为 `**HL-02 · Portrait` / `HL-02 · Landscape`**（原 With/Without Note 语义废弃）。
- `**photoCarousel**`：跨 **H-01 + H-04 Read Only**；**不再用于 HL-02**。
- **FS-01**：触发改为 **H-02 / H-04** 的 **72×72 已上传缩略图**；**H-01 轮播、HL-02 封面不走 FS-01**；编辑态全屏内 **不提供删除**，删图仍走缩略图角标。
- **H-04 Read Only**：已标记 Highlight 时展示 `**highlightCard`**（Figma `102:605`）：左侧 `**Photo` 72×72**（用户选定封面）+ 右侧纵向 **Remix `star-fill`（与 TabBar Highlights 同源）** + 固定标题 `**Marked as a highlight`** + **AI 标题**单行省略；整块可点 → **HL-02**。

**新增 §4.4 表单与输入框通用规则（2026-04-20 小版本补丁）：**

- A. 必填项验证统一走 Disabled 按钮 pattern（不用 Toast 做字段验证，Toast 语义保留给系统事件）
- B. 全量 9 个输入字段的 `keyboardType` + 附加属性（autocapitalize / autocorrect）一次性定义清楚；身高体重强制 `decimalPad`，DELETE 确认框强制 `allCharacters`
- 目的：开发侧查表即可，不用每字段问 PM

**照片展示一致性（2026-04-20 小版本补丁；2026-04-21 修订以 Figma 为准）：**

围绕"用户上传照片的展示一致性"做系统性整理，新增两项跨页面通用规则，并对承载照片的各页面做对齐（**2026-04-21** 对 FS-01 触发、HL 系列与 `photoCarousel` 适用范围做了收敛，见上方同日补丁条）：

- **新增 `## 照片比例与裁切规则（跨页面通用）`**（第三章开头）：全局仅用 1:1 / 3:4 / 4:3 / 16:9 四种比例；源图按 `width ≥ height → 1:1`、`width < height → 3:4` 居中裁切（HL-01 横向卡片封面 **4:3** 为 Gallery 层例外）；定义 Memory **Dominant Orientation** 用于 **H-01 / H-04 `photoCarousel`** 的 Variant 选择。**HL-01 / HL-02** 的竖/横展示改为**仅由用户选定的 Highlight 封面单张**的方向决定（竖 → 3:4；横 → 4:3），与 Dominant Orientation 解耦。
- **新增 `## FS-01 · Fullscreen Photo（跨页面通用）`**（第三章开头）：跨页面通用全屏看图页（`04 Overlays · FS-01 Fullscreen Photo` `510:1461`），由 **H-02 / H-04** 的 **72×72 已上传缩略图**点击触发；纯黑底、`object-fit: contain` 保留原图比例、左右滑动浏览当前 Memory 照片集合、点击返回键或空白处退出；**H-01 轮播、HL-02 封面不走 FS-01**
- **H-01 Home**：精选照片主视觉区域改用 `photoCarousel` DS 组件；行高 300，Variant 按当前展示集合的 Dominant Orientation 选择；**H-01 不走 FS-01**，tap photo 沿用原规则 → H-04
- **H-02 / H-03 / H-04 编辑模式**：照片缩略图统一为 **72×72（1:1）**，三处复用同一规格；源图走全局裁切规则；**点击已上传缩略图 → FS-01**
- **H-04 查看模式**：照片区改用 `photoCarousel` DS 组件，Variant 按该 Memory 的 Dominant Orientation 选择；**点击轮播槽位内照片 → FS-01**；若该 Memory 已标记 Highlight，正文区下方展示 `**highlightCard`**（见 **H-04** 章节与 Figma `102:605`）
- **S-01 Stories List**：`History · Generated` / `History · GeneratedLight` 的 Story Card 封面改为 **353×198（16:9）**，整张卡片 +18px
- **HL-01 Highlights Gallery**：卡片 **封面 + AI 标题 + 日期**；方向由**封面照片** `width`/`height` 判定（`<` → 3:4 竖卡；`≥` → 4:3 横卡）
- **HL-02 Highlight Detail**：**单张封面 hero**（3:4 或 4:3），**不**使用 `photoCarousel`；含 **View original memory**、**Share**、**Remove Highlight**；可选 `**HL-02 / Sheet · Edit Highlight Title`**
- **DS 组件新增**：`01 Design System · 03 Molecules · photoCarousel` 组件集（`510:1484`），含 `Type=Portrait` / `Type=Landscape` 两个 Variant；仅包含一行照片槽位，PhotoIndicator 不纳入该组件，由调用方按需组合
- **StateMatrix 同步**：W2 §2.4a / §3.5 等与上表对齐

### v1.4（2026-04-03）

- **Story 生成规则**：生成触发时间从"每月最后一天 UTC 00:00"改为"用户本地时区次月 1 日 00:00"
- **S-01 当月状态卡片 · 状态二**：固定引导文案改为按 Memory 数量动态匹配（1 / 3 / 10 / 15+ 四档 milestone），附展示规则
- **S-02 Story Detail**：H5 页面底部新增 Nestory 品牌标识 + App 下载链接

### v1.3（2026-04-02）

- **Milestone Picker 删除**：全文删除 Milestone 概念；H-02 Highlight 标记区域仅保留自定义描述输入框；HL-01 / HL-02 / H-04 中所有 Milestone 引用删除
- **Highlight 卡片模板匹配**：改为按 Tag 匹配，无 Tag 时使用默认样式模板
- **HL-02 新增内容**：新增 "Remove Highlight" 操作入口（所有用户可用）；新增无文字 Highlight 的引导提示文案
- **HL-01 提示条逻辑更新**：非 Premium 用户 count ≥ 10 时提示条文案更新，包含删除引导和 Upgrade 入口
- **H-02 Flow 5 修正**：Highlight 上限检测时机从"Save 时"修正为"Toggle 点击时"
- **H-01 Add Memory 返回目标**：Save 后返回 H-03，H-03 顶部显示 transient success banner
- **S-01 Add Memory 次级入口返回补充**：Save 后返回 S-01
- **配额耗尽用户上传提示**：H-01 进度区块（配额 = 0 时）新增轻提示文案
- **Story 生成通知推送**：新增通知内容规格段落（标题、正文、点击落地页）
- **ST-01 上传提醒**：明确为仅 Toggle 开关，默认频率 3 天一次，不开放频率选择
- **R-08 Memory 编辑时区对齐**：明确"当月"判断以用户本地时区为准
- **H-01 档案切换**：Free / 降级用户点击切换入口后进入 Bottom Sheet，非活跃档案置灰不可选，顶部显示提示 + Upgrade 入口；取消原"直接弹 P-01"设计
- **新增 ST-03a Child Profile List**：多档案时作为 ST-01 到 ST-03 的中间列表页；所有用户可编辑任意孩子档案；非 Premium 用户顶部显示提示；添加按钮对非 Premium 禁用
- **ST-01 孩子档案区**：更新入口逻辑，指向 ST-03a 或直接 ST-03
- **ST-03**：明确编辑保存后不改变活跃档案

### v1.2（2026-04-01）

**Memory 架构重构 + 全面文案补充 + 多项细节优化，主要变更：**

- **Memory List 重构**：将 Memory 列表从 S-02 Tab 2 移至 Home 模块下独立页面 H-03 Memory List；H-01 新增当月 Memory 区块入口（数量 + View All）；S-02 去掉 Tab 结构，变为纯 Story 阅读页
- **Memory Detail 归属变更**：原 S-03 Memory Detail 重编号为 H-04，归入 Home 模块
- **S-01 Story 卡片状态**：新增"未生成"状态（有 Memory 但未生成 Story 的历史月份）；当月状态卡片改为纯展示不可点击，新增引导文案和 Add Memory 次级入口
- **Add Memory 入口全局规范**：明确三个入口位置（H-01、H-03、S-01）及各自的 Save 返回目标
- **Settings 子页面**：新增 ST-03 ~ ST-06（档案编辑、数据与隐私、关于、用户反馈）
- **Onboarding 布局统一**：新增统一 layout 规范；所有"待定"文案补充建议值
- **O-05 Plan Introduction**：权益表措辞优化（AI Stories / Watermark-Free Sharing / Highlights 加解释）；新增计费周期切换；主次 CTA 互换（主 CTA 引导付费）
- **H-01 启发式提示**：新增 20 条预设文案池
- **PRD 同步**：当月状态卡片删除"文字字数"；Tag 体系说明移至 PRD §4.1.1

### v1.1（2026-03-30）

**基于 v1.0 Review 的全面修订，主要变更：**

- **位置权限**：删除位置权限收集（O-04 Notifications、H-02、S-03），MVP 不涉及 GPS 定位；位置语境改由 Tag 体系中的日常分类承载
- **Tag 体系重构**：拆分为两层——日常 Tag（可复用，8 个固定集合）+ Milestone Picker（一次性里程碑选择，仅在标记 Highlight 时出现）+ 自定义描述输入框
- **Free 用户 Story 配额**：从"1 个月"改为"2 份配额"模型（quota model），取消 15 天最低门槛，降级用户配额归零
- **Story 生成规则**：明确自然月周期 + 无门槛；补充生成日期、时区、素材范围定义
- **触发点 A 时机**：从"首份 Story 生成后"改为"第 2 份（最后一份免费）Story 看完后返回 S-01 时触发"
- **触发点 C 时机**：从"第 2 月起"改为"第 3 月起"（与 2 份配额对齐）
- **取消订阅流程**：拆分为两步——挽留弹窗 → 离开原因收集弹窗（仅对确认取消的用户收集数据）
- **多档案规则**：补充默认激活档案规则（最早创建）；O-03 新增 Free 用户创建第 2 个档案时的 inline 提示
- **照片上传**：单条 Memory 上限 10 张，单张 10MB，支持 JPEG / PNG / HEIF
- **H-01 导航**：明确从 Home 照片进入 S-03 后返回 H-01（非 S-02）
- **历史月份 Add Memory**：明确完全隐藏
- **附件特色功能**：不设占位页面，定位为事件触发型功能（如生日祝贺推送），Paywall 和对比表中保留文字描述及具体示例
- **降级规则**：明确历史 Story 保持原状态（付费期间无水印则永久无水印），不回收已有权益

---

**重要说明：**
本文档使用中文撰写，但 Nestory 产品的全线用户界面、文案、交互内容均使用英文呈现。

---

# 第一章 — 页面清单

所有独立页面的完整列表，按模块分组。弹窗、Toast、Bottom Sheet 不单独列，在所在页面的第三章中描述。

## Onboarding

> **Figma 现状说明**：Onboarding 页面顶部 **没有 "Step x/y" 进度条文字**，只有 status bar 和 NavBar Page Title。所谓"Onboarding 5 步"指的是 5 个主要步骤页 O-01 ~ O-05；O-06 / O-07 是从 O-02 / O-05 点击法律文本链接跳转的详情页，**不占步骤编号**。


| Page ID | Page Name                                     | Description                                                                                                                                  |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| O-01    | Welcome                                       | 展示产品 Slogan、情感 Wording 及 Story 示例，引导用户开始                                                                                                     |
| O-02    | Sign In / Sign Up                             | 通过 Apple / Google 第三方登录完成身份验证；底部"By continuing, you agree to our Terms / Privacy"链接 → O-06 / O-07                                            |
| O-03    | Create Child Profile                          | 创建孩子档案（三分屏 O-03a Name / O-03b Birthday / O-03c More Details），**1st child 的 Name + Birthday 必填**（其余字段选填）；支持添加多个档案；Free 用户创建第 2 个时显示 inline 提示 |
| O-04    | Permissions（Figma frame：`O-04 Notifications`） | 获取通知权限，说明价值，不强制，不阻断流程                                                                                                                        |
| O-05    | Plan Introduction                             | Free vs Premium 功能对比（两个子 frame `O-05 Yearly` / `O-05 Monthly` 承载计费周期切换），引导用户选择起点；底部法律链接 → O-06 / O-07                                        |
| O-06    | Terms of Service                              | 法律详情页（占位草案），从 O-02 / O-05 跳转；非步骤，返回原页                                                                                                        |
| O-07    | Privacy Policy                                | 隐私政策详情页（占位草案），从 O-02 / O-05 跳转；非步骤，返回原页                                                                                                      |


> **Initial Sync · Loading（不占 Onboarding 编号）**：Premium / Trial 首次激活后、进 H-01 之前的一次性过渡页，语义独立于 Onboarding。Figma frame 名 `03 States · Sync · Initial Loading`（`407:208`）。详见本章末"Initial Sync · Loading"段落。

## Home


| Page ID | Page Name     | Description                                      |
| ------- | ------------- | ------------------------------------------------ |
| H-01    | Home          | 记录入口、精选照片主视觉、当月 Memory 入口、进度展示、启发式提示、Settings 入口 |
| H-02    | Add Memory    | 上传照片、文字输入、Tag 选择、Highlight 标记                    |
| H-03    | Memory List   | 全量 Memory 时间线，按年→月→天→条目层级展示，支持时间筛选               |
| H-04    | Memory Detail | 查看单条 Memory 完整内容；当月可编辑与删除，历史月份只读                 |


## Stories


| Page ID | Page Name    | Description                           |
| ------- | ------------ | ------------------------------------- |
| S-01    | Stories List | 时间轴列表，展示当月状态卡片 + 所有历史 Story 卡片（含多种状态） |
| S-02    | Story Detail | AI 生成 Story 全屏阅读页（H5 WebView），纯消费体验   |


## Highlights


| Page ID | Page Name          | Description                                    |
| ------- | ------------------ | ---------------------------------------------- |
| HL-01   | Highlights Gallery | 所有 Highlight 卡片的 Grid 视图（暂定每行 2 张，待设计稿确认）      |
| HL-02   | Highlight Detail   | 单个 Highlight 卡片全屏查看，含分享入口和 Remove Highlight 操作 |


## Settings


| Page ID | Page Name               | Description                            |
| ------- | ----------------------- | -------------------------------------- |
| ST-01   | Settings                | 账户、孩子档案、订阅、通知、数据与隐私、反馈、关于的入口汇总页        |
| ST-02   | Subscription Management | 当前计划详情、Free/Premium 对比表、Upgrade / 取消管理 |
| ST-03a  | Child Profile List      | 所有孩子档案列表页；仅 1 个档案时跳过，直接进入 ST-03        |
| ST-03   | Child Profile Edit      | 编辑单个孩子档案（复用 O-03 表单，去掉进度条和底部 Skip）     |
| ST-04   | Data & Privacy          | AI 数据使用说明详情页                           |
| ST-05   | About                   | 版本号、服务条款、隐私政策链接                        |
| ST-06   | Feedback                | 用户反馈入口（文字输入 + 提交）                      |


## Paywall


| Page ID | Page Name          | Description                 |
| ------- | ------------------ | --------------------------- |
| P-01    | Contextual Paywall | 根据触发上下文动态调整利益点排序的付费引导 Modal |


---

# 第二章 — 核心 User Flow

覆盖所有关键主路径。格式：页面A → [触发条件] → 页面B

## Flow 1 — Onboarding 完整路径

> O-01 Welcome
>
> → [点击 "Get Started"]
>
> O-02 Sign In / Sign Up
>
> → [Apple / Google 登录成功]
>
> 新用户 → O-03
>
> 老用户 → 跳过 Onboarding，直接进入 H-01 Home
>
> O-03 Create Child Profile
>
> → [点击 "Add Another Child"] → 保存当前档案，清空表单，继续创建
>
> → Free 用户创建第 2 个档案时，页面顶部显示 inline 提示："Free plan supports one active profile. You can add more now, but switching requires Premium."
>
> → [点击 "Continue"] → O-04（1st child 的 Name + Birthday 必填，不提供 Skip 跳过整个档案创建；More Details 页面的 gender/height/weight 可选，支持 Skip）
>
> O-04 Permissions（Figma：`O-04 Notifications`）
>
> → [通知权限系统弹窗 → 允许 / 拒绝，不阻断流程]
>
> → [点击 "Continue"] → O-05
>
> O-05 Plan Introduction
>
> → [点击 "Start with Free"] → H-01 Home（`Never Paid`，无云端数据需拉，无需过渡）
>
> → [点击 "Try Premium Free for 1 Month"] → 触发订阅流程 → 订阅成功 → 若为首次激活 Premium/Trial → **Initial Sync · Loading**（`03 States · Sync · Initial Loading`）→ 同步完成 → H-01 Home
>
> **法律详情页分支（从 O-02 / O-05 跳转）：**
>
> O-02 底部 / O-05 底部 "By continuing, you agree to our Terms of Service and Privacy Policy" 链接
>
> → [点击 Terms] → O-06 Terms of Service → [点击 "Back"] → 返回来源页（O-02 或 O-05）
>
> → [点击 Privacy] → O-07 Privacy Policy → [点击 "Back"] → 返回来源页
>
> **老用户换设备登录：**
>
> O-02 登录成功 → 若 `Trial/Premium Active` 且本设备为首次登录 → Initial Sync · Loading → H-01；若 `Never Paid` / `Ended` → 跳过 Initial Sync 直接 H-01（本地存储不涉及云端同步）

## Flow 2 — 上传素材路径

> **从 H-01 发起（短路径）：**
>
> H-01 Home → [点击 "Add Memory" 主按钮]
>
> → 先弹出 **`H-02 / Sheet · Add Photo Source`**（**Take Photo** / **Choose from Album** / Cancel；**不含**「从文件选择」）
>
> → 用户完成拍摄或从相册选择后 → **进入 H-02 Add Memory**，照片区已带入所选图片（草稿态）；仍可通过 **「+」** 再次打开同一 Sheet 追加或重选（最多 10 张）
>
> → 同一页内继续完成：**正文（必填）** + Tag（选填）+ **「Mark as Highlight」Toggle**
>
> → [若打开 Highlight 且 Memory 内 **≥2** 张照片] → `**H-02 / Sheet · Select Highlight Cover`** 选定唯一封面；仅 1 张时默认该张为封面
>
> → [若已选封面后用户继续加图] → 封面**不变**；可通过 `**Change cover photo`** 再次打开上述 Sheet
>
> → [点击 "Save"] → 返回 H-03 Memory List，列表实时更新
>
> **从 H-03 发起：**
>
> H-03 Memory List → [点击当月区块 "Add Memory" 按钮]
>
> → H-02 Add Memory → [Save] → 返回 H-03 Memory List
>
> **从 S-01 发起：**
>
> S-01 Stories List → [点击当月状态卡片内 "+ Add Memory" 入口]
>
> → H-02 Add Memory → [Save] → 返回 S-01 Stories List

## Flow 3 — Memory 查看路径

> **从 H-01 精选照片进入：**
>
> H-01 Home → [点击精选照片] → H-04 Memory Detail → [返回] → H-01
>
> **从 H-01 Memory 入口进入：**
>
> H-01 Home → [点击 "View All"] → H-03 Memory List → [点击某条 Memory] → H-04 Memory Detail → [返回] → H-03

## Flow 4 — Story 查看与分享路径

> 底部 Tab "Stories"
>
> → S-01 Stories List
>
> → [点击已生成 Story 卡片] → S-02 Story Detail
>
> → H5 WebView 全屏阅读
>
> → [点击分享图标] → 系统 Share Sheet → 分享至任意平台
>
> → [点击返回] → 返回 S-01
>
> **触发点 A（仅 Free 用户查看第 2 份 Story 后）：**
>
> → 用户从 S-02 返回 S-01 时 → P-01 Contextual Paywall（触发点 A）
>
> → 同一 Story 周期内仅触发一次，关闭后不再弹出

## Flow 5 — Highlight 标记路径

> H-02 Add Memory 或 H-04 编辑模式（Highlight 行）
>
> → [前端检查订阅状态 + `highlight_count`]
>
> `**Trial/Premium Active`：** 行正常呈 Toggle，点击即可开关
>
> `**Never Paid` 或 `Ended`（count < 10）：** 行正常呈 Toggle，可开关
>
> `**Never Paid` 或 `Ended`（count ≥ 10）：** 行呈 **Locked 态**（toggle 视觉保持 Off 样式、不置灰 + 行下方 caption）
>
> - caption 文案（以 Figma `02 Main UI · H-02 / highlightRow · States · Locked` 为准）：`"Free plan · 10 / 10 Highlights used"`
>   - Figma 只画一版，作为 Never Paid 的 canonical 视觉。Ended 用户运行时由开发按订阅状态切换为 `"{kind} ended · 10 / 10 Highlights used"`（`{kind}` = Trial / Premium），不拆 frame
>
> → [用户点击 Locked Toggle] → P-01 **Paywall B**（按 §StateMatrix 2.7.7 "模型 X" 按功能主题映射：H-02 Highlight Row 的上下文是 Highlights 配额，无论 Never Paid 还是 Ended 统一走 Paywall B）
>
> → 升级成功 → 保存并进入 HL-01
>
> → 取消 → 保留为普通 Memory，不标记为 Highlight
>
> `**Trial/Premium Active` 或配额未锁且 Toggle → On、且 Memory ≥2 张照片：**
>
> → 弹出 `**H-02 / Sheet · Select Highlight Cover`** → 用户选定封面 → Done → 回到表单（子行出现 `**Change cover photo**` 可再改）
>
> **与 v1.5 差异：** 原"Toggle 点击即拦"改为"行内预告 caption + 点击弹 Paywall"，让用户先知情再决策；对应 Figma `02 Main UI · H-02 / highlightRow · States · Locked`。详见 `SubscriptionRules v1.3 R-04` 与 `StateMatrix §2.7.6 / §2.7.7`

## Flow 6 — Highlight 查看与分享路径

> 底部 Tab "Highlights"
>
> → HL-01 Highlights Gallery
>
> → [点击某个 Highlight 卡片]
>
> → HL-02 Highlight Detail（全屏查看）
>
> → [点击分享图标] → 渲染为图片 → 系统 Share Sheet
>
> → [点击返回] → 返回 HL-01

## Flow 7 — 付费触发路径（触发点 A）

> S-02 Story Detail
>
> → Free 用户查看第 2 份（最后一份免费）Story 后点返回
>
> → P-01 Contextual Paywall（触发点 A，情感峰值 + 损失厌恶叠加）
>
> → 升级成功 → 返回 S-01，后续 Story 无水印
>
> → 取消 → 返回 S-01，Story 保留水印，后续月份不再生成

## Flow 8 — 订阅管理路径

> H-01 Home → [右上角 Settings 图标]
>
> → ST-01 Settings
>
> → [点击 "Subscription"]
>
> → ST-02 Subscription Management
>
> Free 用户：展示 Upgrade CTA → P-01
>
> Premium 用户：展示当前计划 + 取消订阅入口
>
> → [点击 "Cancel Subscription"]
>
> → 步骤 1：挽留弹窗（仅情感化文案 + 两个按钮）
>
> → [点击 "Keep My Plan"] → 返回 ST-02，挽留成功
>
> → [点击 "Continue to Cancel"]
>
> → 步骤 2：离开原因弹窗（单选 + 可选文字输入）
>
> → [选择原因后点 "Confirm Cancel"] → 跳转平台取消流程，上报原因数据
>
> → [点击 "Back"] → 返回 ST-02

## Flow 9 — 孩子档案切换路径

> H-01 Home → [avatarRow chevron 入口（多个档案时显示）]
>
> `**Never Paid`（Free）：** → Profile Switcher Bottom Sheet 变体 `Free`（Figma `257:218`）
>
> - 非活跃档案半透明 0.6 + Premium badge，点击无效
> - subtitle（纯文本，非 Notify 组件）：`"Free plan supports one active profile. Upgrade to switch between them."`
> - 底部 CTA = "Upgrade to Premium" → P-01 **Paywall D**（按 §StateMatrix 2.7.7 "模型 X"：Profile Switcher 上下文 = 多档案扩展主题，无论 Never Paid 还是 Ended 统一走 Paywall D）
>
> `**Trial/Premium Active`：** → Profile Switcher Bottom Sheet 变体 `Premium`（Figma `257:265`）
>
> - 所有档案全亮，无 badge，直接点击切换，Home 内容更新
> - 无底部 CTA
>
> `**Ended`（Trial Ended / Premium Ended）：** → Profile Switcher Bottom Sheet 变体 `Ended`（Figma `418:243`）
>
> - 非活跃档案视觉同 Free（0.6 opacity + Premium badge），**但可点击切换**（兑现"数据不伤害"）
> - subtitle 用 `Notify Type=Info`（**不是 Warning**）组件，Figma instance name = `"Info message"`，文案：`"Premium ended. All your profiles are still here — renew to keep switching freely."`（中性语境条，与 S-01 / HL-01 / ST-03a 顶部的 Warning 挽回条区分；理由见 `StateMatrix §3.4` Warning vs Info 的用法）
> - 底部 CTA = "Renew Premium" → P-01 **Paywall D**
> - 点其他档案卡 → 正常切换（Premium 期创建的数据全部保留且可用）
>
> 详见 `StateMatrix §2.7.2`（H-01 / Profile Switcher 三态交叉矩阵）与 §3.1 Bottom Sheets

---

# 第三章 — 页面详细说明

## Story 生成规则（跨页面通用）

本节定义 Story 生成的全局规则，各页面中的 Story 相关逻辑均以此为准。

**生成周期：** 自然月，用户本地时区次月 1 日 00:00 触发生成任务。后端按用户 timezone 字段分组调度（hourly cron 检查哪些时区刚进入次月）。

**素材时间范围：** 当月 1 日 00:00 ~ 当月最后一日 23:59:59（用户本地时区）。首月则从注册日起算。

**本地化展示：** 用户侧看到的"下次 Story 生成"时间根据用户时区换算。

**最低门槛：** 无。无论素材数量多少，均生成 Story。Story 质量如实反映输入量（PRD 已定义兜底机制）。

**配额模型（按订阅状态）：**


| 订阅状态                                     | 月底 Story 生成 | 说明           |
| ---------------------------------------- | ----------- | ------------ |
| `Never Paid`（配额 > 0）                     | ✅ 生成，带水印    | 生成后配额 -1     |
| `Never Paid`（配额 = 0）                     | ❌ 不生成       | S-01 当月卡片锁定态 |
| `Trial Active` / `Premium Active`        | ✅ 生成，无水印    | 每月生成，不消耗配额   |
| `Trial Ended` / `Premium Ended`（`Ended`） | ❌ 不生成       | 配额 = 0，不重置   |


- 新 `Never Paid` 用户初始配额 = **2**
- 每次生成消耗 1 份配额
- 升级为 `Trial/Premium Active` 后不再消耗配额
- 转为 `Ended` 后配额 = 0（不重置）
- **生成任务判断逻辑：** `if subscription_status in (trial_active, premium_active) → 生成无水印; else if never_paid && quota > 0 → 生成带水印, quota--; else → 不生成`

**Justin（DataModel 落盘）与 `location`：** `dev/04-DataModel.md`（由开发方 **Justin** 维护，见交付包 `README.md`）所定义的 Memory / 同步 / Story 生成相关对象中，**须包含可选字段 `location`**。当 **ST-01「Stories · 地理位置」为 On** 且 **iOS 定位已授权** 时，客户端在本地及（若适用）向服务端触发或排队月度 Story 生成时，应按该 schema **持久化并传递**位置摘要（具体结构、精度与脱敏以 DataModel 条文为准）。**开关 Off 或系统未授权** 时 **`location` 缺省**（不写盘或 `null`），生成路径不得依赖地理位置。

> 详见 `SubscriptionRules v1.3 R-01` 与 `StateMatrix §2.7.3`

### Story 生成完成通知

Story 生成任务完成后，向已开启通知权限的用户推送：


| 项目    | 内容                                                     |
| ----- | ------------------------------------------------------ |
| 通知标题  | "Your [Month] Story is ready!"                         |
| 通知正文  | "Tap to read your little one's story for [Month]."     |
| 点击落地页 | S-02 Story Detail（对应月份的 Story）                         |
| 前置条件  | 用户**已登录**；已在 O-04 或系统设置中授予通知权限；且 ST-01 **Story 生成通知** Toggle 为开启状态 |


### 上传提醒与三日静默召回推送（MVP）

**未登录：** 不发送任何远程推送（含本条与上文「Story 生成完成通知」）。

**前置条件（须同时满足，否则不评估、不发送）：** 用户 **已登录**；**iOS 系统通知已授权**；`ST-01` **「上传提醒」Toggle 为开启**（与 ST-01 内「每 3 天提醒一次」产品表述一致；MVP 不提供频率自定义）。

**「三天」定义：** 按用户 **设备本地时区** 的连续 **3 个完整自然日**（每个自然日 0:00–23:59:59）。在该 **3 日内，每一个自然日**须 **同时**满足：

- **(a)** 该日用户 **从未**将 App 置于 **前台**（任一时刻进入过前台即视为当日已打开；**仅后台刷新不算**）。
- **(b)** 该日 **没有** **Memory 保存成功**（以持久化完成时刻落入的自然日为准）。
- **(c)** 该日 **没有** **Story 生成完成**（服务端生成完成事件；**计数与清零以该业务事件为准**，与用户当日是否实际收到「Story 生成完成通知」展示无关）。

**发送：** 连续 **3 个自然日**均满足 **(a)(b)(c)** 后，在届满后的下一次调度检查点发送 **1 条**召回远程推送；点击落地 **H-01 Home**。**账户维度**，不按孩子档案拆分。

**与「Story 生成完成通知」的关系：** 若某一自然日会发生 **Story 生成完成**所触发的推送（且用户满足 Story 推送之前置条件），**当日不发送**本条召回推送。且一旦发生 **Story 生成完成**：**本条召回所依赖的「三日静默」观察窗口清零**，自该事件起 **重新**开始累计「连续三个自然日、每日 (a)(b)(c)」。

**发出召回后：** 自该条召回推送 **发送完成之时**起，下一轮须 **重新**满足「连续三个自然日、每日 (a)(b)(c)」才会再次发送。

**Memory 可编辑时间窗口：** "当月"的判断以用户本地时区为准，与素材时间范围定义一致。当月 1 日 00:00 ~ 当月最后一日 23:59:59（用户本地时区）内创建的 Memory 均可编辑；跨入下一自然月后变为只读。

---

## 照片比例与裁切规则（跨页面通用）

本节定义用户上传照片在各页面的展示规格与裁切策略。所有页面的照片展示均以本节为准。

### 允许的比例

全局仅使用以下四种比例，禁止出现其他比例：


| 比例       | 用途                                                                             |
| -------- | ------------------------------------------------------------------------------ |
| **1:1**  | 缩略图（H-02 / H-03 / H-04 编辑模式，72×72）、`photoCarousel` 横向槽位（H-01 / H-04 Read Only） |
| **3:4**  | 轮播图竖向槽位、HL-01 竖向卡片封面                                                           |
| **4:3**  | HL-01 横向卡片封面（保留用于 Gallery 瀑布流视觉）                                               |
| **16:9** | S-01 Story Card 封面（仅 `History · Generated / GeneratedLight` 类型）                |


### 源图裁切规则

用户上传的照片原始比例不可控，展示时统一按以下规则居中裁切后填入对应槽位（`object-fit: cover` 居中裁切）：


| 源图宽高关系                  | 裁切目标        | 备注         |
| ----------------------- | ----------- | ---------- |
| `width ≥ height`（含 1:1） | **1:1**（方形） | 左右居中裁掉多余部分 |
| `width < height`        | **3:4**（竖向） | 上下居中裁掉多余部分 |


**例外：** HL-01 横向卡片封面固定 **4:3**（保留 Gallery 瀑布流的横竖混排视觉），按 4:3 居中裁切，不走上表。

**原图保留**：裁切仅发生在展示槽位；**原图比例只在 FS-01 Fullscreen Photo 中以 `object-fit: contain` 保留**（见下一节）。

### Memory 主导方向（Dominant Orientation）

对于承载多张照片的 `**photoCarousel`（H-01、H-04 Read Only）**，按照该集合内横向 / 竖向照片的多数派决定整组槽位 Variant（避免同一 Memory 内横竖混排导致行高不齐）：


| 场景                   | 主导方向的计算集合                  | 决定的结果                                                             |
| -------------------- | -------------------------- | ----------------------------------------------------------------- |
| H-04 `photoCarousel` | 该 Memory 下所有照片             | 选 `photoCarousel Type=Portrait`（3:4 槽位）或 `Type=Landscape`（1:1 槽位） |
| H-01 精选照片主视觉         | 当前展示集合的 10 张照片（可能跨 Memory） | 选 `photoCarousel` 的 Portrait / Landscape variant                  |


**判定规则**：

- 源图 `width ≥ height`（含 1:1）计为"横向"，`width < height` 计为"竖向"
- 多数派决定整组展示槽位的形态；集合内个别照片仍按全局裁切规则填入该槽位
- 数量相等时随机选择（写入用户会话级缓存，避免同一入口反复跳动）

**HL-01 / HL-02 与 Dominant Orientation 解耦**：Highlight **仅一张用户选定封面**。HL-01 卡片与 HL-02 hero 的竖/横版型 **仅由该封面照片**判定：`width < height` → **3:4**；`width ≥ height` → **4:3**（HL-01 横卡与 HL-02 横版 hero 一致，均为 4:3）。

### 轮播图槽位规格

**H-01** 与 **H-04 Read Only** 的 `photoCarousel` 使用同一个 DS 组件（参见 `01 Design System · photoCarousel` 组件集），行高固定 **300px**，槽间距 12px（`Number/Spacing/M-12`）：


| Variant          | 中间槽位      | 两侧槽位      | 比例  |
| ---------------- | --------- | --------- | --- |
| `Type=Portrait`  | 225 × 300 | 195 × 260 | 3:4 |
| `Type=Landscape` | 300 × 300 | 260 × 260 | 1:1 |


**设计依据**：行高统一 300 是为了避免 Memory 内横 / 竖照片混排导致的"参差不齐"视觉；变体在 Memory 层面整体切换，不在一个集合里让横竖槽位混用。

---

## FS-01 · Fullscreen Photo（跨页面通用）

**职责：** 照片沉浸式全屏查看，保留原图比例，支持集合内左右滑动浏览。

### 触发


| 入口                     | 触发行为                     | 集合范围（可滑动浏览）                        |
| ---------------------- | ------------------------ | ---------------------------------- |
| H-02 已上传 **72×72** 缩略图 | 点击任意已上传缩略图（非「+」Add 槽）    | 当前 Memory 草稿 / 已保存集合内所有照片（最多 10 张） |
| H-04 Read Only         | 点击 `photoCarousel` 槽位内照片 | 该 Memory 下所有照片                     |
| H-04 Edit Mode         | 点击 **72×72** 已上传缩略图      | 同上                                 |


**以下入口不走 FS-01**：**H-01** 精选 `photoCarousel`（点击 → H-04）；**HL-02** 单张封面 hero（可点进 H-04 或走业务定义之分享链，不打开 FS-01）。

**编辑态 FS-01**：不提供删除入口；删除照片仅能通过缩略图角标删除控件。

### 页面结构

- 背景：纯黑（`Color/Neutral/Black`，variable `VariableID:1:96`）
- 顶部：Status Bar + NavBar（标准组件实例），NavBar 返回键使用 `arrow-left-s-line`，icon 颜色绑 `Text/OnColor`（白）
- 中部：照片区，`object-fit: contain` 保留原图比例；竖向照片在 393 宽度上**左右贴边全出血**展示
- 底部：PhotoIndicator（标准组件实例）+ iOS Home Indicator（134×5，绑 `Text/OnColor`）；Home Indicator 的 34px safe area 强制保留

### 交互

- **浏览**：左右滑动切换当前集合内的照片；PhotoIndicator 同步更新
- **退出**：点 NavBar 返回键 / 点击任意空白处 → 返回来源页面
- **计数**：不显示 "N / M" 文本计数，位置感由 PhotoIndicator 承担
- **初始照片**：打开时定位到用户点击的那张

### 权限差异

- 无（所有订阅状态可用）

### 落地

Figma `04 Overlays · FS-01 Fullscreen Photo`（`510:1461`），作为跨页面共用的全局 overlay frame 维护。

---

## Onboarding 统一布局规范

所有 Onboarding 页面采用统一布局：**顶部大标题（+ 可选副标题）→ 中部内容区（配图 / 表单 / 示例）→ 底部操作区（按钮）**。

底部操作区规则：

- 单按钮页面：主 CTA 居中
- 双按钮页面：左侧次级操作（如 Skip），右侧主 CTA（如 Continue）
- O-03 特殊情况：Name 步 + Birthday 步仅 Continue（Name + Birthday 必填，无 Skip）；More Details 步为双按钮（左 Skip / 右 Continue）；2nd / 3rd child 流程所有步骤都提供 Skip；表单上方 "Add Another Child" 文字链
- O-05 特殊情况：主 CTA 引导付费，次级文字链为免费入口

---

## O-01 · Welcome

**职责：** 建立第一印象，传递产品情感价值，驱动用户点击开始

### 页面结构

- 大标题（Slogan）
- 中部内容区（Story 示例轮播）
- 底部 CTA

### 页面内容

- Nestory Logo
- Slogan："Every little moment becomes a story."
- 情感向引导 Wording："Your baby is growing every day. Let's make sure you remember it all."
- 已生成 Story 示例：自动轮播，预设 3 个，用户可手动滑动
- CTA Button："Get Started"

### 交互细节

- 无需任何输入，纯浏览页
- Story 示例自动轮播，用户也可手动左右滑动
- 点击 "Get Started" → 进入 O-02

### 权限差异

- 无（登录前页面）

---

## O-02 · Sign In / Sign Up

**职责：** 通过第三方登录完成身份验证，新用户自动注册，老用户直接登入

### 页面结构

- 大标题 + 副标题
- 中部内容区（情感配图）
- 底部登录按钮 + 隐私声明

### 页面内容

- 大标题："Welcome to Nestory"
- 副标题："Sign in to start capturing your little one's story"
- 情感配图（待设计稿确认）
- "Continue with Apple" Button
- "Continue with Google" Button
- 隐私声明：点击登录即代表同意 Terms of Service 和 Privacy Policy（含跳转链接）

### 交互细节

- 新用户：第三方授权成功后自动创建账户，进入 O-03
- 老用户：授权成功后跳过 Onboarding，直接进入 H-01 Home
- 登录失败：Toast 提示错误原因

### 权限差异

- 无

---

## O-03 · Create Child Profile

**职责：** 引导用户创建孩子档案，建立产品核心数据基础

### 页面结构

- 大标题 + 副标题
- 中部内容区（表单）
- 底部操作区（Continue；More Details 页额外提供 Skip 跳过选填字段）

### 页面顶部

- NavBar Page Title（居中，无"Step x / y"进度条文字 — 以 Figma 为准）
- 大标题：Figma 各子步骤实际文案 —
  - `O-03a`：`"Tell me about your little one"` + 副标 `"Let's start with a photo and a name"`
  - `O-03b`：`"When did {name} come into your world?"` + 副标 `"This helps me track milestones and create age-appropriate stories"`
  - `O-03c`：`"A few more details help me create better stories"` + 副标 `"All optional — share what feels right"`

### 页面内容（分三步：Name → Birthday → More Details）

- **Name 步**：孩子名字（**必填**，上限 50 字符）+ 头像上传（选填）
- **Birthday 步**：出生日期 Date Picker（**必填**）→ Confirm Bottom Sheet 二次确认（"Once saved, this date cannot be changed"）
- **More Details 步**：性别（选填：Boy / Girl / Prefer not to say）+ 身高（选填，cm / in）+ 体重（选填，kg / lb）
- "Add Another Child" 文字链：保存当前档案，清空表单，页面标题下方显示已添加数量（如 "1 child added"、"2 children added"），继续填写

### 底部操作区

- **Name 步 + Birthday 步**：只有 "Continue" 按钮，**不提供 Skip**（必填字段不应有逃逸口）。Continue 未填时置灰
- **More Details 步**：左侧 "Skip" + 右侧 "Continue"（Skip = 跳过选填字段，直接保存当前档案进入 O-04）
- **2nd / 3rd child 流程**：三个步骤都提供 Skip，语义为"放弃此 2nd/3rd child，完成 Onboarding 或继续添加下一个"；因为 1st child 已保存，放弃 2nd 不会丢失核心数据

### 交互细节

- **Name + Birthday 为必填项**（1st child）；Continue 按钮未满足条件时置灰
- Birthday 必填的产品依据：AI Story 的 tone、Highlights 的 milestone 判定都依赖年龄，这两项是产品核心能力而非可选参数
- Onboarding 阶段不限制档案创建数量，与付费计划无关
- 进入 Home 后，Free 多档案：切换入口可进入但非活跃档案不可选

### Free 用户多档案 Inline 提示

- **触发时机：** Free 用户点击 "Add Another Child" 成功保存第 1 个档案后，在页面顶部显示 inline 提示条
- **文案：** "Free plan supports one active profile. You can add more now, but switching requires Premium."
- **视觉：** 低权重信息条，不阻断操作，不弹窗
- **目的：** 用户知情，避免后续在 H-01 发现切换锁定时产生被欺骗感

### 多档案默认激活规则

- 进入 H-01 时，系统激活**最早创建的档案**为默认活跃档案
- 确定性行为，避免用户困惑

### 权限差异

- 无（Onboarding 阶段不限制档案数量）

---

## O-04 · Permissions

> **命名对齐**：产品文档本页仍用 **Permissions** 指「通知权限」步骤；Figma `02 Main UI` 中该步 frame 名为 `**O-04 Notifications`**，检索画布 / node 时以 Figma 为准。

**职责：** 获取通知权限，说明价值，不强制，不阻断流程

### 页面结构

- 大标题 + 副标题
- 中部内容区（图示说明）
- 底部操作区（左 Skip for now / 右 Continue）

### 页面顶部

- NavBar Page Title（以 Figma 为准，无"Step x / y"进度条文字）
- 大标题："Don't miss a moment"
- 副标题："Get notified when the monthly Story is ready"（以 Figma `O-04` 为准）

### 通知权限区块

- 图片示意
- CTA Button："Enable Notifications" → 触发系统通知权限弹窗
- 权限已授予后：按钮变为已启用态（✓ Enabled），不可再次点击

### 底部操作区

- 左侧 "Skip for now"：次级文字链，效果同 Continue，视觉权重更低
- 右侧 "Continue"：无论权限是否授予均可点击，进入 O-05

### 交互细节

- 用户拒绝系统弹窗后，对应按钮变为 "Open Settings"，引导手动开启，不强制

### 权限差异

- 无

---

## O-05 · Plan Introduction

**职责：** 透明展示 Free 与 Premium 差异，让用户在知情状态下选择起点；主 CTA 引导付费，次级 CTA 为免费入口

### 页面结构

- 大标题
- 中部内容区（对比表 + 价格 + 计费周期切换）
- 底部操作区（主 CTA 付费 / 次级文字链免费）

### 页面顶部

- NavBar Page Title（以 Figma 为准，无"Step x / y"进度条文字）
- 大标题："Choose your plan"
- 副标题："Start with a free trial, cancel anytime"（以 Figma `O-05` 为准）

### 页面内容

- Free vs Premium 核心差异对比（简明列举，非穷举）：


| 权益                                              | Free     | Premium   |
| ----------------------------------------------- | -------- | --------- |
| AI Stories                                      | 2 total  | Unlimited |
| Watermark-Free Sharing                          | ✘        | ✔         |
| Highlights — save & share your favorite moments | Up to 10 | Unlimited |
| Child Profiles                                  | 1 active | Unlimited |
| Extra Features (e.g., Birthday Celebrations)    | ✘        | ✔         |


- 表格下方小字注释："Free Stories include a small Nestory watermark when shared."

### 计费周期切换

- Yearly / Monthly 两个选项卡，Yearly 默认选中
- Yearly：$100/年（首月免费），标注 "Save $19.88"
- Monthly：$9.99/月（首月免费）
- 切换后价格展示区实时更新

**Free Trial 资格：** 由平台（App Store / Google Play）管理，每个账户仅享受一次 Free Trial，无论选择 Monthly 或 Yearly。取消后再次订阅不再享受。Nestory 后端不做 Trial 资格校验。

### 底部操作区

- 主 CTA："Try Premium Free for 1 Month" → 触发订阅流程 → 成功后 → 若首次激活 Premium/Trial → Sync · Initial Loading → H-01；否则直接 H-01
- 次级文字链："Start with Free" → 直接进入 H-01 Home（`Never Paid` 状态，无云同步）

### 权限差异

- 无

---

## O-06 · Terms of Service

**职责：** 法律文本详情页（Onboarding 流程外的跳转页面，占位草案，最终版由 legal 团队提供）

### 触发

- O-02 Sign In 底部 `"By continuing, you agree to our [Terms of Service] and [Privacy Policy]"` 链接中的 Terms
- O-05 Plan Introduction 底部法律链接中的 Terms
- ST-05 About 的"Terms of Service"跳转

### 页面内容（以 Figma `02 Main UI · O-06 Terms of Service` `64:330` 为准）

- NavBar：返回箭头 + Page Title `"Terms of Service"`
- 副标："Last updated: Apr 15, 2026 · Placeholder copy"
- 正文分 5 节（1. Agreement / 2. Your Account / 3. Content / 4. Subscriptions / 5. Contact）
- 底部 CTA：`"Back"` 返回跳转来源页

### 备注

- **不占 Onboarding 步骤编号**：O-06 是从 O-02 / O-05 / ST-05 跳转的法律详情页，不计入 Onboarding 主流程的 5 步
- 正文是 placeholder，最终文本走法律评审

---

## O-07 · Privacy Policy

**职责：** 隐私政策详情页（同 O-06 定位，跳转页）

### 触发

- O-02 / O-05 底部法律链接中的 Privacy
- ST-05 About 的"Privacy Policy"跳转
- ST-04 Data & Privacy 相关链接

### 页面内容（以 Figma `02 Main UI · O-07 Privacy Policy` `64:361` 为准）

- NavBar：返回箭头 + Page Title `"Privacy Policy"`
- 副标："Last updated: Apr 15, 2026 · Placeholder copy"
- 正文分 5 节（1. Data we collect / 2. How we use it / 3. Storage and security / 4. Your choices / 5. Contact）
- 底部 CTA：`"Back"` 返回跳转来源页

### 备注

- 同 O-06，不占 Onboarding 步骤编号
- 文本 placeholder，最终由法律评审

---

## Initial Sync · Loading（过渡页，不占 Onboarding 编号）

> Figma frame：`03 States · Sync · Initial Loading`（`407:208`）

**职责：** `Trial Active` / `Premium Active` 用户首次登录或换设备登录时的云端数据同步过渡页，承载等待态，避免用户进入 H-01 后看到空列表产生"数据丢了"的误解

### 触发时机

- Onboarding 选 "Try Premium Free for 1 Month" 并订阅成功 → 首次进入
- `Trial/Premium Active` 用户在新设备登录（session 为空且云端有历史数据）
- `Never Paid` / `Ended` 用户**不经过**此页（本地存储模型，无需云端同步）

### 页面内容

- 全屏居中 `Loading/Page` 组件 INSTANCE（对应 Figma Design System `Loading/Page` 组件）
- 文案："Syncing your memories..."（或动态文案"Syncing X of Y memories..."，展示当前进度）
- 无返回按钮，无取消按钮（MVP 不支持中途取消；极端长耗时 fallback 见下）

### 流程

1. 进入页面 → 后端开始下拉云端 Memory / Story / Highlight / 孩子档案数据
2. 同步完成 → 自动路由 → H-01 Home
3. 同步失败（网络断开等） → Toast `No Network` → 提供重试按钮 / 选择"稍后同步"（进入 H-01，标记需后台补同步）

### Loading 策略（全局）

- **Initial Sync 场景**：走 `Sync · Initial Loading` 过渡页
- **内容列表页（H-03 / S-01 / HL-01）首次渲染**：**不做 per-page skeleton**；若数据已本地缓存直接渲染；若需等待网络，页面顶部 NavBar 下方出现 inline 指示器（细条 loading indicator），不阻断已渲染部分
- **图片懒加载**：卡片缩略图走 placeholder → 加载完成后淡入，不单独设 Skeleton 态
- **Story 生成中状态**：走 S-01 当月卡片的状态二（"X memories collected · Story in Y days"），不展示额外 Loading 页

设计依据：避免用户在每个页面都看到不同的 loading 过渡造成认知负担，Initial Sync 一次集中承载，日常使用全部走 instant-render 策略

### 权限差异

- 仅 `Trial Active` / `Premium Active` 用户触发
- `Never Paid` / `Ended`：不触发本页

详见 Figma `03 States · Sync · Initial Loading`（`407:208`）与 `StateMatrix §5 已完成`

---

## H-01 · Home

**职责：** 核心记录入口，以孩子照片为主视觉，激发父母记录当下的冲动；同时提供当月 Memory 管理入口

### 页面结构（从上到下）

- 顶部导航栏：孩子档案区（左）+ Settings 图标（右）
- 精选照片主视觉区域
- 当月 Memory 区块（数量 + View All 入口）
- 当月进度区块（弱化展示）
- 启发式提示文案
- Add Memory 主 CTA Button（固定底部）

### 顶部导航栏

- 单个档案：仅显示孩子头像 + 名字，无切换箭头
- 多个档案：显示 avatarRow chevron，点击 → Profile Switcher Bottom Sheet，变体按订阅状态切换：
  - `Never Paid`（Free）：Free 变体 — 非活跃档案半透明 0.6 + Premium badge 不可选，subtitle 纯文本 `"Free plan supports one active profile. Upgrade to switch between them."`，底部 "Upgrade to Premium" CTA → P-01 **Paywall D**
  - `Trial/Premium Active`：Premium 变体 — 所有档案全亮无 badge，点击直接切换，无底部 CTA
  - `Ended`（Trial Ended / Premium Ended）：Ended 变体 — 视觉同 Free（0.6 opacity + Premium badge）但**所有档案可点击切换**，subtitle 改用 `Notify Type=Info` 组件（instance name = `"Info message"`，非 Warning；文案 `"Premium ended. All your profiles are still here — renew to keep switching freely."`），底部 "Renew Premium" CTA → P-01 **Paywall D**
- 未创建任何档案时：顶部不显示孩子姓名和切换入口，仅保留 Settings 图标
- **avatarRow 主视觉三变体**（H-01 顶部大头像区）也同步切换：Free/Ended 非当前档案切换时呈 0.6 opacity + Premium badge；Premium 全亮无 badge；详见 `StateMatrix §5 已完成 · avatarRow Variants`

### 精选照片主视觉区域

- **数据源**：优先展示当月已上传照片；当月照片不足 10 张时，往前推历史照片补足至 10 张（照片可能跨 Memory）
- **组件**：使用 `photoCarousel` DS 组件（参见"照片比例与裁切规则"），行高 300px，Portrait / Landscape 两个 Variant 按当前 10 张照片集合的 Dominant Orientation 选择
- **交互**：自动轮播展示，用户可手动左右滑动
- **点击行为**：点击照片 → 进入 H-04 Memory Detail（承担 Memory 再次进入的钩子；**H-01 不走 FS-01**，FS-01 由 H-04 内部承接）。可能为可编辑或只读状态，取决于该 Memory 所属月份是否为当月
- **返回路径**：从 H-01 照片进入 H-04 后，点返回 → 回到 H-01

### 当月 Memory 区块

- 显示当月 Memory 数量（如 "12 memories this month"）
- "View All →" 文字链入口 → 跳转 H-03 Memory List
- 不展示 Memory 缩略预览，保持 Home 页面的情感简洁性

### 当月进度区块（弱化）

- 字号小，颜色浅，视觉权重低
- 仅显示：下次 Story 生成时间（如 "Next Story in 8 days"）
- Free 用户配额未耗尽时：与 Premium 显示一致，不额外提示限制
- Free 用户第 2 份 Story 生成后（配额 = 0）：进度区块下方出现提示 "Upgrade to keep the story going →"，点击触发 P-01
**配额耗尽用户的上传语境提示：**
- 配额 = 0 的用户在 H-01 仍可看到 Add Memory 按钮和 Memory 区块
- 当月 Memory 区块下方新增轻量提示："Your memories are being saved, but you'll need Premium to turn them into a Story."
- 视觉权重低于进度区块的 Upgrade 提示，不重复弹窗

### 启发式提示

- 每次打开 App 随机从预设池中抽取一条展示
- 文案风格：轻松、情感向、具体

**预设提示文案池（20 条）：**

1. "Did your little one smile today?"
2. "What was the funniest thing that happened today?"
3. "Any new sounds or words today?"
4. "What did your baby explore today?"
5. "How was mealtime? Any new favorites?"
6. "Did anything make you laugh together?"
7. "What was bedtime like tonight?"
8. "Any new tricks or moves today?"
9. "Who did your little one play with today?"
10. "What made today different from yesterday?"
11. "Did your baby discover something new?"
12. "How did bath time go?"
13. "Any cuddle moments worth remembering?"
14. "What's your little one's latest obsession?"
15. "Did you go anywhere special today?"
16. "What song made your baby dance today?"
17. "Any outfit-of-the-day moments?"
18. "What was the sweetest thing you saw today?"
19. "Is your little one sleeping better lately?"
20. "What would you tell future-you about today?"

### Add Memory CTA

- 固定底部主按钮
- 点击 → **先**打开 **`H-02 / Sheet · Add Photo Source`**（与 H-02 内「+」槽为同一 Bottom Sheet）→ 选图 / 拍照完成后再进入 **H-02 Add Memory**（所选照片已出现在照片区）
- Save 后返回 H-03 Memory List

### 权限差异

- `Never Paid` 多档案：Profile Switcher 非活跃档案不可选，底部 Upgrade CTA
- `Trial/Premium Active`：所有档案全亮可切换
- `Ended`：档案全部可切换（数据不伤害），底部 Renew CTA

详见 `SubscriptionRules v1.3 R-05` 与 `StateMatrix §2.7.2`

---

## H-02 · Add Memory

**职责：** 完成单条素材的上传，支持照片、文字、Tag，可标记为 Highlight

### 来源与返回目标

H-02 可从三个入口进入，Save 后返回目标跟随发起页面：


| 来源                | Save 后返回          |
| ----------------- | ----------------- |
| H-01 Home         | H-03 Memory List  |
| H-03 Memory List  | H-03 Memory List  |
| S-01 Stories List | S-01 Stories List |


H-02 需要接收来源参数以决定返回目标。

### 页面顶部

- 返回按钮（← 返回来源页面，不执行 Save）
- 标题："New Memory"

### 页面内容

**照片上传区（必填）**

- 单条 Memory 最多上传 **10 张**照片
- 每张照片最大 **10MB**，格式支持 **JPEG / PNG / HEIF**
- **`H-02 / Sheet · Add Photo Source`（Bottom Sheet）**：仅 **Take Photo**、**Choose from Album**、**Cancel** 三行（iOS Action Sheet 风格；**已移除**「Choose from Files / 从文件选择」）。**首次**点「拍照」或「从相册」时发起对应系统权限；拒绝 → `Toast · Camera Denied` / `Toast · Library Denied`（相册入口 UI 文案为 **Album**，与 Toast 命名一致）。
- **打开 Sheet 的入口**：(1) **H-01** 底部 **Add Memory** 主按钮；(2) **H-02** 照片平铺区尾部的 **「+」** 槽（含「已删光所有图后再次添加」「已有图继续追加」）。两处打开 **同一** Sheet。
- 已上传照片以 **72×72（1:1）** 缩略图形式平铺展示（与 H-03 Memory 卡片、H-04 编辑模式复用同一规格）；源图按"照片比例与裁切规则"居中裁切为方形
- **点击已上传缩略图（非「+」槽）→ `FS-01 Fullscreen Photo`**，集合为当前 Memory 内照片（草稿态含已选未保存的图，产品可与工程对齐）
- 上传后可删除（点击已上传照片上的删除图标）；**FS-01 内不提供删除**
- 超出上限时，新增按钮置灰 + Toast 提示："Maximum 10 photos per memory."

**文字输入框（必填）**

- 上限 500 字符，实时字符计数

**Tag 选择（选填，可多选）**

H-02 主页面显示已选 Tag chips（最多 3 个可见 + `+N more`）；点击 Tag 行 → 打开 `Sheet · Tag Picker`（Bottom Sheet）。

**Tag Picker Bottom Sheet 内容：**

- 顶部 8 个系统预设 Tag（Playtime / Mealtime / Bedtime / Bath Time / Outdoor / Family Time / Funny Moment / Learning），多选 chip，已选高亮
- 中部 User Tag Library：展示该用户已创建的 custom tag（chip 多选 + 每个 chip 右上角 × 可删除）
- 底部自定义 tag 输入框 + "Add" 按钮
- 底部 "Done" CTA 确认返回 H-02

**Tag 交互规则（v1.6 新增）：**


| 规则                       | 说明                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Per-memory 上限            | **10 个**（预设 + 自定义合计）。第 11 个选择被拦截，触发 `Toast · Tags Limit`（文案：`"Maximum 10 tags per memory."`），已选 10 个保持；Tag Picker 不显示计数器，到上限仅由 Toast 报信 |
| Custom tag 创建            | 输入框输入 + 按 Enter 或点 "Add" → 新 tag 自动选中并进入 user tag library（iOS 标准交互：打字创建的目的就是"这个 memory 要用它"）                                            |
| Custom tag 存储模型          | **Value 存储不是引用**——Memory.tags 是字符串数组，独立于 user tag library。Memory 自包含，save 时做一次快照                                                        |
| Custom tag 持久化           | 已创建 custom tag 跨 session 保留在 user tag library（`Never Paid` 存本地，`Premium/Trial Active` 双写云端同步）；下次开 Tag Picker 还在                         |
| × chip 语义 = 从 library 删除 | 点 × = 从 user tag library 删除该 custom tag，**已保存的 Memory.tags 字符串快照不受影响**。旧 Memory 打开编辑态时仍会显示（orphan chip：当次可选取但再加需重新打字创建）                 |
| Story 生成后不受影响            | Story 是一次性生成的 artifact，读 Memory.tags 字符串拼 prompt，后续 tag library 变动不回改已生成 Story                                                          |
| Normalize                | 创建 custom tag 时 trim 首尾空格 + lowercase 作 matching key（"Bath Time" / "bath time" 视为同一个 tag），display form 以用户首次输入为准                        |


> 详见 `StateMatrix §3.1 Tag Picker`、Figma `215:1057` annotation

注：预设 8 个 Tag 在 MVP 阶段固定，后续可基于用户数据优化排序和增删。Justin 在 Data Model 中将 Tag 设计为关联表（非 enum），以支持未来动态更新。

**Highlight 行（"Mark as Highlight"）**

Highlight 行根据订阅状态 + `highlight_count` 呈两种形态：

- **Normal 态**（`Trial/Premium Active` 或非 Premium 且 `count < 10`）：Toggle 可开关。打开后：**不**再展示独立 Highlight 长文输入；若当前 Memory **≥2 张照片**，立即弹出 `**H-02 / Sheet · Select Highlight Cover`** 选定唯一封面（首进默认选中规则见 Figma sheet annotation）；若仅 **1 张**则默认该张为封面、**不弹 Sheet**。Toggle 保持 On 时，若已存在封面选择，展示子行 `**Change cover photo`**（右侧箭头）→ 再次打开 `**Select Highlight Cover**`。Highlight **标题由 AI 从本 Memory 正文 + Tag 生成**（保存后或异步，与产品数据管线对齐），不在本页手写。
- **Locked 态**（`Never Paid` 或 `Ended` 且 `count >= 10`，以 Figma `02 Main UI · H-02 / highlightRow · States · Locked` 为准）：
  - toggle 视觉保持 Off 样式、**不置灰、不换锁图标**（保持 H-02 整页布局稳定）
  - 行下方多一行 Text/Secondary caption，Figma 画的是 Never Paid 版：`"Free plan · 10 / 10 Highlights used"`
  - Ended 用户运行时由开发切换为 `"{kind} ended · 10 / 10 Highlights used"`（`{kind}` = Trial / Premium），不拆 frame
  - 点击 Locked toggle → P-01 **Paywall B**（Highlights 主题，Never Paid 和 Ended 统一；按 §StateMatrix 2.7.7 模型 X）
  - 关闭 Paywall 后 Memory 保留为普通 Memory，不标记为 Highlight
  - 交互设计理由：Locked 态采用"信息透明不预阻拦"（caption 说清语境）而非"toggle 预置灰"，点击瞬间弹 Paywall 作为最终硬拦截

详见 `SubscriptionRules v1.3 R-04` 与 `StateMatrix §2.7.6 / §2.7.7`

### 底部操作区

- **主 CTA 动态文案（全局统一，与 H-04 编辑模式 `Save Changes` 同一套规则）**：


| 照片  | 正文  | 按钮文案                 | 可点          |
| --- | --- | -------------------- | ----------- |
| 未上传 | 任意  | `Save`               | Disabled    |
| 未上传 | 已填  | `Add photos to Save` | Disabled    |
| 已上传 | 空   | `Add a note to Save` | Disabled    |
| 已上传 | 已填  | `Save`               | **Enabled** |


- Tag 选填，**不参与**上述门禁。保存后返回来源对应的目标页面。

### 首条 Memory 保存与地理位置权限

- 当且仅当本次 **Save** 使账户下已成功持久化的 Memory **从 0 条变为 1 条**时，在 **Save 成功之后** 触发 **系统定位权限弹窗**（详见上文 **ST-01 · Stories · 地理位置** 与 **`## 4.3`** 表格）。
- **不从** H-01 / H-02 冷启动自动请求定位；**不在**用户未 Save 前打断选图流程。

### 交互细节

- 文字输入框获得焦点时，键盘弹起，Tag 区域随键盘上移

### 权限差异

- `Never Paid` / `Ended`：Highlight 行到 10 上限呈 Locked 态，点击触发 P-01
- `Trial/Premium Active`：Highlight 无上限
- Tag 上限对所有订阅状态一致（per-memory 10，不随订阅升级放宽）

---

## H-03 · Memory List

**职责：** 全量 Memory 时间线，按年→月→天→条目层级展示，提供 Memory 浏览与管理入口

### 页面顶部

- 返回按钮（← 返回 H-01）
- 页面标题："Memories"
- **年份筛选 Tab：** 跨自然年后显示（如 "2026 | 2025"），选中年份高亮
- **月份筛选：** 超过一个自然月后，顶部显示月份快速跳转（横向滑动的月份 Chip），点击自动滚动至对应月份区块

### Save 成功反馈

从 H-02 Save 返回 H-03 时，页面顶部显示 transient success banner：

- 文案："Memory saved!"
- 自动消失（约 3 秒）
- 不阻挡列表操作

### 列表结构

按月→天→条目三级分组，月份按时间倒序排列（当月在最上方），每天内按时间正序排列。

**当月区块：**

- 月份标题："Current Month"
- 标注文案："These memories will be used for this month's Story"
- 按天分组：日期标题（如 "Mar 20"）→ 每条 Memory 显示时间（如 "17:34"）+ 缩略图 + 文字摘要
- **缩略图规格**：**72×72（1:1）**，按"照片比例与裁切规则"居中裁切；与 H-02 照片上传区、H-04 编辑模式复用同一规格
- **底部 Add Memory 按钮：** 当月 Story 尚未生成时显示 → 点击进入 H-02（来源 = H-03）；当月 Story 已生成时隐藏
- 当月 Memory 可编辑 / 可删除

**历史月份区块（Story 已生成）：**

- 月份标题（如 "February"）
- 标注文案："These memories were used to create February's Story"
- 按天分组，结构同当月
- 所有 Memory 只读，不可编辑 / 不可删除

**历史月份区块（Story 未生成）：**

- 月份标题（如 "February"）
- 标注文案："These memories were recorded in February"
- 按天分组，结构同上
- 所有 Memory 只读，不可编辑 / 不可删除

**点击任意一条 Memory → 进入 H-04 Memory Detail**

### 空状态

- 当月无任何 Memory 时：空状态插图 + 文案 "No memories yet this month. Start capturing moments!" + Add Memory 按钮

### 权限差异

- 无（Memory List 本身无 Free / Premium 差异，差异体现在 H-04 编辑和 Highlight 标记上）

---

## H-04 · Memory Detail

**职责：** 展示单条 Memory 完整内容，当月可编辑与删除，历史月份只读

### 页面顶部

- 返回按钮（返回目标根据来源决定：从 H-01 进入 → 返回 H-01；从 H-03 进入 → 返回 H-03）
- 右上角：当月 Memory 显示 "Edit" 入口；历史月份 Memory 隐藏

### 只读 Banner（仅历史月份 Memory 显示）

- Story 已生成的月份文案："This memory was used to create a Story. We keep it as-is to preserve the authenticity of your records."
- Story 未生成的月份文案："This memory is part of your past records and can no longer be edited."
- 视觉权重低，不遮挡内容

### 页面内容

- 照片展示区：使用 `photoCarousel` DS 组件（参见"照片比例与裁切规则"），行高 300px；Portrait / Landscape 两个 Variant 按该 Memory 的 Dominant Orientation 选择
- **点击轮播槽位内照片 → FS-01 Fullscreen Photo**，集合范围为该 Memory 下所有照片
- 文字内容
- Tag 列表
- 记录时间（系统自动，不可修改）
- **若该 Memory 已标记为 Highlight**：在正文区下方展示 `**highlightCard`**（Figma `02 Main UI · H-04 Memory Detail (Read Only)` 内 `102:605`）—— 横向卡片：`Surface/Card` + `Border/Brand` 细描边；**左** `**Photo` · Thumbnail · 72×72**（= 用户选定的 Highlight 封面）；**右** 纵向：**Remix `star-fill`（与 TabBar Highlights 同源）** + 固定标题 `**Marked as a highlight`** + **AI 提取标题**（单行，`…` 省略）。**整块可点 → HL-02**。未标记 Highlight 时该卡片隐藏。

### 编辑模式（仅当月 Memory）

- 点击 "Edit" 进入编辑模式
- 编辑模式下照片区改为 **72×72（1:1）** 缩略图平铺（与 H-02 / H-03 复用同一规格），每张右上角带删除图标；尾部为 "+" Add Photo 入口；**点击已上传缩略图 → FS-01**（集合同只读模式之该 Memory 全图）


| 字段            | 当月 Memory                                                                                                                  | 历史月份 Memory |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 照片            | ✅ 可增删替换                                                                                                                    | ❌ 只读        |
| 文字（上限 500 字符） | ✅ 可编辑                                                                                                                      | ❌ 只读        |
| Tag           | ✅ 可编辑                                                                                                                      | ❌ 只读        |
| Highlight 标记  | ✅ 可编辑（与 **H-02** 同款：`Mark as Highlight` + 多图时 `**Select Highlight Cover`** + `**Change cover photo**` 子行；无 Highlight Note） | ❌ 只读        |
| 记录时间          | ❌ 系统自动                                                                                                                     | ❌ 只读        |


### 底部操作区（编辑模式）

- **主按钮「Save Changes」**：与 H-02 **同一套四态门禁**（须已上传 ≥1 张照片且正文非空）。动态文案建议为 `**Save Changes` / `Add photos to Save Changes` / `Add a note to Save Changes` / `Save Changes`**（在 H-02 的 `Save` / `Add photos to Save` / `Add a note to Save` / `Save` 对应语义上统一加 `Changes`；若工程收敛为单一文案 key，以 iOS 实现为准）
- "Cancel"（次级，返回只读视图）
- "Delete Memory"（文字链，红色，视觉权重最低）
  - 点击 → Bottom Sheet 二次确认
  - 文案："Delete this memory? This can't be undone."
  - 按钮："Delete"（红色）/ "Cancel"
  - 确认删除 → 返回来源页面（H-01 或 H-03），列表实时更新

### 权限差异（编辑模式）

- `Never Paid` / `Ended` Highlight 达 10 上限：Toggle 呈 **Locked 态**（视觉与 H-02 一致：toggle 保持 Off 不置灰 + 行下方 caption `"Free plan · 10 / 10 Highlights used"`，Ended 运行时切换 `{kind}` 版），点击 toggle → P-01 **Paywall B**
- `Trial/Premium Active`：无上限
- Tag 编辑上限对所有订阅状态一致：per-memory 10 个（预设 + 自定义合计），第 11 个触发 `Toast · Tags Limit`

详见 `SubscriptionRules v1.3 R-04` 与 H-02 Tag Picker 规则

---

## S-01 · Stories List

**职责：** 以时间轴形式展示所有 Story 卡片（含多种状态），当月状态卡片提供进度感知和上传引导

### 页面结构（从上到下）

- 页面标题："Stories"
- **降级常驻 Notify（仅 `Ended` 态）**：NavBar 下方常驻 `Notify Type=Warning`，文案两版运行时切：
  - `Trial Ended`：`"Your Free Trial has ended. Your memories are safe — upgrade to continue."`
  - `Premium Ended`：`"Your Premium plan has ended. Your memories are safe — upgrade to continue."`
  - 右侧 CTA "Renew" → P-01 Paywall D
  - 不自动消失，订阅状态恢复为 `Active` 后自动隐藏
  - 取代 v1.5 方案"首次打开 App 触发一次 `Toast · Premium Ended`"（该 Toast 已废弃）
- 年份筛选 Tab（跨自然年后显示，顶部 Tab 式切换）
- 当月状态卡片（置顶）
- 历史 Story 卡片列表（时间倒序）

详见 `SubscriptionRules v1.3 R-10` 与 `StateMatrix §2.7.1`

### 当月状态卡片

纯展示卡片，**不可点击**（配额锁定态除外）。视觉上与已生成 Story 卡片有明显区分（如虚线边框）。

**状态一：** 本月尚无上传

- 文案："Start capturing this month's memories"
- 引导文案 + Add Memory 入口（见下方"Add Memory 次级入口"）

**状态二：** 已有上传但未生成

- 文案："X memories collected · Story in Y days"
- 动态引导文案（按当月累计 Memory 数量匹配最近达到的最高 milestone）：


| Memory 数量 | 引导文案                                                                   |
| --------- | ---------------------------------------------------------------------- |
| 1         | "Your first memory this month! Every little detail matters."           |
| 3         | "3 memories so far — your story is starting to take shape."            |
| 10        | "10 memories collected. This month's Story is going to be a good one." |
| 15+       | "What a month! Your little one's story will be full of moments."       |


- 展示规则：文案跟随最近达到的最高 milestone；如用户一次性超过多个 milestone，直接展示最高档；每档文案仅在对应区间内展示，不回溯
- Add Memory 次级入口

**状态三：** `Never Paid` 配额 = 0（第 3 月起）/ `Ended` 用户

- 锁定态，文案："You've used your 2 free Stories. Upgrade to keep recording every month."
- **可点击** → P-01（触发点 C；**全部 → Paywall C**，按 `StateMatrix §2.7.7` 模型 X 以功能主题映射，不看订阅状态）
- 不显示 Add Memory 入口

### Add Memory 次级入口（状态一 / 状态二时显示）

- 形式：次级 CTA 文字链或小按钮 "+ Add Memory"
- 点击 → H-02（来源 = S-01）→ Save 后返回 S-01

### 历史 Story 卡片

每张卡片的状态和行为：


| 状态  | 适用场景                     | 视觉                | 点击行为                |
| --- | ------------------------ | ----------------- | ------------------- |
| 已生成 | 所有已正常生成的 Story（无论用户当前身份） | 封面图 + 月份标题 + 简短摘要 | → S-02 Story Detail |
| 未生成 | 有 Memory 但 Story 未生成的月份  | 缺省占位图（灰调 / 虚线）    | 不可点击                |


**封面图规格**：`History · Generated` 与 `History · GeneratedLight` 的 Story Card 封面固定为 **353×198（16:9）**，由 AI 从该月份素材中挑选；`NotGenerated` 状态使用灰调占位图，尺寸一致。

**"未生成"卡片说明：**

- 文案："No Story was created for [Month]."
- 底部轻量文字链："Upgrade to generate Stories every month → "（点击 → P-01），不做为卡片整体点击行为
- 适用于 Free 配额耗尽或降级后有 Memory 上传但未生成 Story 的月份

列表按时间倒序，最新在上。

### 权限差异

- `Never Paid`：第 3 月起新 Story 不再生成，当月卡片锁定态；历史中可能出现"未生成"卡片；所有已生成 Story 可正常访问
- `Ended`：同 `Never Paid`（配额 = 0），所有已生成 Story（含付费期间生成的）可正常访问；顶部额外常驻 Notify
- `Trial/Premium Active`：无限制

---

## S-02 · Story Detail

**职责：** 沉浸式展示 AI 生成 Story，纯阅读体验

### 页面结构

- 顶部：返回按钮 + 月份标题 + 右上角分享图标
- H5 WebView 全屏渲染

### 页面内容

- H5 WebView 全屏渲染，样式由系统根据季节 / 节日 / 月龄自动分配
- 右上角分享图标 → 生成 H5 链接 → 系统 Share Sheet
- Free 用户：Story 内容带 Nestory 水印
- Premium 用户：无水印

**H5 页面底部品牌触点：**

- 所有 Story H5 页面（含 App 内 WebView 和外部分享链接）底部展示 Nestory 品牌标识 + App Store / Google Play 下载链接
- 视觉权重低，不干扰阅读体验
- 目的：让通过分享链接看到 Story 的非用户知道产品来源并提供下载入口

### 交互细节

- 点击返回 → 返回 S-01
- 纯阅读页，不包含 Memory 列表、不包含 Tab 切换

### 触发点 A 逻辑（仅在此页面触发）

- **触发条件：** Free 用户首次查看第 2 份（最后一份免费）Story 后，点返回按钮回到 S-01
- **实现方式：** 系统标记该 Story 为 `is_last_free_story = true`（配额归零时生成的 Story）。用户从 S-02 返回时，检查此标记 + 用户为 Free 状态 + 首次触发 → 延迟 0.5-1s 后弹出 P-01
- **频率限制：** 同一 Story 周期内仅触发一次，关闭后不再弹出
- **异常处理：** 用户在阅读中关闭 App → 下次进入 App 并查看该 Story 后返回时触发

### 权限差异

- Free 用户：可访问所有已生成 Story，内容带水印
- 降级用户：可访问所有已生成 Story（付费期间生成的无水印，Free 期间生成的带水印）
- Premium：无限制
- 注：无法进入本页的唯一情况是 S-01 中"未生成"卡片（该月份没有 Story 数据）

---

## HL-01 · Highlights Gallery

**职责：** 展示所有已标记的 Highlight 卡片，形成孩子成长关键节点的完整合集

### 页面顶部

- 页面标题："Highlights"
- 年份筛选 Tab（跨自然年后显示，与 S-01 样式保持一致）
- 已使用数量提示：`Never Paid` / `Ended` 用户显示 "X / 10 used"；`Trial/Premium Active` 用户不显示计数
- **提示条（NavBar 下方常驻，4 场景互斥，以 Figma `02 Main UI · HL-01 / topNotify · States` 为准）：**


| 场景 (Figma frame 名)                                      | 触发条件                      | Notify Type | 文案（以 Figma 为准）                                                                                             | CTA →         |
| ------------------------------------------------------- | ------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- | ------------- |
| `Scenario 1 · Free 10/10`                               | `Never Paid` + count = 10 | `Warning`   | `"10 / 10 Highlights used. Upgrade for unlimited. →"`                                                      | **Paywall B** |
| `Scenario 2 · Ended Under Limit`                        | `Ended` + count < 10      | `Warning`   | `"Premium ended — new Highlights capped at 10. Upgrade for unlimited. →"`                                  | **Paywall B** |
| `Scenario 3 · Ended At Limit`                           | `Ended` + count = 10      | `Warning`   | `"Premium ended — you've reached the Free limit of 10. Upgrade to add more. →"`                            | **Paywall B** |
| `Scenario 4 · Ended Over Limit`                         | `Ended` + count > 10      | `Warning`   | `"Premium ended — your existing Highlights are safe. New ones are capped at 10. Upgrade for unlimited. →"` | **Paywall B** |
| 其他（`Trial/Premium Active` 全部 / `Never Paid` count < 10） | —                         | 不显示         | —                                                                                                          | —             |


- **互斥优先级**：④ > ③ > ② > ①（越特异越优先，"Ended" 语境覆盖 Never Paid 配额提示）
- **Paywall 路由**：4 个 Scenario 全部 → **Paywall B**（按 `StateMatrix §2.7.7` 模型 X，HL-01 topNotify 的上下文一致是 Highlights 配额主题）
- `**{kind}` 运行时**：Figma 里 Scenario 2/3/4 硬编码 `"Premium ended —"`，运行时若用户来源是 Trial，开发替换为 `"Trial ended —"`，不拆 frame

### 卡片展示区

- Grid 布局，暂定每行 2 张（待设计稿最终确认）
- 每张卡片显示：**封面照片** + **AI 标题** + **记录日期**（**无**独立描述区 / Tag chip；Tag 仍可参与 **DS 卡片模板**匹配与 AI 标题提取，不在卡面上展示 chip 列表）
- 卡片模板根据 Tag 自动匹配；未选择任何 Tag 时使用默认样式模板。模板不跟随季节变化
- 按时间倒序排列，最新在上
- 点击卡片 → HL-02 Highlight Detail

**卡片方向与封面图规则：**


| 用户选定之 Highlight 封面照片    | 卡片样式    | 封面在卡上的比例                                                              |
| ----------------------- | ------- | --------------------------------------------------------------------- |
| `width < height`（竖图）    | 3:4 竖向卡 | 3:4                                                                   |
| `width ≥ height`（横图或方图） | 4:3 横向卡 | 4:3（HL-01 Gallery 横卡层；与 HL-02 横版 hero **一致为 4:3**，不在 HL 系列使用 1:1 大图槽） |


- **封面图本体**：即用户在 H-02 / H-04 标记 Highlight 时 `**Select Highlight Cover`** 所选**唯一**照片（单图 Memory 默认为该张）
- **HL-01 横卡 4:3 的设计理由**：Gallery 瀑布流需要横竖混排的视觉节奏；**HL-02** 对横图封面沿用 **4:3**，保证从列表进入详情时**比例连续**

### 权限差异

- `Never Paid`：上限 10 个，触达后 Notify 提示条常驻 + H-02 / H-04 Highlight 行 Locked 态
- `Ended`：同 `Never Paid`（超 10 个的历史 Highlight 保留展示，不可新增）；常驻 Notify 附 Renew CTA
- `Trial/Premium Active`：无限制，无计数显示

详见 `SubscriptionRules v1.3 R-04 / R-10` 与 `StateMatrix §2.7.6`

---

## HL-02 · Highlight Detail

**职责：** 展示单个 Highlight 的「**单张封面 + AI 标题**」轻量详情，支持分享与取消 Highlight

### 标题生成与编辑

- **默认来源：** AI 从对应 Memory 的**正文 + Tag** 自动提取短标题（生成时机：保存 Memory 后或异步任务，与后端约定为准）
- **用户覆写：** 点击标题行或编辑图标 → `**HL-02 / Sheet · Edit Highlight Title`**（Bottom Sheet，单行 `Input` + `Save`）；保存后 HL-01 / HL-02 均展示用户标题；**空标题不允许 Save**（Disabled）
- **字数上限：** 与 HL-01 卡片排版可容纳长度对齐（建议 **≤50 字符** 或工程按省略号反推，以设计 Token 为准）

### 页面内容

- **Hero 区**：**单张** Highlight 封面（用户选定那张）；**仅两种比例**：封面竖图 → **3:4**；封面横图或方图 → **4:3**（与 HL-01 横卡 **4:3** 对齐）。可用**相框模板**类视觉包装（Figma 以示意为准）
- **元信息**：记录日期（系统自 Memory）
- **主标题**：默认展示 AI 标题；覆写后展示用户标题（见上）
- **「View original memory」** 文字链 → **H-04** 对应 Memory（Read Only / Edit 由当月规则决定）
- **不展示**：`photoCarousel`、Memory 全文摘要、独立 Highlight 长描述、Tag chip 列表、旧版「无 note」引导块
- **底部**：**Share Highlight**（主按钮）+ **Remove Highlight**（destructive 文字链）

**局部变体（Figma `02 Main UI · HL-02 / Highlight Variants`）：**

- `**HL-02 · Portrait`** / `**HL-02 · Landscape**` — 仅用于设计验收 3:4 / 4:3 两档 hero 布局；**不为**旧「With Note / Without Note」语义保留 frame

**Remove Highlight 操作：**

- 所有用户可用（Free / Premium / 降级）
- 点击 → Bottom Sheet 二次确认
- 文案："Remove this Highlight? The memory itself won't be deleted."
- 按钮："Remove"（红色）/ "Cancel"
- 确认后：取消 Highlight 标记，Memory 保留，HL-01 卡片移除，count -1

### 交互细节

- 分享：卡片渲染为图片 → 系统 Share Sheet
- 顶部返回按钮 → 返回 HL-01

### 权限差异

- 无差异（Free / Premium 展示样式一致，标题编辑对所有用户开放）

---

## ST-01 · Settings

**职责：** 账户、孩子档案、订阅、通知、数据与隐私、反馈、关于的入口汇总页

### 账户

- 显示用户名称 + 邮箱（不显示头像）
- 点击 → ST-07 Account
- 说明：产品重心在孩子，不在父母个人信息，头像不予展示

### 孩子档案

- 孩子档案管理入口：
  - 仅 1 个档案：点击直接进入 ST-03 编辑
  - 多个档案：点击进入 ST-03a Child Profile List

### 订阅

- 当前计划展示 → 点击进入 ST-02 Subscription Management
- 订阅入口行（subscriptionEntry）3 态，以 Figma `02 Main UI · ST-01 / subscriptionEntry · States` (`403:880`) 为准：
  - `Never Paid`（Upgrade）：主文 `"Free Plan"` + 副文 `"{N} Stories remaining"` + 右侧 `"Upgrade"` 标记（accent amber）；点击进 ST-02 Free 视图
  - `Trial/Premium Active`（Premium）：主文 `"Premium"` + 副文 `"Renews {date}"` + 右侧 `StatusBadge Type=Active`（绿）；点击进 ST-02 Premium 视图
  - `Ended`（Renew）：主文 `"Premium"` + 副文 `"Expired {date}"` + 右侧 `"Renew"` 标记；点击进 ST-02 Premium 视图；ST-02 内的 `"Renew"` CTA → P-01 **Paywall C**（Stories 挽回主题）

### 通知

- Story 生成通知 Toggle
- 上传提醒 Toggle（开启后默认每 3 天提醒一次，频率不可调整，MVP 阶段不开放频率选择）
- 上述两类远程推送的 **发送条件、频控、落地页与「三日静默」判定** 以 **第三章「Story 生成规则」** 中的 **「Story 生成完成通知」**、**「上传提醒与三日静默召回推送（MVP）」** 为权威条文（本节不重复展开）。

### Stories · 地理位置（新增）

- **入口**：`ST-01 Settings` 内新增一行 **Toggle**（默认 **Off**），主文案与副文案以 **Figma `02 Main UI · ST-01 Settings`** 为准；语义为「**允许在生成 Stories 时使用设备地理位置以增强内容**」。
- **与系统权限的关系**：Toggle 为 **产品层开关**；真正采集仍受 **iOS 定位授权**约束。二者需一致展示：**系统未授权时不得长期显示为 On**（见下「首次保存」联动）。
- **用户首次将 Memory 从 0 条存到 1 条（首条 Save）**：
  - **触发条件**：当前账户已成功持久化的 Memory **计数由 0 → 1** 的那一次 **Save**（无论从 **H-02 / H-04** 等哪一入口发起）；**编辑已有 Memory 再 Save 不计入**。
  - **时机**：该次 Save **成功后**，立即触发 **系统定位权限请求**（**iOS 系统弹窗**；非营销类自建全屏弹窗。若需一句前置说明，可用极轻 inline / 系统前序 Sheet，由工程与 HIG 取舍，**以 Figma 若已画为准**）。
  - **若用户在系统弹窗拒绝**：产品层 **「Stories 地理位置」保持 Off**；用户稍后打开 **ST-01**，该 Toggle **仍为 Off**，并可在说明文案中提示「可在系统设置中开启」。
  - **若用户同意**：产品层 **将该 Toggle 置为 On**（与「已授权为 Stories 使用位置」一致）。
- **用户之后在 ST-01 手动操作 Toggle**：
  - **Off → On** 且系统尚未授权 / 曾被拒：应引导至 **系统设置** 中开启 Nestory 的位置权限（或按 iOS 版本触发 `requestWhenInUse` 可再次出现的条件处理），**不得**在无权限时假亮 On。
  - **On → Off**：关闭产品层使用位置的意愿；后续 Stories 不再使用定位增强（直至再次打开且系统仍授权）。
- **Justin（持久化）：** 与上文 **「Story 生成规则」** 中 **Justin / `location`** 条款一致——**仅在产品开关 On 且系统已授权** 时，客户端写入非空的 **`location`**，并按 **`dev/04-DataModel.md`** 落盘及参与后续生成负载。**否则** `location` 保持空值，不得误存历史坐标。

### 数据与隐私

- 点击进入 ST-04 Data & Privacy

### 反馈

- 点击进入 ST-06 Feedback

### 关于

- 点击进入 ST-05 About

### 权限差异

- Free：添加孩子功能在 ST-03a 中可点击，但新增档案不可激活
- Premium：无限制

---

## ST-02 · Subscription Management

**职责：** 展示当前订阅状态，提供升级或管理入口

### 核心展示：Free vs Premium 对比表（三列）


| 权益                                              | Free     | Premium   |
| ----------------------------------------------- | -------- | --------- |
| AI Stories                                      | 2 total  | Unlimited |
| Watermark-Free Sharing                          | ✘        | ✔         |
| Highlights — save & share your favorite moments | Up to 10 | Unlimited |
| Child Profiles                                  | 1 active | Unlimited |
| Extra Features (e.g., Birthday Celebrations)    | ✘        | ✔         |


- 当前用户所在 Plan 的列高亮显示

### Free 用户界面

- 当前计划："Free Plan"
- 对比表中 Free 列高亮
- 主 CTA："Upgrade to Premium" → P-01

### Premium 用户界面

- 当前计划："Premium Plan"
- 对比表中 Premium 列高亮
- 订阅类型：Monthly / Yearly + 下次续费日期 + 价格说明
- "Manage Subscription"：跳转 App Store / Google Play 订阅管理页
- "Cancel Subscription" → 触发两步取消流程（见下）

### 取消订阅流程（两步）

**步骤 1 — 挽留弹窗：**

- 标题："Your little one's story isn't finished yet"
- 说明取消后失去的权益（损失厌恶）
- 主按钮："Keep My Plan"
- 次级文字链："Continue to Cancel"

→ 点击 "Keep My Plan" → 返回 ST-02，挽留成功，无数据收集

→ 点击 "Continue to Cancel" → 进入步骤 2

**步骤 2 — 离开原因收集弹窗：**

- 标题："We'd love to know why you're leaving"
- 单选项（选填）：Too expensive / Not using it enough / Missing a feature I need / Switching to another app / Other
- 选择 "Other" 后展开文字输入框（选填，上限 200 字符）
- 主按钮："Confirm Cancel" → 上报原因数据 → 跳转平台原生取消流程
- 次级文字链："Back" → 返回 ST-02（再次挽留成功）

### 交互细节

- 取消订阅通过平台原生流程处理，App 内不自建取消流程
- 取消后当前订阅周期内仍保持 Premium 权益，到期后降级为 Free

### 权限差异

- Free / Premium 显示内容完全不同（如上）

---

## ST-03a · Child Profile List

**职责：** 展示所有已创建的孩子档案，提供编辑入口和添加入口

### 页面顶部

- 返回按钮（← 返回 ST-01）
- 页面标题："Child Profiles"

### 进入条件

- 用户已创建 2 个及以上孩子档案时，从 ST-01 进入本页
- 仅 1 个档案时：ST-01 直接进入 ST-03（跳过本页）

### 档案列表

- 每个档案一行：头像 + 名字 + 出生日期
- 当前活跃档案标注 "Active" 标签
- 所有档案均可点击 → 进入 ST-03 编辑
- 编辑任意档案对 Free / Premium / 降级用户均无限制

### 顶部提示条（Figma `02 Main UI · ST-03a Child Profile List` base body 内置 Notify `172:958`）

> Figma 现状：base body 第一个 child 是一个 `Notify Type=Warning` INSTANCE（带 CTA），文案固定。Never Paid 和 Ended 共用同一条 Notify（base 里只画了一版），区别只在 CTA 点击后的 Paywall 变体映射，视觉无差别。


| 订阅状态                   | Notify Type                 | 文案（以 Figma 为准）                                                                               | CTA button                            | CTA →                 |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------- |
| `Never Paid`           | `Warning`                   | `"Free plan supports one active profile. You can add more, but switching requires Premium."` | `"Upgrade to keep the story going →"` | **Paywall D**（档案扩展主题） |
| `Ended`                | `Warning`                   | 同上（复用 Figma base body 内置 Notify，文案不变）                                                        | 同上                                    | **Paywall D**         |
| `Trial/Premium Active` | 不显示（运行时隐藏此 Notify INSTANCE） | —                                                                                            | —                                     | —                     |


**Paywall 路由**：Never Paid 和 Ended 统一 → Paywall D（按 `StateMatrix §2.7.7` 模型 X，ST-03a 的上下文 = 多档案扩展主题）

### 添加孩子

- 列表底部 "Add Child" 按钮
- **所有订阅状态均可点击**（按钮始终为可点击态，不做禁用处理）
- 点击 → 进入 ST-03（空表单，创建模式）
- `**Never Paid`：** 可完成档案创建，但新增的档案在 H-01 中无法激活切换（切换需 Premium）。页面顶部提示条已说明此限制，用户知情
- `**Ended`：** 可完成档案创建，**且新增档案可在 H-01 Ended Profile Switcher 中点击切换**（兑现"数据不伤害"），但会引导 Renew

### 删除孩子档案（排除）

- **MVP 阶段不提供 in-app 删除孩子档案入口**（即使 2+ 档案时也不显示"Delete"按钮）
- 业务原因：父母极少需要删除孩子档案（唯一现实场景极少且情感敏感），在 UI 中提供入口反而可能造成误触风险
- 兜底通道：父母如确需删除，走 ST-06 Feedback 或 support 邮箱人工处理
- **不再考虑实现此功能，避免引入级联删除（Memory / Story / Highlight / 云端同步）的复杂逻辑**

详见 `StateMatrix §2.5` ST-03 行的"不提供"说明

### 权限差异

- `Never Paid`：编辑无限制；`+ Add Child` 按钮可点击（所有订阅状态均不做 disabled），新增档案在 H-01 不可激活；顶部 Warning Notify + `Upgrade to keep the story going →` CTA → Paywall D
- `Ended`：编辑无限制；`+ Add Child` 按钮可点击，新增档案可切换激活；顶部 Warning Notify（复用同一 Figma INSTANCE）+ CTA → Paywall D
- `Trial/Premium Active`：无限制；顶部 Notify 运行时隐藏

---

## ST-03 · Child Profile Edit

**职责：** 编辑单个孩子档案信息

### 页面内容

- 复用 O-03 表单字段（头像、名字、生日、性别、身高、体重）
- 去掉进度条和底部 Skip / Add Another Child
- 底部操作区：主按钮 "Save Changes" + 次级文字链 "Cancel"

### 交互细节

- 从 ST-01 进入，保存或取消后返回 ST-01
- 不支持删除孩子档案（MVP 阶段不做，避免级联删除 Memory / Story 的复杂逻辑）
- 编辑保存后不改变 H-01 的活跃档案。活跃档案切换仅通过 H-01 首页入口操作（Premium 用户）。

---

## ST-04 · Data & Privacy

**职责：** 向用户说明 AI 如何使用其数据

### 页面内容

- AI 数据使用说明（详细描述 Nestory 如何使用用户上传的照片和文字来生成 Story）
- 无操作入口，纯信息展示页

---

## ST-05 · About

**职责：** 展示版本信息和法律链接

### 页面内容

- 版本号（仅展示）
- 服务条款 → 跳转链接
- 隐私政策 → 跳转链接

---

## ST-06 · Feedback

**职责：** 提供用户反馈入口

### 页面内容（以 Figma `02 Main UI · ST-06 Feedback` 为准）

- NavBar：返回箭头 + Page Title `"Feedback"`
- 页面大标题 + 说明副标（表达"我们在听"的情感语气）
- **单个文字输入框**（multi-line textarea，上限 500 字符）
  - Placeholder：`"Tell us what you think, or let us know if something isn't working right."`
  - **不拆分 Subject / Body 两个字段**（Figma 只画了一个输入框，设计意图是简化反馈门槛）
- 底部主按钮 `"Submit"` → 提交成功后 `Toast · Feedback Sent`（`"Thanks for your feedback!"`）→ 返回 ST-01

### 交互细节

- 输入为空时 `"Submit"` 按钮保持 Disabled 灰态（对齐 §4.5 A 规则）
- 提交成功后表单清空，页面自动返回 ST-01

---

## ST-07 · Account

**职责：** 展示用户已关联的登录方式，提供 Logout 和 Delete Account 操作入口

### 页面内容

- 页面标题："Account"
- 已关联登录方式区块：
  - 显示关联账号列表（Apple / Google，根据实际关联情况展示）
  - 每行显示：平台 icon + 账号标识（邮箱或 Apple ID）
  - 仅展示，不支持在 App 内新增或解除关联
- "Log Out" 按钮 → Bottom Sheet 二次确认
  - 文案："Log out of Nestory? You can always sign back in with the same account."
  - 按钮："Log Out" / "Cancel"
  - 确认后退出登录，返回 O-01 Welcome
- "Delete Account" 文字链（红色，Destructive 样式）→ Bottom Sheet 二次确认
  - 文案："Delete your account? All your data including Stories and Memories will be permanently removed. This can't be undone."
  - 按钮："Delete Account"（红色）/ "Cancel"
  - 确认后：调用平台账户注销流程 + 清除本地数据，返回 O-01

### 交互细节

- Log Out 和 Delete Account 均需 Bottom Sheet 二次确认，避免误操作
- Delete Account 为不可逆操作，确认按钮为红色，文案明确强调不可撤销

### 权限差异

- 无差异（所有用户一致）

---

## P-01 · Contextual Paywall

**职责：** 在用户情感峰值或触碰限制时触发付费引导，根据**触发点的功能主题**（Stories / Highlights / 多档案）映射到对应的 Paywall 变体。

### 呈现形式

- Modal 弹窗，非全屏，背景半透明遮罩，右上角可关闭
- 仅对 `Never Paid` / `Ended` 用户展示，`Trial/Premium Active` 不触发
- 实现：`01 Design System · PaywallModal` COMPONENT_SET (`49:1056`) 的 4 个 variant（A / B / C / D）

### 路由模型（模型 X · 按功能主题）

**核心原则**：一个触发点对应一个固定 Paywall 变体，看主题不看订阅状态。详细触发位置表见 `StateMatrix §2.7.7`。

### 变体 A — Stories · 情感路线（`"Your baby's first year only comes once"`）

- 利益点排序：① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features
- 主要触发点：`Never Paid` 看完第 2 份 Story 返回 S-01（情感峰值 + 损失厌恶叠加）；ST-02 Free 主 CTA `"Upgrade to Premium"`

### 变体 B — Highlights · 配额（`"Don't miss a single milestone"`）

- 利益点排序：① 无限 Highlights → ② 持续生成 Stories → ③ Watermark-Free Sharing → ④ Extra Features
- 主要触发点：H-02 / H-04 Highlight Row Locked toggle；HL-01 `topNotify · States` 全部 4 个 Scenario CTA（无论 Never Paid 还是 Ended，统一走 B）

### 变体 C — Stories · 挽回（`"Keep the story going"`）

- 利益点排序：① 持续生成 Stories → ② Watermark-Free Sharing → ③ 无限 Highlights → ④ Extra Features
- 主要触发点：S-01 `topNotify · States` 两态 CTA（Trial/Premium Ended）；ST-01 `subscriptionEntry · States · Renew` CTA；S-01 当月 Locked 卡片（Never Paid 第 3 月起 / Ended 即刻）

### 变体 D — 多档案（`"Your family is growing"`）

- 利益点排序：① 无限孩子档案 → ② 持续生成 Stories → ③ 无限 Highlights → ④ Watermark-Free Sharing
- 主要触发点：H-01 `Sheet · Profile Switcher · Free` 底部 `Upgrade to Premium` CTA；`Profile Switcher · Ended` 底部 `Renew Premium` CTA；ST-03a 顶部 Notify CTA；ST-03a `+ Add Child` 后的扩档引导

### 页面内容（所有触发点共用结构）

- 顶部：情感向标题（根据触发点动态调整）
- 利益点列表（根据触发点调整优先级排序）
- 计费周期切换：Yearly / Monthly，Yearly 默认高亮选中
- 价格展示：Yearly $100/年（省 $19.88）/ Monthly $9.99/月 + 首月免费标注
- 主 CTA："Start Free Trial"
- 次级文字链："Maybe Later"（关闭弹窗）
- 底部：服务条款 + 隐私政策链接（App Store 合规要求）

### 交互细节

- 右上角关闭按钮：任何触发点均可关闭，不强制
- 订阅成功后弹窗关闭，页面状态实时更新（水印消失 / Highlight 解锁 / Story 解锁）

### 权限差异

- 仅对 `Never Paid` / `Ended` 用户展示
- `Trial/Premium Active` 用户不触发 Paywall（任何位置）

---

# 第四章 — Error States & Edge Cases

## 4.1 空状态设计

### H-01 · Home

> **注：** Onboarding v1.6 起 1st child 的 Name + Birthday 必填，Skip 也已从 Onboarding 移除，因此 H-01 **永远**有至少 1 个已创建档案，不存在 "no profile" 空状态。详见 `StateMatrix §5 "H-01 Home · Empty"` 与 `O-03 交互细节`。

**已创建档案，但尚未上传任何 Memory：**

- 主视觉区域显示情感向插图 + 引导文案："Every little moment counts."
- 当月 Memory 区块显示："0 memories this month"（View All 入口指向空状态的 H-03）
- 当月进度区块显示下次 Story 生成时间
- Add Memory 按钮正常显示

### H-03 · Memory List

**当月无任何 Memory：**

- 当月区块显示空状态插图 + 文案："No memories yet this month. Start capturing moments!"
- Add Memory 按钮正常显示

**整个列表无任何 Memory（新用户）：**

- 全屏空状态插图 + 文案："Your memories will appear here. Start by adding your first one!"
- Add Memory 按钮

### S-01 · Stories List

**新用户，首份 Story 未生成：**

- 顶部当月状态卡片正常显示（素材收集中状态）
- 卡片下方显示空状态插图 + 文案："Your first Story is on its way. Keep capturing memories!"
- 无历史 Story 列表

### HL-01 · Highlights Gallery

**尚未标记任何 Highlight：**

- 全屏空状态插图 + 文案："Mark special moments as Highlights while adding a memory"
- 无 CTA 按钮，引导用户自然回到 Home 上传

## 4.2 网络失败 Fallback

### 通用处理原则

- 所有页面在无网络时，已加载的内容正常展示，不清空
- 需要网络的操作（上传、生成、订阅）触发时，Toast 提示："No internet connection. Please try again."
- 不自动重试，由用户主动重新触发操作

### H-02 · Add Memory

- 上传照片失败：Toast 提示 + 照片显示失败态（红色边框 + 重试图标），其他已上传照片不受影响
- Save 失败：Toast 提示，表单内容保留，用户可重试

### S-02 · Story Detail

- H5 WebView 加载失败：显示占位区域 + 文案："Couldn't load your Story. Pull down to retry." + 下拉刷新支持

### P-01 · Contextual Paywall

- 订阅请求失败：Toast 提示 "Something went wrong. Please try again."，弹窗保持打开状态

## 4.3 系统权限请求策略（MVP）

> 与 **「权限边界触发」**（`## 4.4`，Paywall / 配额类）不同：本节描述 **iOS 系统级权限**（相机 / 相册 / 通知 / 地理位置）在何时请求、拒绝后如何表现。实现细节与 Toast 文案以 **Figma `04 Overlays`** 及 **`06-Nestory_SubscriptionRules`** 为准。

| 权限 | MVP 请求时机 | 拒绝 / 关闭后 |
|------|----------------|----------------|
| **通知（Notifications）** | **Onboarding** `O-04 Notifications` 流程内，通过页面内 CTA 触发系统弹窗；**不在** H-01 / H-02 首次进入时自动弹 | 不阻断 Onboarding；按钮可变为「前往设置」类引导（见 O-04 章节）；后续 Story 推送依赖 ST-01 Toggle + 系统权限 |
| **相机（Camera）** | 用户**首次**在 **`H-02 / Sheet · Add Photo Source`** 中点击 **Take Photo** 时请求 | `Toast · Camera Denied`；用户可稍后在系统设置中开启 |
| **相册（Photo Library）** | 用户**首次**在同一 Sheet 中点击 **Choose from Album** 时请求 | `Toast · Library Denied`（文案与 UI 中 **Album** 用语一致） |
| **地理位置（Location）** | **ST-01** 提供 **Stories · 地理位置** Toggle（**默认 Off**）。**首次**将 Memory 从 **0 → 1** 条成功 **Save** 后，立即触发 **iOS 系统定位权限弹窗**（`When In Use` / 精确定义以工程为准）。**ST-01 Toggle 为产品层开关**，须与系统授权状态一致展示 | **系统弹窗拒绝** → Toggle **保持 Off**。**同意** → **ST-01 对应 Toggle 置 On**。之后用户可在 **ST-01** 手动再开/关；若系统曾拒绝而用户在 App 内切 On → 引导至 **系统设置** 开启 Nestory 位置权限（或按 iOS 规则再次请求，工程实现二选一） |

---

## 4.4 权限边界触发

### `Never Paid` / `Ended` 用户配额耗尽（Never Paid 第 3 月起 / Ended 立即）

- S-01 当月卡片显示锁定态
- 文案："You've used your 2 free Stories. Upgrade to keep recording every month."
- 点击卡片 → P-01 **Paywall C**（Stories 挽回主题，Never Paid 和 Ended 统一。`StateMatrix §2.7.7`）

### `Never Paid` / `Ended` 用户 Highlights 触达 10 个上限

- H-02 / H-04 Highlight 行呈 **Locked 态**（toggle 视觉保持 Off、行下方 caption，两版运行时切换：Never Paid / Ended）
- 点击 Locked Toggle → P-01 **Paywall B**（Highlights 主题，Never Paid 和 Ended 统一）
- HL-01 NavBar 下方常驻 Notify 提示（4 场景切换，全部 → Paywall B，详见 HL-01 章节）

### `Never Paid` 用户尝试切换孩子档案

- H-01 avatarRow chevron 点击 → Profile Switcher `Free` 变体（非活跃档案置灰不可选 + 底部 Upgrade CTA → P-01 **Paywall D**）
- ST-03a 添加孩子按钮可点击（可进入 ST-03 创建），但新增档案不可在 H-01 切换激活；顶部 Notify + CTA → P-01 **Paywall D**（档案扩展主题）

### `Ended` 用户（订阅到期后降级）

- **已生成的所有历史 Story 保持原状态且可正常访问**（付费/Trial 期间生成的无水印 Story 永久保持无水印；Free 期间生成的带水印 Story 保持带水印）。降级不锁定已生成 Story 的阅读权限
- 当月及后续月份 Story 不再生成（配额 = 0，不重置）
- 超出 10 个的 Highlights 保留展示，但无法新增标记
- 超出 1 个的孩子档案**全部保留且可切换激活**（视觉同 Free，但交互全通，兑现"数据不伤害"）
- **常驻 Notify 按位置区分类型**（取代 v1.5 的首次 Toast 方案），统一路由表：

  | 位置                                           | Notify Type           | CTA → Paywall                          |
  | -------------------------------------------- | --------------------- | -------------------------------------- |
  | `S-01 / topNotify · States`                  | `Type=Warning`        | Paywall C（Stories 挽回）                  |
  | `HL-01 / topNotify · States`（Scenario 2/3/4） | `Type=Warning`        | Paywall B（Highlights 主题）               |
  | `ST-03a base body 顶部内置 Notify`               | `Type=Warning`        | Paywall D（档案扩展）                        |
  | `H-01 Sheet · Profile Switcher · Ended` 顶部   | `Type=Info`（例外：非挽回语境） | Paywall D（档案扩展，CTA 在底部按钮，不在 Notify 条上） |

  - 文案以 Figma 各自 frame 实际为准；运行时 `{kind}` 替换逻辑见 `StateMatrix §2.7.3 / 2.7.4`
  - 重新订阅后自动消失
- `Toast · Premium Ended` 组件已废弃

## 4.5 表单与输入框通用规则

> 适用于 O-03 / ST-03 / H-02 / ST-05 等所有表单场景。前端开发时**不需要每次问 PM**，直接查这张表。

### A. 必填项验证（Disabled 按钮 pattern）

- **必填字段未满足 → 主 CTA 保持 Disabled 灰态**，用户无法点击，不需要 Toast 或弹窗提示
- **不使用 Toast 做字段验证反馈**。Toast 仅承担"系统级事件通知"（保存成功 / 触达配额 / 网络异常 / 权限拒绝），不做"字段级错误反馈"
- 极少场景需要字段级错误反馈时，走 **inline 红字 + 字段边框变红**（如输入邮箱格式错误），不做全局 Toast
- **Date Picker 特殊情况**：Date Picker 通常有默认值，无法通过"空置"来阻止 Continue → 用 **二次确认 Bottom Sheet** 承担验证（`O-03b Birthday` → `O-03b Birthday Confirm` 是范例）
- 约定的理由：Toast 是瞬时非阻塞组件（3-5 秒消失），无法精确指向问题字段，与 iOS HIG / Material Design 的表单验证最佳实践不符

### B. 键盘类型与输入属性


| 字段                | 所在页                                    | `keyboardType`         | 附加属性                                                                |
| ----------------- | -------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Child Name        | O-03a / ST-03                          | `default`              | `autocapitalizationType=words`（首字母大写）                               |
| Height 数值         | O-03c / ST-03                          | `**decimalPad`**       | 单位切换 `cm / in` UI 控件，不影响键盘类型（两种单位都需小数支持）                            |
| Weight 数值         | O-03c / ST-03                          | `**decimalPad**`       | 单位切换 `kg / lb` 同上                                                   |
| Memory 描述         | H-02                                   | `default`（multi-line）  | `autocapitalizationType=sentences`（句首大写）                            |
| Custom Tag 输入     | H-02 Tag Picker                        | `default`（single-line） | `autocorrectionType=no`（避免联想干扰匹配）；匹配规则走 `trim + lowercase` 不依赖键盘    |
| Highlight 标题（覆写）  | `HL-02 / Sheet · Edit Highlight Title` | `default`（single-line） | `autocapitalizationType=sentences`                                  |
| Feedback          | ST-06                                  | `default`（multi-line）  | `autocapitalizationType=sentences`；单输入框，以 Figma 为准不拆 Subject / Body |
| DELETE 确认框        | ST-07 Delete Account Sheet             | `default`              | `autocapitalizationType=allCharacters`（强制大写匹配字面量 `"DELETE"`）        |
| Birthday / Gender | O-03b / O-03c                          | —                      | Date Picker / Segment Control，**无键盘**，不在此表范围                        |


### C. 关键提醒

- **身高体重必须用 `decimalPad`**，不能用 `numberPad`（后者无小数点，用户输不进 175.5 cm / 12.5 kg）
- **DELETE 确认框**的 `autocapitalizationType=allCharacters` 是关键——避免用户输入小写 "delete" 匹配失败后不知道为什么不能删账号
- 所有 multi-line 字段（Memory 描述 / Feedback Body）使用 `TextEditor`（SwiftUI）或 `UITextView`（UIKit），单行用 `TextField` / `UITextField`
- 所有字段默认 `returnKeyType` 由系统决定（`done` / `return`），**不强制指定**，除非某个场景有特殊跳转逻辑需求

