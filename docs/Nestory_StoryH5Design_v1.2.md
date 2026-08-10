# Nestory Story H5 设计文档

> [!WARNING]
> **Tag 体系已于 2026-08-09 整体废弃。**
>
> 本文中所有关于 Tag / Tag Picker / `user_tag_library` / `tag_values` / `raw_assets.tags`
> 的内容均已作废 —— 代码、接口、数据库、storyGen prompt 输入全部删除
> （迁移 `20260809220000_remove_tags`）。现状以 [figma-calibration-2026-08-05.md](new-version-2026-07-14/figma-calibration-2026-08-05.md) 的「Tag 体系整体下线」一节为准。
> 
> **不含 DS 的 `Tag` 原子**（Selected/Unselected/Disabled 三态 chip，`shared/components/Tag.tsx`）——
> 那是设计系统组件，仍在使用（性别、称呼等选择），与本条无关。


**文档版本：** v1.2
**更新日期：** 2026-06-26
**编写者：** Vicol
**前置依赖：** `01-Nestory_ProductOverview_v1_7.md`、`02-Nestory_PageStructure_v1_6.md`、`06-Nestory_SubscriptionRules_v1_3.md`

---

**重要说明：** 本文档使用中文撰写，但 Nestory 产品全线用户界面、文案、交互内容均使用英文。文中所有 Story 内文案示例均为英文，仅讨论框架时用中文。

**场景边界：** 本文档定义的是 **App 内 WebView 场景**的 Story H5（用户在 App 内打开自己的 Story）。**外部浏览器分享场景**（被分享者用浏览器打开）的水印、App Store / Google Play 下载入口等，规则保留但**延后实现**，不在当前设计范围，见 §9。

---

# 1. 文档定位与范围

定义 Nestory **Story H5 详情页（S-02）**的完整设计规范，是 H5 渲染层的唯一权威文档。涵盖：AI 内容生成逻辑、章节叙事骨架、图文排版系统、H5 阅读交互、性能加载策略、边界案例。

**前置文档提供：** Story 产品定位/配额/水印规则（ProductOverview）、S-02 入口与生成触发逻辑（PageStructure）、订阅权限差异（SubscriptionRules）。本文档不重复以上内容，仅在必要处引用。

**不在范围内：** Stories 列表页（S-01）、Story Card 状态、Highlight 卡片、推送通知文案、后端 DataModel 与 API（由 Justin 维护）。

---

# 2. 设计原则

| 原则 | 含义 |
|------|------|
| **AI 是作家，不是排版工** | LLM 决定讲什么、怎么讲；骨架与版式只约束输出格式 |
| **改写，不创作** | 所有叙事基于真实 Memory，禁止虚构未发生事件 |
| **真实优先于煽情** | 用具体细节，不用抽象抒情；忠于素材真实情绪 |
| **被动消费即仪式感** | Story 是作品，不是信息流；阅读节奏由产品控制 |
| **品质一次到位** | 不开放编辑/重生成，首次生成必须可发布，靠人工审核兜底 |

---

# 3. 内容生成逻辑（Layer 1）

## 3.1 数据流概览

```
Memory 池（当月，绑定具体孩子档案）
    ↓
[Step 1] 预处理：完整性校验 + 图片质量分级
    ↓
[Step 2] LLM 分步推理（A → F）
    ↓
[Step 3] 图片筛选 + 排版分块（见 §3.6）
    ↓
[Step 4] 质量校验 → 失败重试 ≤ 2 次 → 人工审核队列
    ↓
Story JSON 输出 → 触发推送通知
```

## 3.2 输入数据规范

每条 Memory 喂给 LLM 的数据结构（示意）：

```json
{
  "memory_id": "mem_xxx",
  "date": "2026-05-15",
  "text": "Mia tried strawberries for the first time...",
  "tags": ["Mealtime", "Funny Moment", "first food"],
  "photos": [
    { "url": "...", "aspect_ratio": "4:3", "quality_tier": "gold" }
  ],
  "is_highlight": true,
  "location": "Brooklyn, NY"
}
```

