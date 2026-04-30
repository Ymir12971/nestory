# Nestory · 设计待确认问题（给 vicol）

> 开发侧在实现过程中遇到的设计 / Token 决策缺口，需要 vicol 确认后更新 Figma 或 `08-Nestory_DesignTokens0429.json`。
> 确认后在对应条目后注明日期和结论，并通知 Justin 覆盖临时方案。

---

## Q1 · 品牌绿背景上的文字颜色缺少 Semantic Token（2026-04-30）

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

**需要 vicol 决策**：是否在 `02 Tokens` 里补充 `Text.OnBrand-Subtle` 和 `Text.OnBrand-Emphasis` 两个 Semantic alias？确认后 Justin 将临时 token 名替换为正式名。

---

## Q2 · O-01 Welcome hero 背景渐变色不在 Token 系统里（2026-04-30）

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
