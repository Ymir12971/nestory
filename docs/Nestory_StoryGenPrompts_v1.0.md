# Nestory Story 生成 Prompt 工程文档

**文档版本：** v1.0
**更新日期：** 2026-06-26
**编写者：** Vicol
**前置依赖：** `Nestory_StoryH5Design_v1.2.md`（本文档是其下游实现；所有规则以 StoryH5Design 为准，此处不重复定义，仅落地为可执行 prompt）

---

**重要说明：** 所有 system / user prompt 正文为**英文**（产出内容为英文，同语言可减少翻译腔、指令遵循更稳）。每个 prompt 块配**中文注释**说明设计意图与占位符。

**架构概要：** 整条流水线 = **2 次 LLM 调用 + 中间确定性代码层**。Prompt 1 做结构决策（讲什么、怎么分），代码层做图片筛选/裁切（确定性规则，不调 LLM），Prompt 2 做文案生成（写得好）。完整示例见文末附录。

---

# §0 占位符规范

所有 `{{...}}` 为后台填充变量，由 Justin 在调用时注入。命名贯穿全文。

| 占位符 | 含义 | 由谁填充 | 来源 / 格式 |
|--------|------|---------|-----------|
| `{{CHILD_PROFILE}}` | 孩子档案 | 代码 | `{ name, gender, birth_date, timezone }` |
| `{{MONTH_KEY}}` | 目标月份 | 代码 | 字符串，如 `"2025-11"` |
| `{{MONTH_DISPLAY}}` | 月份展示名 | 代码 | 字符串，如 `"NOVEMBER 2025"` |
| `{{MEMORIES_JSON}}` | 当月全部 Memory | 代码 | Memory 数组，结构见 §2.2 |
| `{{MEMORY_COUNT}}` | 当月 Memory 条数 | 代码 | 整数，决定主题数上限（StoryH5Design §4.2） |
| `{{LOCATION_ENABLED}}` | 是否启用位置 | 代码 | 布尔，ST-01 开关 + iOS 授权双开为 true |
| `{{STRUCTURE_JSON}}` | Prompt 1 的输出 | Prompt 1 → 代码 | 结构决策结果，结构见 §2.3；作为 Prompt 2 输入 |
| `{{UNIT_PHOTOS_JSON}}` | 代码层图片处理结果 | 代码层 | 每个叙事单元的最终图片 + block 版式，结构见 §3 |

> 数据路径约定：所有 Memory 原图通过 `photo.url` 引用 CDN 地址；代码层裁切后的图片以 `unit_id` + 序号命名新 URL，prompt 不关心物理路径，只传 URL 字符串。

---

# §1 流水线总览

```
当月 Memory 池 {{MEMORIES_JSON}}
  │
  │  ① 前置校验（代码）：MEMORY_COUNT < 5 → 不生成（StoryH5Design E01）
  ▼
┌─────────────────────────────────────────┐
│ 【Prompt 1 · LLM】结构决策 Step A-D        │
│  通读文字 → 选主题 → memory 归类 →          │
│  章节内聚类(merge/dedupe) → 章节排序        │
│  输出：{{STRUCTURE_JSON}}                  │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 【代码层 · 非 LLM】图片处理                  │
│  按 StoryH5Design §3.6：筛图 / Laplacian   │
│  排序 / 比例裁切 / 选 Block 版式             │
│  输出：{{UNIT_PHOTOS_JSON}}                │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 【Prompt 2 · LLM】文案生成 Step E-F         │
│  输入：STRUCTURE + UNIT_PHOTOS             │
│  逐 block 写文字 + 章节标题 + Opening +      │
│  Cover subtitle                           │
│  输出：文案 JSON                            │
└─────────────────────────────────────────┘
  │
  ▼
【代码层 · 非 LLM】组装最终 Story JSON（§5）→ 质量校验 → 人工审核队列
```

---

# §2 Prompt 1：结构决策（Step A-D）

**目标：** 把一堆 Memory 整理成「选了哪些主题、每个主题包含哪些 Memory、哪些 Memory 合并或丢弃、章节什么顺序」。**不写任何用户可见文案**，只做结构判断。输出轻量 JSON。