| 字段 | 来源 | 用途 |
|------|------|------|
| `text` | 用户原文 | LLM 改写的基础素材 |
| `tags` | 预设 Tag + 自定义 Tag（value 快照） | 语义索引，辅助 LLM 主题判断 |
| `is_highlight` | 用户手动标记 | Step C 主题归类的优先信号 |
| `location` | ST-01 开关 + iOS 定位授权双开时才传入 | 见 §3.4 |
| `quality_tier` | 系统预处理评估 | 决定图片是否参与展示，见下 |

**图片质量分级（全部为可工程化的客观指标，由系统自动判定，无需 LLM 介入）：**

| 等级 | 判定标准 | 用途 |
|------|---------|------|
| **Gold** | ① 短边 ≥ 800px ② Laplacian variance ≥ 阈值（默认 100，越高越清晰，用于模糊检测）③ 直方图曝光正常（非纯黑/纯白/严重过曝欠曝） | 优先展示 |
| **Standard** | 满足必填（有图）但未达 Gold 全部条件 | 正常展示 |
| **Degraded** | 模糊或严重曝光异常 | 不展示，仅计入数据统计 |

> 实现提示：Laplacian variance 为 OpenCV 标准模糊检测算法（对图像做拉普拉斯算子后取方差），阈值上线后可按实测样本微调。

## 3.3 LLM 工作流（Step A-F）

采用 Chain-of-Thought 分步推理，A-D 为内部思考（不输出给用户），E-F 为用户可见输出。

| Step | 名称 | 任务 |
|------|------|------|
| **A** | Theme Discovery | 通读所有 Memory 文字，提取本月主题候选清单（5-10 个） |
| **B** | Theme Selection | 从候选中选 2-5 个真正贯穿本月的主题。**选定的主题数 = Body 章节数**（依据：Memory 数量、Highlight 标记、内容深度；并受 §4.2 主题数上限约束） |
| **C** | Memory Allocation & Clustering | 两层：**C1** 每条 Memory 归入一个主题（章节）；**C2** 章节内对相似 Memory 聚类，合并或去重为「叙事单元」。详见下方说明 |
| **D** | Narrative Ordering | 决定章节顺序（叙事节奏：轻到重 / 外到内 / 制造起伏） |
| **E** | Chapter Writing | 为每个 Body 章节写：① 一句章节叙事主线（内部用，串联本章所有叙事单元）② 标题 ③ 每个叙事单元一段文字（服务于主线，见 §3.6 Block 机制） |
| **F** | Opening & Closing | 依据所有 Body 章节内容，写 Opening；Closing 主标题为产品向固定文案（见 §4.3） |

### Step C 聚类机制（C2）

同一章节内，若多条 Memory 讲述同一件事或高度相似，按以下规则处理，**判断标准是「合并后是否产生新的叙事价值」**：

- **互补递进 → 合并（merge）**：多条 Memory 各有独立信息或进展（如"走了三步"与"走了四步"是进展，非重复）→ 合并为**一个叙事单元**，两条都保留。文字从所有被合并 Memory 整体融合改写（非拼接）；图片从这些 Memory 的图片池统一筛选、统一排版，不再区分来源。
- **近乎重复 → 去重（dedupe）**：多条 Memory 讲述几乎同一瞬间、无新信息 → 仅保留质量最优的一条（文字更具体 / 图片质量更高），其余**连图带文丢弃**，不进入 Story。

**一个叙事单元 = 一个 Block**（见 §3.6.2）。一个叙事单元可由 1 条或多条 Memory 构成。

**关键约束（写入 LLM System Prompt）：**

- 第二人称视角（"You and Mia this month..."）
- **章节是一个连续故事，不是几条独立说明文字**：同章各叙事单元须呼应章节叙事主线，段间用承接/时间推进/情绪延续制造连贯（如 "By mid-month..."、"And then..."）
- 忠于素材真实情绪，悲伤/焦虑/害怕可被叙述，但用温和坚韧视角
- **禁止用 "happy / joyful / beautiful" 强行包装明显负面事件**（硬规则）
- 不编造未发生的事
- 长度限制：Body 章节标题 ≤ 8 words；每个叙事单元段 30-50 words；Opening 1-2 段、每段 30-60 words
- **文风：show, don't tell。** 用具体动作、表情、场景让情绪自然浮现，不直接评价情绪。避免泛化套话（"growing up so fast"）与元叙述式抒情（"precious memories"、"a moment to treasure"）——这类句子信息量为零、适用于任何孩子。warm, specific, present-tense

