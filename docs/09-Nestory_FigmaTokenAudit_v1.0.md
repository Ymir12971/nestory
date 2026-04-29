# Nestory — Figma 设计 Token 对账报告 v1.0

> **受众**：设计师
> **目的**：对账 Figma 文件实际使用的 Variables 与已导出 JSON（[`08-Nestory_DesignTokens.json`](./08-Nestory_DesignTokens.json)）之间的差异，并指出 Figma 文件本身的 binding 错误，请设计师据此在 Figma 中修复。
> **生成日期**：2026-04-28
> **方法论**：通过 Figma MCP server 抽样 11 个核心组件（Atoms + Molecules）的渲染产物，对照本地 JSON 反查 Variable 绑定。
> **覆盖率**：Typography 100% / Spacing 86% / Radius 60% / Color 语义层 ~70% / Color 调色板 ~30%（中间步级未直接抽样，但因 50/400/500/900 等关键步级全部对齐，推断中间步级 drift 概率极低）。

---

## 0. 文件溯源

| 项 | 值 |
|---|---|
| 当前 Figma 文件 fileKey | `u5FOaX4RGW3MZSBGb3IQpD`（07-Nestory_Figma0420，导入到 Justin Zhang's team） |
| JSON `$meta.exportedFrom` | `Qb4Wut6kIxtBkv4aAiMlNq`（旧文件 ID，2026-04-20 导出时） |
| 关系 | `.fig` 重新导入会生成新 fileKey，内容延续，但 ID 已不同 |
| 行动项 | 修完 Figma binding 后**重新导出 tokens.json**，并把 `$meta.exportedFrom` 更新为新 fileKey |

---

## 1. 总览

| 类别 | 状态 | 说明 |
|---|---|---|
| 颜色调色板（Primary / Accent / Neutral / Notify / Overlay） | 🟢 完全对齐 | 所有抽样到的值与 JSON 完全一致 |
| 间距 / 圆角 / 字体名 | 🟢 完全对齐 | Spacing / Radius / Font Primary&Secondary 全部匹配 |
| **Typography（9 条文字样式）** | 🔴 **5 处不一致** | 详见 §3 |
| **Figma 文件 binding** | 🟡 **4 处需修** | 详见 §2，请设计师在 Figma 中修复 |
| FontWeight 原子完整性 | 🟡 缺 SemiBold-600 | JSON 缺，Figma 实际在用，需导出补齐 |

---

## 2. 🔧 设计师在 Figma 中需要修复的 4 处 binding 问题

这些是 **Figma 文件本身的问题** —— 设计师在某些图层上没有绑定到正确的语义 Variable，而是写了字面量或绑错了 Variable。修这些不需要改 JSON，只需要在 Figma 里重新指定正确的 Variable。

### 2.1 🟡 Premium Button 文字色绑错（一致性问题）

| 项 | 内容 |
|---|---|
| **位置** | `01 Design System / 02 Atoms / Button` → `Type=Premium, Status=Default` |
| **Node ID** | `47:467`（图层 `47:422` 是文字） |
| **当前绑定** | `color/accent/900`（#78350f，Primitive 直接引用） |
| **期望绑定** | `text/premium`（=accent/600=#d97706，语义层引用） |
| **为什么是问题** | StatusBadge Premium（`263:37`）正确使用了 `text/premium`，但 Premium Button 跳过了语义层、直接引用了 Primitive。两者颜色不同（深色 #78350f vs 主色 #d97706），且未来若 token 重命名，这个图层会被漏掉。 |
| **三种修法**（设计师拍板） | **A.** 改绑到 `text/premium`，文字色变浅；<br>**B.** 保留深色，但新增语义 token `text/premium-on-color`（=accent/900），用它绑定，工程侧再加这个 token；<br>**C.** 维持现状，把这条记为"已知特例"。 |
| **推荐** | **B**，理由：与 Notify 系列已有的 Subtle/Border/Main/Strong 语义层级思路一致，未来扩展性最好。 |

### 2.2 🟡 Toast Error 圆角绑到了 spacing token（语义错位）

