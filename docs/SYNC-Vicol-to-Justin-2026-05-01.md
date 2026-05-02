# 致 Justin · Vicol 对 sync-to-vicol 的回复（2026-05-01）

> 对应你在 `sync-to-vicol.md` 中的 **Q5 / Q6 / Q7 / Q1 / Q2**，以及 **2026-04-25 图标与双端** 的补充说明。  
> 产品结论如下；若与当前 **API / DB 实现** 有冲突，请你在实现层标注差异并回我是否需要调整后端策略。

---

## Q5 · 软删 / Trash / 30 天恢复窗

**产品结论（本版本）：不做。**

- 用户删除 **Memory** 或 **Highlight** 时：**直接彻底删除**即可。  
- **不需要**「最近删除 / Trash / 30 天恢复窗」相关 UI，也不需要在 MVP 内暴露 `trash` / `restore` 等用户路径。

**请你（Justin）对齐检查：**

- 若当前后端已按 `sync-to-vicol` 所述实现 **默认软删 + trash API**，请评估本版本是否改为：**用户删除 Memory/Highlight 走硬删（或等价“立即不可恢复”）**，并避免移动端出现半套 trash 行为。  
- 若 **users / children** 等资源仍保留软删策略，请单独说明与 Memory/Highlight 是否一致（本回复仅明确 **Memory / Highlight 不做 trash**）。

---

## Q6 · 历史月份 Memory 只读（R-08）是否需要额外提示

**产品结论：不需要再加新的提示组件。**

- **H-04 Memory Detail · Read Only** 本身即为「只读态」设计；详情页已区分只读与可编辑。  
- **H-03 Memory List** 列表层 **不区分**只读/可编辑为预期行为；进入 **H-04** 后再体现只读即可。

**请你（Justin）对齐检查：**

- 请以 **Figma `H-04 Memory Detail (Read Only)`** 为准核对实现；若当前仅「静默 disabled 编辑按钮」且与 Figma 只读态不一致，请按 Figma 调整，而不是新增额外 banner（除非 Figma 后续增补）。

---

## Q7 · `trial_ended` vs `premium_ended` 在 UI 上是否区分

**产品结论：不需要区分。**

- **Ended** 用户在 UI 上 **不需要**展示「曾经是 Trial 还是 Premium」的差异；与此前产品讨论一致。  
- 维持与 Figma / `SubscriptionRules` 一致的 **Renew / Expired** 语境即可。

---

## Q1 & Q2 · 颜色 Token 与 hardcode / one-off

**产品结论（设计 ↔ 工程约定）：**

- 若在 Figma 中发现某处颜色 **没有** 对应的 **语义 Token**（即表现为 hardcode / 仅 Primitive / 或完全 one-off）：  
  **工程实现以 Figma 画布上的最终色值为准**，可直接使用该校色值（含渐变 stop 等）。  
- **不强制**把所有视觉色都升格为 Token；**尤其**如 **Q2（O-01 Welcome 三色渐变）** 这类 one-off，**无需**落入 `01 Primitive` / `02 Tokens`。

> 说明：若后续某类 hardcode 在多处复用且开始漂移，再考虑抽 Token；MVP 以交付速度与视觉一致为先。

---

## 图标 · Remix 与双端一致性（对 2026-04-25 条的补充）

**产品结论：**

- Nestory 引用的图标体系为 **Remix Icon**；请保证 **iOS / Android 两端**图标 **来源一致**（同一套 Remix 资源与命名约定），视觉与语义对齐 Figma。

**请你（Justin）执行：**

- 请你侧再用官方文档 / Remix 提供的工具链（含你提到的 **Remix MCP** 等）复核：**Remix 在 Android 上的交付方式**（字体图标 / 组件库 / SVG 等）与限制；  
- 历史上「不要用 SF Symbols」的提醒，针对的是 **SF Symbols 无法跨 Android**；**不等于** Remix 在 Android 不可用。最终以 **可维护 + 双端一致** 为准选型。  
- 若复核结论与当前实现有差异，请回一条简短技术结论给我（无需长文）。

---

## 小结表

| 编号 | 结论 |
|------|------|
| Q5 | MVP **不做** Trash / 恢复窗；Memory / Highlight **直接彻底删除** |
| Q6 | **不新增**额外只读提示；以 **H-04 Read Only** Figma 为准对齐实现 |
| Q7 | Ended **不区分** Trial / Premium 来源 |
| Q1/Q2 | 无语义 Token 时 **以色值对齐 Figma**；one-off 渐变等 **不必** token 化 |
| 图标 | **Remix**；双端一致；请你复核 Android 交付方式 |

---

**确认人：** Vicol  
**日期：** 2026-05-01