**改写示例：**

| 输入 Memory | LLM 改写后 |
|--------------|-----------|
| 单条："Mia tried strawberries today. She made the funniest face!" | "This month, Mia met her first strawberry. The face she made — somewhere between confusion and wonder — is one you'll never forget." |
| 合并两条（互补递进）："Took three wobbly steps." + "Walked four steps unassisted today." | "It started with three wobbly steps across the living room. By mid-month, four — unassisted, like she'd been doing it all along." |

## 3.4 Tag / Highlight / Location 的角色

均为辅助信号，不主导聚类：

- **Tag**（预设 + 自定义统一作为字符串数组）：LLM 理解 Memory 的语义 hint，不区分来源；不熟悉的冷门 Tag 可忽略
- **Highlight**：Step C 主题归类与去重时的优先信号（去重时倾向保留 Highlight 条）
- **Location**：仅当 ST-01「Stories · 地理位置」开关 ON **且** iOS 定位已授权时非空。可在 Opening/Body 叙事中作环境锚点（如 "On a sunny Saturday in Brooklyn..."）；不在 Cover 大字显示、不强行每章提及；字段为空时按"无位置信息"模式生成

## 3.5 质量校验

| 校验项 | 失败处理 |
|--------|---------|
| Story JSON 结构完整 | 重试 ≤ 2 次 |
| 章节数 = 主题数（2-5）+ Cover/Opening/Closing | 重试 |
| 每个 Body 章节有标题 + 叙事文字 + 至少一个 Block | 重试 |
| 字段长度未超限 | 强制截断 + 重试 |
| 孩子名字/性别与档案匹配 | 强制替换 |
| 无敏感词强行 happy 化 | 重试 |
| 无悬空章节（每章都关联 Memory） | 重试 |

失败流程：自动重试（间隔 30s，最多 2 次）→ 仍失败则进入「人工审核队列」，运营手动调整 Prompt 重新生成或跳过本月。

## 3.6 图片收集与排版规则

### 3.6.1 图片筛选（三条规则）

主题、Memory 归类与聚类由 Step A-C 确定后，进入筛选；未选中主题及被去重丢弃的 Memory，其图片全部丢弃。**筛选以「叙事单元」为单位**（一个单元可含多条 Memory 的图片）。

1. **每个入选叙事单元至少出 1 张图**（保证每个被讲到的单元都有视觉存在感；该规则决定章节图片下限 = 本章叙事单元数）
2. **每个叙事单元出图数 = 其名下所有 Memory 的图片总数，单元封顶 3 张**：≤ 3 张全出；4+ 张取 Laplacian variance 最高的 3 张
3. **章节图片总量上限 20 张**，超出时逐轮削减：
   - 第 1 轮：每个叙事单元只保留质量最高的 1 张，删除多余
   - 若仍 > 20：按 quality_tier 排序，从最差的单元起整体剔除其图，直到 ≤ 20（始终优先保证"每个单元有图"的底线）

### 3.6.2 章节内图文交替（Block 机制）

Body 章节不做整章排版，而是由若干 **Block（自包含图文单元）**垂直堆叠组成。**一个叙事单元 = 一个 Block**（可由 1 条或多条 Memory 合并而成），文字与图片在生成时即配对绑定，从源头消除"文字写完图片堆底部"的问题。

章节结构：

```
Chapter Title（LLM，≤ 8 words）
─────────────────
[Block]  ← 叙事单元 1：该段文字 + 单元图片
[Block]  ← 叙事单元 2：该段文字 + 单元图片
[Block]  ← 叙事单元 3：该段文字 + 单元图片
─────────────────  ↓ 整章可垂直滚动
```

**Block 子版式库**（按 Block 内图片数量自动选择，文字始终伴随图组）：

| Block 版式 | 触发（Block 内图片数） | 布局 |
|---|---|---|
| **Block-Text** | 0 张（图全被质量过滤） | 仅文字段 |
| **Block-Single-H** | 1 张横图（4:3） | 图上 + 文字在下（唯一版式，不做文字叠图） |
| **Block-Single-V** | 1 张竖图（3:4） | 两个版本：**v1**（短文，图文顶对齐）/ **v2**（长文，文字绕图 / 续排图下），按文字长度自动选择 |
| **Block-Duo** | 2 张 | 双图，保留各自朝向，见 §3.6.3 |
| **Block-Grid** | 3 张 | 主图（Hero）+ Duo 槽位，见 §3.6.3 |