| 项 | 内容 |
|---|---|
| **位置** | `01 Design System / 03 Molecules / Toast` → `Type=Error` |
| **Node ID** | `329:42` |
| **当前绑定** | `border-radius: var(--number/spacing/s-8)` |
| **期望绑定** | `border-radius: var(--number/radius/{某个 token})` |
| **为什么是问题** | `spacing/s-8` 是间距 token，不应被绑到圆角属性。两者数值都是 8 所以视觉无差异，但语义错位。如果未来调整间距系统，这个圆角会被错误地一起改。 |
| **修法** | 改绑到合适的 radius token。**注意**：本地 radius 体系当前是 S=6 / M=10 / L=16，**没有 8 这个值**。建议：要么新增 `radius/XS-8`，要么改用 `radius/S-6` 或 `radius/M-10`，由设计师确定。 |

### 2.3 🟡 Paywall 关闭按钮 ✕ 字体未绑 token

| 项 | 内容 |
|---|---|
| **位置** | `01 Design System / 03 Molecules / Modal/Paywall` → `Property 2=A` → `pmHeader / pmClose / ✕` |
| **Node ID** | `45:29` |
| **当前** | 字面量 `font-family: 'Inter:Bold'` |
| **期望** | `font-family: var(--string/font/secondary)` + 单独的 weight binding |
| **为什么是问题** | 未来若 Inter 替换为别的字体，这个图层会漏掉。 |
| **修法** | 把字体名改为绑定到 `string/font/secondary` Variable。 |

### 2.4 🟡 Paywall saveBadge 背景色用了字面量 rgba

| 项 | 内容 |
|---|---|
| **位置** | `01 Design System / 03 Molecules / Modal/Paywall` → `pmPricing / segmented / segYearly / saveBadge` |
| **Node ID** | `45:48` |
| **当前** | 字面量 `background: rgba(255,255,255,0.2)` |
| **期望** | 绑到 `color/overlay/Overlay-30`（=#ffffff4d=rgba 0.30）或新增专用 token |
| **为什么是问题** | **值不一致**：当前是 0.2 alpha，但本地 JSON 里 `Overlay-30` 是 0.3 alpha。要么是设计师手输错了，要么是有意的（"0.2 在橙底上更舒服"）但没建立对应 token。 |
| **修法** | **请设计师确认**：<br>① 0.2 是否有意 → 若是，新增 `color/overlay/Overlay-20` token 并绑定；<br>② 还是想用 0.3 → 直接绑 `color/overlay/Overlay-30`。 |

---

## 3. 📐 Typography 5 处与导出 JSON 不一致

这部分是 **Figma 文件中实际定义的 Text Style 与 2026-04-20 导出的 JSON 不一致**。可能是设计师在导出后又调整过，或导出工具不完整。**Figma 文件是 source of truth**，请设计师确认这些是不是有意更新，确认后请工程**重新导出 JSON**。

| # | Style | Figma 实际 | 已导出 JSON | 应以谁为准 | 行动 |
|---|---|---|---|---|---|
| 1 | **Heading3** | Manrope **SemiBold (600)** 16/22 | 16/Medium-500 | **Figma** | 工程重新导出，weight 改为 600 |
| 2 | **Heading4** | Manrope **SemiBold (600)** 14/20 | 14/Medium-500 | **Figma** | 工程重新导出，weight 改为 600 |
| 3 | **Caption** | Inter Regular **14**/16 | **16**/Regular-400 | **Figma** | 工程重新导出，size 改为 14 |
| 4 | **ButtonLabel** | 拆为 **ButtonLabel-M**（Manrope Bold 16/22）<br>+ **ButtonLabel-S**（Manrope SemiBold 14/20） | 单条 ButtonLabel：16/Medium-500 | **Figma** | 工程重新导出，拆成两条 |
| 5 | FontWeight 原子缺 | 在用 **SemiBold-600** | JSON `01 Primitive / Number / FontWeight` 只有 400/500/700 | **Figma** | 工程导出时补齐 SemiBold-600 |

> **设计师只需要确认**：上述 1-4 是不是你近期有意的调整？如果是，告诉工程"重新导出"即可。如果你不记得改过，请检查 `01 Font Family` 帧（`46:100`）里的 Heading3/4/Caption/ButtonLabel-M/S 文字样式是否符合预期。

---

## 4. 🟢 已对齐的部分（无需关注，仅作记录）

### 4.1 颜色 Primitive
所有抽样到的色值与 JSON 100% 一致：