## 2.1 System Prompt

```
You are the narrative architect for Nestory, a baby-memory app that turns a
parent's monthly notes and photos into a short, beautifully told "Story" about
their child.

Your job in THIS step is STRUCTURE ONLY. You do NOT write the final story text.
You read all of this month's memories and decide:
  A. Theme Discovery — what recurring themes run through this month.
  B. Theme Selection — pick the 2–5 themes that genuinely define the month.
     The number of selected themes = the number of Body chapters.
  C. Memory Allocation & Clustering —
     C1. Assign each memory to exactly ONE theme (chapter).
     C2. Within each chapter, find memories about the SAME or HIGHLY SIMILAR
         events and either:
         - MERGE them into one "narrative unit" if each adds new information or
           shows progression (e.g. "took 3 steps" + "walked 4 steps" = progress).
         - DEDUPE if they are near-duplicates with no new information: keep only
           the single best memory (more specific text / higher photo quality;
           prefer is_highlight=true), drop the rest entirely.
     One narrative unit = one Block in the final layout. A unit may contain one
     or more memories.
  D. Narrative Ordering — order the chapters for emotional rhythm
     (e.g. light→meaningful, inner→outer, build a gentle arc).

Hard rules:
- Theme count must respect the cap implied by memory volume (provided to you).
- Every selected memory belongs to exactly one chapter and one unit.
- Dropped (deduped) memories must be listed explicitly so downstream steps skip them.
- Skip any memory that is clearly NOT about the child; if fewer than 5 usable
  memories remain, return {"generate": false} with a reason.
- Tags / highlight / location are SUPPORTING signals only; do not let an unfamiliar
  custom tag drive your grouping. Ignore tags you don't understand.
- Output STRICT JSON only. No prose, no markdown, no commentary.
```

> 中文注释：本 system prompt 把 StoryH5Design §3.3 的 Step A-D 与 §3.4 信号角色直接落地。关键约束是「只做结构、不写文案」「merge/dedupe 必须显式标注」「主题数受 memory 数量上限约束」「非孩子内容剔除、不足 5 条返回 generate:false」。最后一句强制 STRICT JSON 是为了让代码层可直接解析。

## 2.2 User Prompt 模板

```
Child profile: {{CHILD_PROFILE}}
Month: {{MONTH_DISPLAY}} ({{MONTH_KEY}})
Total memories this month: {{MEMORY_COUNT}}
Location signals enabled: {{LOCATION_ENABLED}}

Theme-count cap based on memory volume:
  <5 → do not generate | 5–10 → max 2 | 11–25 → max 3 | 26–50 → max 4 | >50 → max 5

Here are all memories for this month (JSON array):
{{MEMORIES_JSON}}

Each memory has:
  id, captured_at, text, tags[], highlight (bool), highlight_note, photos[]
  (photos are aspect-ratio labels only at this stage; you do NOT choose photos —
   downstream code does. Use photo COUNT only if helpful for judging richness.)

Return the structure decision as STRICT JSON following the schema you were given.
```

> 中文注释：user prompt 把所有运行时变量以占位符注入。特别提示 LLM「这一步不选图片，photos 字段只看数量、不做筛选」——筛图是代码层的活（§3），避免 LLM 越权。theme-count cap 直接写进 prompt，让模型自我约束。

## 2.3 输出 JSON Schema（Prompt 1 → `{{STRUCTURE_JSON}}`）

```jsonc
{
  "generate": true,                    // false 时仅附 reason，流程终止
  "reason": null,                      // generate=false 时填原因
  "chapter_order": ["theme_1", "theme_2", "theme_3"],  // Step D 排好序的章节 key
  "chapters": [
    {
      "theme_key": "theme_1",          // 内部标识
      "theme_label": "Finding Her Feet",  // 主题简述（内部参考，非最终标题）
      "units": [                       // 每个 unit = 一个 Block
        {
          "unit_id": "u1",
          "memory_ids": ["MEM-1101", "MEM-1112"],  // merge 后可多条
          "merge_reason": "progression: 3 steps → 4 steps"  // merge 时填，单条留空
        }
      ]
    }
  ],
  "dropped_memory_ids": ["MEM-xxxx"],  // dedupe 丢弃的，下游必须跳过
  "skipped_memory_ids": []             // 非孩子内容剔除的
}
```

