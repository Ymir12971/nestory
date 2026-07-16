# Nestory_Handoff_v1.0

**用途：** 本文档与 Figma 文件 `Nestory`（页面 `Nestory-new version`）配套，供开发工具理解项目背景与业务规则。
**分工原则：** 页面明细、跳转逻辑、组件状态、界面文案，一律以 Figma 为准（每个界面正下方有同名 `-annotation` Frame 做说明）；本文档只写 Figma 未覆盖的产品背景与业务规则，两边不重复。
**交付范围：** 本次开发仅覆盖客户端 UI；后端由团队另行处理，不在本文档与本次开发范围内。
**日期：** 2026-07-11

---

## 1. 产品简介

Nestory 是一款 AI 驱动的孩子成长记录移动 App，面向 25-40 岁、孩子 0-5 岁的年轻父母，全球市场。**目标平台：iOS 与 Android。**

核心机制一句话：父母日常随手上传孩子的照片和文字（Memory），系统每个自然月底自动将当月素材整理成一份有叙事感的成长故事（Story）。

差异化：市面同类产品只做照片存储或模板排版，Nestory 生成的是像父母亲手写的成长日记，而非流水账。

**界面语言：** 产品全线 UI、文案、交互内容均为英文（本文档仅为内部说明用中文）。

---

## 2. 产品结构

App 共四大模块 + 若干全局页面，与 Figma 页面的行分布一一对应：

| 模块 | Figma Frame 前缀 | 一句话职责 |
|---|---|---|
| Onboarding | `O-` | 启动、注册登录、隐私承诺、创建孩子 Profile、选择 Plan |
| Home | `H-` | Memory 的录入、查看、编辑与时间线管理 |
| Stories | `S-` | 按月生成的 Story 列表与状态展示（生成中/已生成/暂停等） |
| Settings | `ST-` | Profile 管理、Plan 管理、通知开关、账户、反馈等 |
| 全局页面 | `global-` | Paywall、Welcome to premium（多处复用） |

Story 的阅读详情页为 H5 页面（App 内以 WebView 内嵌，分享出去是同一个链接）。**Story 的具体生成规则与 H5 呈现规范由专门的 Story 生成文档单独说明，与本项目解耦，此处不展开。**

---

## 3. Plan 权益（重点）

### 3.1 方案与价格

| | Free Plan | Premium Plan |
|---|---|---|
| 价格 | $0 | $10/月 或 $100/年（年付省 $20） |
| 订阅方式 | — | Apple / Google 平台内购，可随时取消 |

**注意：产品中没有 Free Trial（试用期）概念，任何入口都不出现试用相关逻辑与文案。**

### 3.2 权益对比

| 权益维度 | Free | Premium |
|---|---|---|
| Memory 录入（数量、照片、文字、Tag） | 无限制，与 Premium 完全一致 | 无限制 |
| 当月 Memory 编辑/删除 | 可以 | 可以 |
| 过往月份 Memory 编辑 | 不可（触发升级弹窗，见 Figma） | 可以 |
| 孩子 Profile 创建 | 不限数量（Onboarding 与 Settings 均可创建） | 不限数量 |
| 孩子 Profile 切换 | **不可切换**（Home 与 Settings 均不可，仅 1 个 Active Profile） | 自由切换 |
| Story 生成 | 共 2 份配额（见 3.3） | **每月为每个孩子的 Profile 各生成一份**（3 个孩子 = 每月 3 份） |
| Story 水印 | 生成的 Story 带 Nestory 水印 | 无水印 |
| Story 重新生成（Regenerate） | 不可 | 可（规则见 3.4） |
| 换机数据恢复（同账号重新登录） | 支持 | 支持 |
| 多设备实时同步 | 不支持 | 支持 |

### 3.3 Free 的 Story 配额细则

- Free 用户共有 **2 份** Story 配额，**按账户计**，从用户注册并进入产品的**当月**起算。（Free 仅有 1 个 Active Profile，按账户计与按 Profile 计等价。）
- Story 在每个自然月最后一天晚上生成（用户本地时区）。
- 示例：用户 7 月 13 日开始使用产品 → 第 1 份 Story 于 7 月 31 日晚生成，第 2 份于 8 月 31 日晚生成，之后配额用尽，不再生成新 Story。
- 配额用尽后的界面状态与升级引导见 Figma（S 行）。

### 3.4 Story Regenerate 规则

- Free 与 Premium 用户在 Memory 录入上的权限完全一致；差异发生在「修改过往 Memory 之后」：
  - (a) **Premium 用户**修改或补充了过往月份的 Memory 后，会收到提示，可选择将已生成的对应 Story 重新生成（新 Story 覆盖旧 Story，需二次确认，见 Figma）。
  - (b) **硬性条件：从未生成过的 Story 不可补生成。** 例如用户 2026 年 7 月下载 App，随后补录了 7 月之前的 Memory——因为那些月份从未生成过 Story，即使补充了 Memory 也不会生成。
  - (c) **断订空窗不可补发。** 用户中途停掉 Premium、之后重新订阅的，停订期间未生成的 Story 永久无法补发或生成；只有已生成的 Story 允许因 Memory 变化而更新。