**节奏交替靠版式轮换，不靠 LLM 决定**：前端渲染时，相邻 Block 自动避免连续同款布局，制造视觉起伏。

### 3.6.3 图片比例与裁切

用户原图比例不影响展示——进 Story 时由服务端统一裁切（居中 `object-fit: cover`），存为独立文件，前端直接引用。**单图比例固定，Duo / Grid 保留各自朝向、不再强制 1:1。** 全程确定，无随机。

**单图（Single）：** 横图 = **4:3**；竖图 = **3:4**。

**Block-Duo（双图，保留各自朝向）：**
- 每张图可为 `1:1 / 4:3 / 3:4`，共 9 种组合（3×3）。
- **硬约束：两张都是 4:3 时必须上下堆叠，不可左右并排。**
- 其余组合左右并排、等高对齐（宽度按比例分配）。

**Block-Grid（三图）：** 结构固定为「一张主图（Hero）+ 一个 Duo 槽位（另两张图，沿用 Duo 的 9 种组合之一）」。
- **硬约束：主图只能是 4:3 或 1:1，不可为 3:4。**
- 主图行与 Duo 行可上下互换（主图在上 / 在下），共 4 种排布。
- **硬约束：任何一行都不能出现三张 3:4 并排。**

> 术语约定：比例一律写 **宽:高（width:height）**。横图 = 宽 > 高 = 4:3；竖图 = 高 > 宽 = 3:4。16:9 不在 Story H5 内使用（仅限 S-01 Story Card 封面）。

---

# 4. 叙事骨架（Layer 2）

## 4.1 章节类型

| 章节 | 是否固定 | 功能 | 滚动 |
|------|---------|------|------|
| **Cover** | ✅ 固定 | 视觉入口：月份 + 孩子名 + 一句话主题 | ❌ 强制一屏 |
| **Opening** | ✅ 固定 | 情绪定调，引入本月氛围 | ❌ 强制一屏 |
| **Body** | 🔄 动态 2-5 章 | 围绕一个主题展开（= 一个 Step B 主题） | ✅ 垂直滚动 |
| **Closing** | ✅ 固定 | 产品向收尾 + 数据 + 分享 / 返回 | ❌ 强制一屏 |

固定章节强制一屏：保证 100% 用户看到完整开场与收尾，滚动会破坏情绪节奏。

## 4.2 动态章节数规则

**Body 章节数 = Step B 选定的主题数**，不按 Memory 数量倒推。Memory 数量仅作为**主题数上限的软约束**，防止素材太少时硬凑章节：

| Memory 数量 | 主题数上限（Step B 参考） | 总章节数 |
|------------|----------------------|---------|
| < 5 条 | **不生成 Story** | - |
| 5-10 条 | ≤ 2 | ≤ 5 |
| 11-25 条 | ≤ 3 | ≤ 6 |
| 26-50 条 | ≤ 4 | ≤ 7 |
| > 50 条 | ≤ 5 | ≤ 8 |

实际章节数由 LLM 按真实主题数决定（不超上限）。即使有 50 条 Memory 但只讲一个主题，也只生成 1 个 Body 章节。章节数封顶 8，保证移动端 1 分钟内可读完。未进入 Story 的 Memory，用户可在 Memory List 页查看全部。

## 4.3 章节数据结构

```json
// Cover
{ "type": "cover", "month": "MAY 2026", "child_name": "Mia", "subtitle": "..." }  // subtitle ≤ 12 words

// Opening
{ "type": "opening", "paragraphs": ["...", "..."] }  // 1-2 段，每段 30-60 words

// Body
{
  "type": "body",
  "chapter_title": "...",          // ≤ 8 words
  "blocks": [
    {
      "memory_ids": ["mem_xxx", "mem_yyy"],  // 1 个或多个（合并后的叙事单元）
      "text": "...",                          // 该单元的融合叙事段，30-50 words
      "photos": ["url1", "url2"],             // 已筛选、已裁切，≤ 3，来源不分组
      "block_layout": "Block-Duo"             // 见 §3.6.2
    }
  ]
}

// Closing
{
  "type": "closing",
  "headline": "Nestory keeps your little one's everyday moments as they grow.",  // 产品向固定文案，非 LLM 生成
  "stats": { "memories": 14, "photos": 38 }
}
```