> 中文注释：这是喂给代码层和 Prompt 2 的中间产物。`units` 里的 `memory_ids` 决定了图片从哪些 Memory 收集（代码层据此筛图）。`dropped` / `skipped` 显式列出，保证下游不会误用被淘汰的素材。`theme_label` 仅供内部参考，最终章节标题由 Prompt 2 写。

---

# §3 代码层：图片处理（非 LLM，给 Justin 的规格）

**这一步不调用 LLM。** 输入 `{{STRUCTURE_JSON}}`，按 StoryH5Design §3.6 的确定性规则处理，输出每个叙事单元的最终图片与 Block 版式。

## 3.1 处理规则（伪代码）

```
for each chapter in STRUCTURE_JSON.chapters:
    chapter_photos = []
    for each unit in chapter.units:
        # 收集该单元名下所有 memory 的图片（跳过 dropped/skipped）
        pool = collect_photos(unit.memory_ids)

        # 质量过滤：剔除 Degraded（StoryH5Design §3.2）
        pool = [p for p in pool if p.quality_tier != "degraded"]

        # 规则2：单元出图 = 名下图片数，封顶 3；4+ 取 Laplacian variance 最高 3 张
        if len(pool) > 3:
            pool = top_n_by_laplacian(pool, 3)

        # 规则1：每个入选单元至少 1 张图；若过滤后为 0 → Block-Text
        unit.photos = pool          # 可能为空
        chapter_photos += pool

    # 规则3：章节总量上限 20，超出逐轮削减
    if count(chapter_photos) > 20:
        # 第1轮：每单元只留质量最高 1 张
        keep_one_per_unit(chapter.units)
    if still > 20:
        # 按 quality_tier 从最差单元起整体剔除其图，保底每单元 1 张
        trim_worst_units_until(chapter.units, 20)

    # 选 Block 版式 + 比例裁切（StoryH5Design §3.6.2 / §3.6.3）
    for each unit in chapter.units:
        unit.block_layout = pick_layout(unit.photos)   # 见下
        unit.photos = crop_each(unit.photos, unit.block_layout)
```

## 3.2 Block 版式选择（`pick_layout`）

```
0 张             → Block-Text
1 张横图(4:3)    → Block-Single-H
1 张竖图(3:4)    → Block-Single-V   # v1/v2 由 Prompt 2 文字长度回填后决定
2 张             → Block-Duo        # 9 种朝向组合；双 4:3 → 上下堆叠
3 张             → Block-Grid       # 主图(非3:4) + Duo 槽位；无三张 3:4 并排
```

## 3.3 比例裁切（`crop_each`，StoryH5Design §3.6.3）

```
单图：横图→4:3，竖图→3:4（保留朝向）
Duo / Grid：保留各自朝向(1:1 / 4:3 / 3:4)，按硬约束排布；不再强制 1:1
```

## 3.4 输出（`{{UNIT_PHOTOS_JSON}}`）

```jsonc
{
  "chapters": [
    {
      "theme_key": "theme_1",
      "units": [
        {
          "unit_id": "u1",
          "memory_ids": ["MEM-1101", "MEM-1112"],
          "block_layout": "Block-Duo",
          "photos": [
            { "url": "cdn://.../u1_0.jpg", "ratio": "1:1" },
            { "url": "cdn://.../u1_1.jpg", "ratio": "4:3" }
          ]
        }
      ]
    }
  ]
}
```

> 中文注释：Block-Single-V 的 v1/v2 此刻还不能定（取决于 Prompt 2 写出来的文字长短），先标 `Block-Single-V`，等 Prompt 2 文案回来后由代码按字数回填 v1/v2。其余版式此处即可定死。

---

# §4 Prompt 2：文案生成（Step E-F）