- **Stories 时间轴起点规则：** Stories 页时间轴的起点 = 第一份 Story 所在月份。用户注册之前的补录月份（如 7 月注册后补录 2023 年 2 月的 Memory）只出现在 Home 时间线中，**不在 Stories 页出现任何卡片**，也永不生成 Story。

### 3.5 降级与恢复

- 订阅到期后，**已生成的 Story 永久可访问**，不锁定、不回收；水印状态在生成时锁定，永久不变（付费期生成的永久无水印，Free 期生成的永久带水印，不随身份变化追溯）。
- 到期后不再生成新 Story；重新订阅后从当月恢复生成，空窗月份折叠为 Stories Paused 卡片（具体展示逻辑见 Figma S 行）。
- 用户的所有历史数据（Memory、Story、Profile）在任何订阅状态下均不回收、不删除。

---

## 4. 补充规则（Figma 未覆盖）

- **数据存储：** 所有用户的 Memory（照片 + 文字）均上传至服务端（生成 Story 的必要条件），存储统一走云端。Free 与 Premium 均支持换机后同账号恢复数据；多设备实时同步仅 Premium。
- **联网要求：** 添加/编辑 Memory 必须在线完成，**不做离线暂存与补传**。无网络时的加载失败态见 Figma（couldn't load 页面）。
- **Memory 技术约束：** 单张照片 ≤ 10MB，格式 JPEG / PNG / HEIF。（单条 Memory 照片上限 9 张、文字上限 500 字符等交互层约束已在 Figma 中说明，此处不重复。）
- **生日校验：** 孩子生日不可选择未来日期（Date Picker 上限为当天）。
- **年龄显示规则：** Profile 的年龄展示按孩子月龄分三档，采用缩写格式——不满 1 个月显示 `Xd old`（如 `12d old`）；1–23 个月显示 `Xmo old`（如 `12mo old`）；满 2 岁显示 `Xy Ymo old`（如 `2y 4mo old`，Y = 0 时省略，仅 `Xy old`）。按孩子生日与当前日期的日历差计算。Figma 中所有示例文案已按此格式统一。
- **Tag：** Tag 为系统预设的固定集合，用户只能从中选择，**不支持自定义创建 Tag**。可选 Tag 清单以 Figma 为准。
- **推送前提：** 任何远程推送必须同时满足：用户已登录、系统通知权限已授权、Settings 中对应开关开启。具体开关与触发文案见 Figma（ST 行）。
- **删除孩子 Profile：** 产品内不提供删除 Profile 的入口，如确有需求走反馈/人工通道。
- **删除账号与订阅：** App 无法替用户取消 Apple / Google 平台订阅。Premium 用户删除账号时，弹窗须明确告知「订阅不会自动取消」并引导用户前往系统订阅设置自行取消（以 Figma `ST-07 / Sheet · Delete Account Confirm · Premium · v2` 为准，旧版弹窗已作废）。

---

## 5. 最小埋点方案（MVP）

客户端需埋以下事件，覆盖三条核心链路。事件名与属性可由开发按所选分析工具的规范微调，但链路与属性语义不变：

| 链路 | 事件 | 关键属性 |
|---|---|---|
| 激活 | `signup_success` | 登录方式（apple / google） |
| 激活 | `onboarding_complete` | 创建的 Profile 数、所选 Plan |
| 核心价值 | `memory_saved` | 照片数、字数、是否补录过往月份 |
| 核心价值 | `story_opened` | 月份、是否首次打开 |
| 核心价值 | `story_shared` | 分享渠道（系统 Share Sheet 回调可得时） |
| 商业化 | `paywall_viewed` | 触发来源（入口页面/控件） |
| 商业化 | `subscribe_success` | 周期（monthly / yearly）、触发来源 |
| 商业化 | `subscription_cancelled` | 取消原因（取消问卷选项） |
| 商业化 | `story_regenerated` | 月份 |

北极星指标（Story 生成后次周仍活跃上传的用户比例）由 `memory_saved` 与服务端 Story 生成记录推导，客户端无需单独埋点。

---

## 6. 术语表

以下词汇为产品专有术语，全项目（代码、文档、UI 文案）统一使用，首字母大写，**复数形式同样首字母大写**：

| 术语 | 含义 |
|---|---|
| Memory / Memories | 用户上传的单条记录（照片 + 文字 + Tag + 日期） |
| Story / Stories | AI 按自然月生成的叙事型成长故事，详情页为 H5 |
| Profile | 孩子档案（头像、姓名、生日、性别、身高体重等） |
| Free Plan | 免费方案 |
| Premium（Plan） | 付费方案（$10/月 或 $100/年） |
| Paywall | 升级引导弹窗（全局复用，见 Figma `global-Paywall`） |
| annotation | Figma 中每个界面下方的说明 Frame（命名规则：`界面名-annotation`） |

**— 文档结束 —**