> Closing 主标题为**产品向固定文案**（一句话写完、不用破折号），不再是 LLM 生成的故事收尾句。

---

# 5. 版式系统（Layer 3）

## 5.1 模板库

| 类别 | 版式 ID | 说明 |
|------|--------|------|
| Cover | Cover-A, Cover-B | 两套 |
| Opening | Opening | 单套（无 A/B） |
| Body Block | Block-Text, Block-Single-H, Block-Single-V（v1/v2）, Block-Duo, Block-Grid | Single-V 含两个版本 |
| Closing | Closing | 单套（无 A/B） |

> **UI 来源**：高保真模板已由 Claude Design 产出（`Story H5 Templates`），后续生产 Story 时往模板嵌套图文即可。本节描述结构约束，视觉细节以 Claude Design 模板与 DS 为准。

**基准尺寸：** 画面 **393 × 852 px**。每个 Body Block 与手机同宽（393px），内部两侧 **20px** padding（DS `--space-xl`）。页面顶部预留 iOS 状态栏（时间 / 信号 / Wi-Fi / 电量）位置。

**Cover（2 套）**

| 版式 | 适用 | 视觉 |
|------|------|------|
| **Cover-A**（满版主图） | 有 Gold 级竖图 | 整屏铺图 + 文字底部左对齐；文字下方**单色品牌绿渐变**遮罩（占位主图用灰块） |
| **Cover-B**（极简留白） | 无合适封面图 | **柔和多彩虚化渐变背景**（珊瑚红 / 琥珀黄 / 天蓝 / 品牌绿）+ 展示级大字月份 |

> Cover-B 渐变为产品特例，突破「DS 仅允许 brand / premium 两种渐变」基础规范，按需求放开。
> 共同元素：月份大字（"MAY 2026"）、孩子名、LLM 一句话主题。

**Opening（单套）**：中央竖向布局，文字**全部左对齐**；不放真实照片。页面内不单独放「开始阅读」提示，该提示并入底部「下一页」按钮 label（见 §6.1）。

**Body Block**：见 §3.6.2 / §3.6.3。Block 是章节内的图文单元，章节由多个 Block 垂直堆叠组成。

**Closing（单套）**

- 品牌：**「Logo + Nestory 文字」锁版置于标题正上方**。
- 主标题：产品向固定文案（见 §4.3）。
- 数据：本月「X memories / X photos」。
- **Share 主按钮**（大号，位于数据下方）：文案强调"分享给爱孩子的人见证成长"。
- **Secondary 按钮「Back to Home」**：返回主页。
- App 内场景**不含**「Created with Nestory」水印、不含 App Store / Google Play 下载入口（见 §9）。

## 5.2 版式匹配算法

```pseudo
Cover:   有 Gold 级清晰竖图 → Cover-A，否则 → Cover-B
Opening: Opening
Closing: Closing（单一版式）

Body Block（每个叙事单元一个 Block，按 Block 内图片数）:
  0 张      → Block-Text
  1 张横图  → Block-Single-H
  1 张竖图  → Block-Single-V（文字短 → v1；文字长 → v2）
  2 张      → Block-Duo（按 9 种朝向组合排布；双 4:3 强制上下堆叠）
  3 张      → Block-Grid（主图 + Duo 槽位；主图非 3:4；无三张 3:4 并排）
```

---

# 6. 交互与导航

## 6.1 翻页机制

**按钮 + 屏幕分区点击双重支持：** 点左下角按钮 ← 或屏幕左 1/3 区 = 上一章；点右下角按钮 → 或屏幕右 1/3 区 = 下一章；中间 1/3 不响应（避免误触）。

- 翻页 / 导航统一用 **DS Button 组件**，按钮内只放一个箭头。
- **Opening 的「下一页」按钮为「文字 + 箭头」，label = `Start Reading`。**
- 底部翻页按钮距屏幕底边 **34px 安全距离**（DS `--space-safe-bottom`）。
- 按钮半透明毛玻璃背景，滚动时隐藏、停止后淡入。

**禁止：** 水平滑动手势翻页（与垂直滚动冲突）；Body 滚到底不自动翻页（保持用户控制权）。