**目标：** 结构和图片都定好了，这一步只专注「写得好」。按 `{{STRUCTURE_JSON}}` 的章节/单元，逐 block 写叙事文字，并写章节标题、Opening、Cover subtitle。

## 4.1 System Prompt

```
You are the writer for Nestory. The structure of this month's Story is already
decided (chapters, narrative units, photos). Your ONLY job is to write the
user-facing text, beautifully and truthfully.

Voice & style:
- Second person, addressed to the parent ("You and {child} this month...").
- Show, don't tell. Let emotion surface through concrete actions, expressions,
  and scenes. Do NOT state the emotion outright.
- Avoid generic clichés ("growing up so fast") and meta-sentimentality
  ("precious memories", "a moment to treasure") — they carry zero information
  and apply to any child.
- Warm, specific, present-tense.

Truthfulness:
- Rewrite, never invent. Only describe what the memories actually say.
- Honour real emotion. Sadness / worry / fear may be told, with a gentle,
  resilient lens. NEVER force "happy / joyful / beautiful" onto a clearly
  negative event.

Chapter cohesion (important):
- A chapter is ONE continuous story, not a list of separate captions.
- For each chapter you are given an internal "narrative thread". Every unit's
  paragraph must serve that thread and connect to the previous unit with
  transitions (time progression, cause/effect, emotional continuity) —
  e.g. "By mid-month...", "And then...".
- When a unit merges multiple memories, fuse them into ONE flowing paragraph
  (not stitched fragments).

Length limits:
- Chapter title ≤ 8 words.
- Each unit paragraph 30–50 words.
- Opening 1–2 paragraphs, each 30–60 words.
- Cover subtitle ≤ 12 words.

Output STRICT JSON only. No prose, no markdown.
```

> 中文注释：本块把 StoryH5Design §3.3 的全部文案约束（第二人称、show-don't-tell、忠于真实情绪、禁止强行 happy、章节连贯靠叙事主线+过渡词、merge 单元融合改写、长度限制）一次性写进作家角色。Closing 主标题不在这里写——它是产品向固定文案（§4.3 数据结构），由代码直接填，不消耗 LLM。

## 4.2 User Prompt 模板

```
Child profile: {{CHILD_PROFILE}}
Month: {{MONTH_DISPLAY}}
Location signals enabled: {{LOCATION_ENABLED}}

Structure decision (themes, chapter order, units, merge notes):
{{STRUCTURE_JSON}}

Per-unit photos & layout (for context only; do NOT choose or reorder photos):
{{UNIT_PHOTOS_JSON}}

Original memory texts (id → text), for your rewriting source:
{{MEMORIES_JSON}}

For EACH chapter in chapter_order:
  1. First write an internal one-line "narrative_thread" that links its units.
  2. Write a chapter "title" (≤ 8 words).
  3. For each unit, write one paragraph (30–50 words) fusing its memory_ids'
     texts, serving the thread, connected to the previous unit.
Then write:
  - "opening": 1–2 paragraphs setting the month's mood.
  - "cover_subtitle": ≤ 12 words capturing the month in one line.

Return STRICT JSON per the schema.
```

> 中文注释：把三份输入（结构 / 图片 / 原文）一起喂给作家。强调「不要选图、不要重排图片」——图片是代码层定死的，LLM 只按已定顺序写文字。要求模型先写 `narrative_thread` 再写段落，是把 §3.3「章节叙事主线」落到执行层，强制连贯性。

## 4.3 输出 JSON Schema（Prompt 2）

```jsonc
{
  "cover_subtitle": "The month you found your feet.",   // ≤ 12 words
  "opening": {
    "paragraphs": ["...", "..."]                        // 1–2 段
  },
  "chapters": [
    {
      "theme_key": "theme_1",
      "narrative_thread": "from first steps to standing alone",  // 内部用，可不渲染
      "title": "Finding Her Feet",                      // ≤ 8 words
      "units": [
        {
          "unit_id": "u1",
          "text": "It started by the couch..."          // 30–50 words
        }
      ]
    }
  ]
}
```