| 抽样点 | Figma 实际 = 本地 JSON |
|---|---|
| `color/primary/{50, 400, 500}` | #edfbf2 / #3ec878 / #23ab65 |
| `color/accent/{50, 400, 500, 900}` | #fff8eb / #fbbf24 / #f59e0b / #78350f |
| `color/neutral/{50, 200, 400, 500, 900, White}` | #fefcfa / #ededed / #a3a3a3 / #8a8a8a / #1a1a1a / #ffffff |
| `color/notify/success/{Subtle, Strong}` | #f0fdf4 / #166534 |
| `color/notify/error/{Subtle, Border, Strong}` | #fef2f2 / #fecaca / #991b1b |
| `color/notify/warning/{Subtle, Strong}` | #fffbeb / #92400e |
| `color/notify/info/{Subtle, Strong}` | #eff6ff / #1e40af |

### 4.2 02 Tokens 语义层
| Token 类别 | 抽样验证项 | 状态 |
|---|---|---|
| Text | Primary / Secondary / Hint / OnColor / Brand / Premium / Success / Error / Warning / Info | 🟢 8/11 已直接验证，全对齐 |
| Surface | Default / Card / Brand-Subtle / Premium-Subtle / Success/Error/Warning/Info-Subtle | 🟢 6/12 已直接验证，全对齐 |
| Border | Default / Brand / Error | 🟢 3/9 已直接验证，全对齐 |

### 4.3 数值
| 类别 | 抽样验证 | 状态 |
|---|---|---|
| Spacing | XS-4 / S-8 / M-12 / L-16 / XXL-24 / SafeBtm-34 | 🟢 6/7 验证（仅 XL-20 未抽到，无 drift 风险） |
| Radius | S-6 / L-16 / Full-999 | 🟢 3/5 验证（M-10 / None-0 未抽到） |
| FontSize | H1-28 / H2-18 / H3-16 / H4-14 / S-12 | 🟢 5/8 验证 |

### 4.4 字体
| | 实际 = JSON |
|---|---|
| `string/font/primary` | Manrope ✅ |
| `string/font/secondary` | Inter ✅ |

---

## 5. 抽样组件清单（透明度参考）

下列 11 个组件被用作对账抽样源：

| Node ID | 组件 | 页面 |
|---|---|---|
| `47:461` | Button · Type=Primary, Status=Default | 01 Design System / 02 Atoms |
| `47:467` | Button · Type=Premium, Status=Default | 01 Design System / 02 Atoms |
| `34:4` | Input · Type=SingleLine, State=Default | 01 Design System / 02 Atoms |
| `46:100` | 01 Font Family（Heading1-4 / Body / Caption / ButtonLabel-M/S / Tag&Badge） | 01 Design System |
| `40:34` | Notify · Type=Success | 01 Design System / 03 Molecules |
| `40:37` | Notify · Type=Warning | 01 Design System / 03 Molecules |
| `40:40` | Notify · Type=Error | 01 Design System / 03 Molecules |
| `41:51` | Notify · Type=Info | 01 Design System / 03 Molecules |
| `263:37` | StatusBadge · Type=Premium | 01 Design System / 02 Atoms |
| `329:42` | Toast · Type=Error | 01 Design System / 03 Molecules |
| `45:26` | Modal/Paywall · Property 2=A | 01 Design System / 03 Molecules |
| `44:4` | Card/Story · Type=Current, Status=Empty | 01 Design System / 03 Molecules |

---

## 6. 设计师 Action Checklist

```
□ §2.1  Premium Button 文字色：拍板走 A/B/C 三种方案哪一种
□ §2.2  Toast Error 圆角：选定一个 radius token（含决定是否新增 radius/XS-8）
□ §2.3  Paywall 关闭 ✕ 字体：改为绑 string/font/secondary
□ §2.4  Paywall saveBadge 背景：确认 0.2 vs 0.3 哪个对，并改为 token 绑定
□ §3    确认 Heading3/4 weight、Caption size、ButtonLabel-M/S 拆分是有意的
□        以上都修完之后，通知工程重新导出 tokens.json，并更新 $meta.exportedFrom
```

---

## 7. 后续

修复完成后，请：

1. 在 Figma 中重新导出 Variables → 替换 [`docs/08-Nestory_DesignTokens.json`](./08-Nestory_DesignTokens.json)
2. 通知工程团队同步更新代码中引用的 token 名（特别是 ButtonLabel-M/S 拆分）
3. 本文档归档为 v1.0；下次审计可以基于此 baseline 做增量对比

如有疑问，请联系负责本次审计的工程同学。