## 6.2 章节内滚动

**仅 Body 章节允许垂直滚动**，其余章节强制一屏。Body 溢出时底部轻微渐隐提示（**不放向下箭头**），滚到底渐隐消失。

## 6.3 顶部导航

顶部为 **DS ProgressBar（细进度条）**+ 关闭按钮 ✕。进度条按当前章节 / 总章节数填充；✕ 退出返回 S-01 Stories List。图标统一从 **Remix 图标库**取用。

## 6.4 动效原则

章节过渡 300-400ms（Cover→Opening 淡出上移；Body 间水平推入；末 Body→Closing 淡入收缩）。章节内错峰入场（背景 → 标题 → 图 → 文字依次淡入，间隔约 200ms）。

缓动用 `ease-out` / `cubic-bezier`，时长 200-400ms。**禁止** 3D 翻转、粒子特效、循环动画（廉价感）。

---

# 7. 性能与加载（Layer 4）

## 7.1 性能目标

| 指标 | 目标 |
|------|------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 2.5s |
| 章节翻页响应 | < 200ms |
| Story 二次打开 | < 500ms（接近秒开） |

## 7.2 图片预处理

Story 生成时同步批量预处理所有图片：多尺寸（缩略 200w / 中图 750w / 高清 1500w）；WebP + JPEG fallback；按版式比例预裁切（1:1 / 3:4 / 4:3）；上传 CDN（推荐 Cloudflare Images）；每张生成 BlurHash 占位哈希。

## 7.3 渐进式加载

当前章节 ±1 高清，其余仅加载 BlurHash 占位。首屏优化：HTML 内联 Critical CSS（gzip < 50KB）；Cover 主图 `<link rel="preload">` 抢占带宽；其他章节 `async` 加载；埋点/统计脚本延后到首屏渲染后执行。

## 7.4 缓存策略

Story 一旦生成即不可变，适配激进缓存：CDN 边缘节点 + 浏览器 HTTP 缓存 30 天；图片 CDN 永久缓存；Service Worker 离线缓存（可选）。Story URL 永不变更（如 `nestory.app/story/{user_id}/{year-month}/`），分享链接二次打开几乎瞬开。

## 7.5 生成时机

**月底批量预生成，不做实时生成。** 系统识别符合条件用户 → 按时区错峰排队（分散到 24 小时窗口，避免 LLM API 限流）→ 生成成功后写库 + 触发图片 pipeline + 上传 CDN + 推送通知。用户打开时直接拉取已生成 Story，秒开。

---

# 8. 边界案例（Layer 5）

## 8.1 边界场景

**P0（必须处理）**

| 编号 | 场景 | 处理 |
|------|------|------|
| E01 | Memory < 5 条 | 不生成；S-01 Story Card 显示"未生成"状态 |
| E02 | LLM 生成失败 | 推送正常发送；用户看到 error message + Retry 入口（次数 ≤ 1，MVP 待定） |
| E03 | 全部图片质量不达标 | 全部 Block 降级为 Block-Text（纯文字突出） |
| E04 | 当月情绪偏负面 | 正常生成；强化温和文风；禁止 "happy/joyful/beautiful" 强行包装 |
| E05 | 档案缺失 | 不存在（onboarding 强制完整） |

**P1（必须有方案）**

| 编号 | 场景 | 处理 |
|------|------|------|
| E06 | 弱网/离线打开 | Service Worker 缓存已访问内容；首访失败显示友好提示 + 重试 |
| E07 | 加载中断 | 已加载章节正常显示，未加载显示骨架屏，翻页时触发重载 |
| E08 | 多孩子识别 | Memory 录入已绑定具体孩子档案（天然解决） |
| E09 | 非孩子内容 | Step C 分配时跳过该条；剩余 < 5 条则走 E01 |
| E10 | LLM 输出异常 | 自动重试 2 次失败 → 人工审核队列 |

**P2（可接受，先记录）**

| 编号 | 场景 | 方案 |
|------|------|------|
| E11 | 跨年月份显示 | Cover 用完整 "MAY 2026" 避免歧义 |
| E12 | 阅读中断（电话/切后台） | 进度本地存储，下次提示 "Continue reading?" |
| E13 | 横屏设备 | 强制竖屏，或显示 "Please rotate to portrait" |
| E14 | Tag 全是冷门自定义 | Prompt 中明确"不熟悉的 Tag 可忽略" |