> 中文注释：输出只含文字。`theme_key` / `unit_id` 用于代码层和 §2.3、§3.4 对齐回填。`narrative_thread` 是内部连贯性产物，渲染时不展示（也可留作 QA 审核参考）。

---

# §5 最终组装 + 校验（非 LLM）

代码层把三份产物按 `theme_key` / `unit_id` 对齐，组装成 StoryH5Design §4.3 的最终 Story JSON：

```
Cover     ← {{MONTH_DISPLAY}} + child.name + Prompt2.cover_subtitle
            + Cover-A/B 由代码按「是否有 Gold 竖图」决定
Opening   ← Prompt2.opening.paragraphs
Body[n]   ← 对每个 chapter：
              title ← Prompt2.chapters[].title
              blocks[] ← 对每个 unit 合并：
                 memory_ids   ← STRUCTURE_JSON
                 text         ← Prompt2 unit.text
                 photos       ← UNIT_PHOTOS_JSON unit.photos
                 block_layout ← UNIT_PHOTOS（Single-V 此时按 text 字数回填 v1/v2）
Closing   ← 固定产品向 headline（代码常量）+ stats{memories, photos}（代码统计）
```

随后执行 StoryH5Design §3.5 质量校验清单（结构完整、章节数=主题数、长度未超限、孩子名匹配、无强行 happy、无悬空章节）。通过 → 入审核队列；不过 → 重试。

---

# §6 边界与失败处理

| 场景 | 处理（对应 StoryH5Design） |
|------|--------------------------|
| MEMORY_COUNT < 5 | 代码层前置拦截，不调用 LLM（E01） |
| Prompt 1 返回 `generate:false` | 流程终止，记录 reason；S-01 显示未生成 |
| Prompt 1 / 2 输出非法 JSON | 自动重试 ≤ 2 次（间隔 30s）；仍失败 → 人工审核队列（E10） |
| 某章节图片过滤后全空 | 该章所有 unit 走 Block-Text（E03） |
| 长度超限 | 代码层截断 + 标记，必要时单步重试 |
| 非孩子内容 | Prompt 1 列入 `skipped_memory_ids`；剩余 < 5 → 回到 E01 |

## 调用参数建议（方向，非写死，Justin 调）

- **Prompt 1**：低温度（≈0.3–0.5），结构决策要稳定可复现；强制 JSON 模式
- **Prompt 2**：中温度（≈0.7–0.8），写作需要一定文采变化；强制 JSON 模式
- 两步都设 `response_format: json`（若 model 支持），降低非法 JSON 概率

---

---

# 附录 Reference：November（20 条）完整示例

> **说明：以下为「合理示意」，非唯一正确答案。** 真实 LLM 可能给出不同但同样合理的主题划分与文案。仅用于让你和 Justin 对照真实输入理解各步产物形态。输入为 `test_data.json` 中 `2025-11` 的 20 条 Memory。

## R1 · Prompt 1 输出（结构决策）

```jsonc
{
  "generate": true,
  "reason": null,
  "chapter_order": ["walking", "mealtime", "outside"],
  "chapters": [
    {
      "theme_key": "walking",
      "theme_label": "Learning to Walk",
      "units": [
        { "unit_id": "w1", "memory_ids": ["MEM-1101", "MEM-1112"],
          "merge_reason": "progression: 3 steps → 4 steps" },
        { "unit_id": "w2", "memory_ids": ["MEM-1120"], "merge_reason": null }
      ]
    },
    {
      "theme_key": "mealtime",
      "theme_label": "Everything Is Food (Sort Of)",
      "units": [
        { "unit_id": "m1", "memory_ids": ["MEM-1102"], "merge_reason": null },
        { "unit_id": "m2", "memory_ids": ["MEM-1110"], "merge_reason": null },
        { "unit_id": "m3", "memory_ids": ["MEM-1113"], "merge_reason": null }
      ]
    },
    {
      "theme_key": "outside",
      "theme_label": "Out Into the World",
      "units": [
        { "unit_id": "o1", "memory_ids": ["MEM-1109"], "merge_reason": null },
        { "unit_id": "o2", "memory_ids": ["MEM-1119"], "merge_reason": null },
        { "unit_id": "o3", "memory_ids": ["MEM-1114"], "merge_reason": null }
      ]
    }
  ],
  "dropped_memory_ids": ["MEM-1106"],   // 与 MEM-1115/反射类趣味重复，示意去重
  "skipped_memory_ids": []
}
```

> 注：示例只取了部分 Memory 进入三个主题；其余（语言萌芽、洗澡、睡前、家庭等）在真实运行中可能形成第 4 主题或被并入，受 11–25 档「主题数 ≤ 3」上限约束，这里压到 3 章。

## R2 · 代码层输出（图片处理，节选 walking 章）

```jsonc
{
  "chapters": [
    {
      "theme_key": "walking",
      "units": [
        {
          "unit_id": "w1",
          "memory_ids": ["MEM-1101", "MEM-1112"],
          "block_layout": "Block-Grid",          // 合并后图片数=5(1101三张+1112两张)→封顶后取3
          "photos": [
            { "url": "cdn://w1_0.jpg", "ratio": "1:1" },
            { "url": "cdn://w1_1.jpg", "ratio": "3:4" },
            { "url": "cdn://w1_2.jpg", "ratio": "1:1" }
          ]
        },
        {
          "unit_id": "w2",
          "memory_ids": ["MEM-1120"],
          "block_layout": "Block-Single-V",      // 1120 仅一张 3:4
          "photos": [ { "url": "cdn://w2_0.jpg", "ratio": "3:4" } ]
        }
      ]
    }
  ]
}
```

## R3 · Prompt 2 输出（文案，节选）

```jsonc
{
  "cover_subtitle": "The month you found your feet.",
  "opening": {
    "paragraphs": [
      "November was the month Mia stopped watching the world and started moving through it. Three wobbly steps became four, then almost ten — and the words started coming too.",
      "You'll remember this one as the month everything sped up."
    ]
  },
  "chapters": [
    {
      "theme_key": "walking",
      "narrative_thread": "from first three steps to standing alone",
      "title": "Finding Her Feet",
      "units": [
        { "unit_id": "w1",
          "text": "It started by the couch. One morning she let go and crossed three whole steps before landing with the biggest grin. By mid-month she'd doubled it — four, unassisted, like she'd always known how." },
        { "unit_id": "w2",
          "text": "And on the last day of November, she simply stood. Almost ten seconds, on her own, no hands. November really was a big one." }
      ]
    }
    // mealtime / outside 章略
  ]
}
```

## R4 · 最终组装 Story JSON（节选 Cover + walking 章）

```jsonc
{
  "cover": {
    "type": "cover", "layout": "Cover-A",
    "month": "NOVEMBER 2025", "child_name": "Mia",
    "subtitle": "The month you found your feet."
  },
  "opening": {
    "type": "opening",
    "paragraphs": [
      "November was the month Mia stopped watching the world and started moving through it...",
      "You'll remember this one as the month everything sped up."
    ]
  },
  "body": [
    {
      "type": "body",
      "chapter_title": "Finding Her Feet",
      "blocks": [
        {
          "memory_ids": ["MEM-1101", "MEM-1112"],
          "text": "It started by the couch...",
          "photos": [
            { "url": "cdn://w1_0.jpg", "ratio": "1:1" },
            { "url": "cdn://w1_1.jpg", "ratio": "3:4" },
            { "url": "cdn://w1_2.jpg", "ratio": "1:1" }
          ],
          "block_layout": "Block-Grid"
        },
        {
          "memory_ids": ["MEM-1120"],
          "text": "And on the last day of November, she simply stood...",
          "photos": [ { "url": "cdn://w2_0.jpg", "ratio": "3:4" } ],
          "block_layout": "Block-Single-V-v1"   // text 短 → 回填 v1
        }
      ]
    }
    // mealtime / outside 章略
  ],
  "closing": {
    "type": "closing",
    "headline": "Nestory keeps your little one's everyday moments as they grow.",
    "stats": { "memories": 20, "photos": 38 }
  }
}
```