## 8.2 运营兜底（MVP 必备：人工审核 + 失败队列）

月底批量生成后进入"待审核队列"，运营逐个审核（每个 30 秒-1 分钟）：敏感内容、文案通顺、图文匹配、产品调性。通过 → 推送；轻微问题 → 微调后推送；严重问题 → 跳过本月并发特殊推送。

**MVP 运营后台**：Story 预览、批准/拒绝按钮为必须；拒绝原因记录、重新生成触发为建议项。工具建议 Notion / 飞书表格 + 简单后台即可，不必现在做复杂运营系统。

---

# 9. 双场景与 H5 约束

Story H5 用同一套渲染代码，但分两个展示场景：

## 9.1 当前场景：App 内 WebView（本文档设计范围）

用户在 App 内打开自己的 Story。

- Closing 按 §5.1：品牌为「Logo + Nestory 文字」锁版（标题上方）+ 产品向主标题 + 数据 + Share 主按钮 + Back to Home。
- **不含水印**，**不含 App Store / Google Play 下载入口**（Story 在 App 内查看，无需引导下载）。

## 9.2 延后场景：外部浏览器分享页（规则保留，暂不实现）

被分享者用浏览器打开 Story 时，需额外处理（当前不做，待 App 内部分完成后再实现）：

- **水印**：按 §9.3 规则，免费版（生成时 `Never Paid`）Story 带 "Created with Nestory" 水印，付费版无水印；状态在生成时锁定、永久不可变。
- **下载入口**：底部加 App Store / Google Play 按钮，引导非用户下载（最低成本获客）。
- **Open Graph Meta**：配置 OG 标签，确保分享到微信 / WhatsApp / iMessage / Twitter / Telegram 时呈现精美预览卡片。

```html
<meta property="og:title" content="Mia's MAY 2026 Story" />
<meta property="og:description" content="..." />  <!-- 来自 Cover subtitle -->
<meta property="og:image" content="..." />        <!-- Cover 主图 -->
<meta property="og:url" content="..." />
<meta property="og:type" content="article" />
```

## 9.3 水印规则（仅作用于 §9.2 外部分享场景）

遵守 `ProductOverview v1.7` 与 `SubscriptionRules v1.3`。水印状态在 Story 生成时确定，写入元数据，**永久锁定不可变更**：

| 生成时订阅状态 | 水印（外部分享场景） |
|------------|------|
| `Never Paid`（带配额） | ✅ 带水印（即使后续升级，仍永久带水印） |
| `Trial Active` / `Premium Active` | ❌ 无水印（即使后续降级，仍永久无水印） |
| `Trial Ended` / `Premium Ended` | 不生成新 Story（历史 Story 保持原状态） |

---

# 10. 正文排版规范

- **所有 Block 正文**：DS Body — Inter / 400 / 16px / 行高 24 / 颜色 text-primary。Block-Text 不再用更大的 Manrope。
- **Cover / Closing 大标题**：DS Manrope 展示级字号（28–104px）+ DS 颜色。

---

# 附录：术语表

| 术语 | 定义 |
|------|------|
| **Story** | AI 生成的当月成长叙事 H5 页面，作为 artifact 不可编辑 |
| **Body Chapter** | Story 中由 LLM 决定主题与内容的动态章节（2-5 章），1 章 = 1 个主题 |
| **叙事单元（Narrative Unit）** | 章节内的一段图文，由 1 条或多条相似 Memory 合并而成；1 个叙事单元 = 1 个 Block |
| **Block** | Body 章节内的图文单元，承载一个叙事单元的文字与图片 |
| **Memory** | 用户记录的单条素材（必填：照片 + 文字；选填：Tag + Highlight 标记） |
| **Highlight** | 用户手动标记的"重要 Memory"，Step C 归类与去重的优先信号 |
| **Quality Tier** | 图片质量分级（Gold / Standard / Degraded） |
| **Laplacian variance** | 图像模糊检测算法，对图做拉普拉斯算子后取方差，越高越清晰 |
| **BlurHash** | 把图片压缩成超短字符串的算法，用作加载占位预览 |
| **CoT** | Chain-of-Thought，LLM 分步推理工作流 |
