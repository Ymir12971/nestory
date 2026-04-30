# Nestory — Figma 屏幕清单 (Source of Truth)

**版本：** v1.0
**日期：** 2026-04-30
**Figma 文件：** `07-Nestory_Figma0429`（fileKey `nwCrXylV5fm1iG7DVfEmGX`）
**抽取自：** Page `02 Main UI`（canvas `50:1171`），通过 Figma MCP `get_metadata`
**状态：** 41 个 frame，覆盖 Onboarding / Home / Stories / Highlights / Settings 5 大屏组

---

## 用法

- 实现某屏前，按本文 node ID 调 `mcp__figma__get_design_context` 拉精确设计
- 屏组与 `apps/nestory-mobile/features/` 命名一一对应
- 设计师增删屏后，重新跑 MCP 抽取并更新本表

---

## 同 Page 上的辅助内容

每个屏边上挂着该屏关键控件的状态变体小看板（用于精校）：

| Frame ID | 名称 | 关联屏 |
|---|---|---|
| `269:800` | H-01 / avatarRow Variants | H-01 |
| `398:871` | H-02 / highlightRow States | H-02 |
| `275:800` | S-01 / monthCard Active States | S-01 |
| `392:853` | S-01 / topNotify States | S-01 |
| `394:859` | HL-01 / topNotify States | HL-01 |
| `345:829` | HL-02 / Highlight Variants | HL-02 |
| `403:880` | ST-01 / subscriptionEntry States | ST-01 |

---

## 1. Onboarding (`features/onboarding`, `app/onboarding/`)

完整流：Welcome → Sign In → 孩子档案 (a/b/c) → (可选第二个孩子) → Notifications → Plan → Terms/Privacy

| ID | 名称 | 尺寸 | 路由文件（v3.0） | 备注 |
|---|---|---|---|---|
| `58:38`  | O-01 Welcome | 393×852 | `app/onboarding/welcome.tsx` | hero 椭圆 + brand + body + 单 CTA；登录前引导 |
| `58:57`  | O-02 Sign In | 393×852 | `app/onboarding/auth.tsx` | StatusBar + 图片 + Apple/Google 登录；**当前 SignInScreen 对应这个** |
| `62:42`  | O-03a Child Name | 393×852 | `app/onboarding/profile.tsx` | 步骤 1：起名 |
| `62:77`  | O-03a Child Name Filled | 393×852 | 同上（状态变体） | 已填态 |
| `62:111` | O-03b Birthday | 393×852 | `app/onboarding/profile.tsx` | 步骤 2：生日 |
| `62:158` | O-03b Birthday Confirm | 393×852 | 同上（状态变体） | 已选 |
| `63:76`  | O-03c More Details | 393×852 | `app/onboarding/profile.tsx` | 步骤 3：身高/体重（公制）|
| `63:136` | O-03c More Details (in/lb) | 393×852 | 同上（单位变体） | 英制版本 |
| `63:196` | O-03a Second Child | 393×852 | 同上（多孩子流） | 起名 |
| `63:235` | O-03b Birthday (2nd) | 393×852 | 同上 | 生日 |
| `63:282` | O-03c More Details (2nd) | 393×852 | 同上 | 身高/体重 |
| `64:142` | O-04 Notifications | 393×852 | `app/onboarding/permissions.tsx` | 通知授权 |
| `64:170` | O-05 Plan (Yearly) | 393×852 | `app/onboarding/plan.tsx` | 默认年付 |
| `64:250` | O-05 Plan (Monthly) | 393×852 | 同上（toggle 变体） | 月付 |
| `64:330` | O-06 Terms of Service | 393×852 | `app/onboarding/terms.tsx`（待加） | 法务页 |
| `64:361` | O-07 Privacy Policy | 393×852 | `app/onboarding/privacy.tsx`（待加） | 法务页 |

> v3.0 目录结构 `app/onboarding/` 中目前枚举的是 welcome/auth/profile/permissions/plan，**Terms/Privacy 漏列了**——需补到 03_2 文档或合并进 ST-04 设置区。

---

## 2. Home & Memory (`features/home`, `features/memories`, `app/(tabs)/`, `app/memory/`)

| ID | 名称 | 尺寸 | 路由文件 | 备注 |
|---|---|---|---|---|
| `94:349`  | H-01 Home | 393×852 | `app/(tabs)/index.tsx` | avatarRow + highlightRow + StoryCard 主页 |
| `96:384`  | H-02 Add Memory | 393×852 | `app/memory/add.tsx` | 上传/录入 memory |
| `98:452`  | H-03 Memory List | 393×852 | `app/memory/list.tsx` | memory 列表 |
| `102:531` | H-04 Memory Detail | 393×852 | `app/memory/[id].tsx` | 详情默认态 |
| `102:573` | H-04 Memory Detail (Read Only) | 393×852 | 同上（状态变体） | 历史/锁定态 |
| `102:618` | H-04 Memory Detail (Edit Mode) | 393×852 | 同上（编辑态） | 编辑/删除模式 |

---

## 3. Stories (`features/stories`, `app/(tabs)/stories.tsx`, `app/story/[id].tsx`)

| ID | 名称 | 尺寸 | 路由文件 | 备注 |
|---|---|---|---|---|
| `157:1391` | S-01 Stories List | 393×**1077** | `app/(tabs)/stories.tsx` | 比标准长 225px → 多月 monthCard 列表，需上下滚 |
| `157:1446` | S-02 Story Detail | 393×**1394** | `app/story/[id].tsx` | WebView 容器，载入 nestory-web `/story/[id]` |
| `157:1471` | S-02 Story Detail (Share) | 393×**1586** | 同上（分享态） | 多了 share 入口/弹层 |

> S-01/S-02 高度都 >852，意味着滚动区域显著。设计稿这里用长 frame 而不是短 frame + 滚动区，实现时要按 ScrollView/FlatList 处理。

---

## 4. Highlights (`features/highlights`, `app/(tabs)/highlights.tsx`, `app/highlight/[id].tsx`)

| ID | 名称 | 尺寸 | 路由文件 | 备注 |
|---|---|---|---|---|
| `157:2206` | HL-01 Highlights Gallery | 393×852 | `app/(tabs)/highlights.tsx` | gallery |
| `157:2225` | HL-02 Highlight Detail | 393×852 | `app/highlight/[id].tsx` | 详情 |

---

## 5. Settings (`features/profile` + `features/subscription` + `features/children`, `app/settings/`)

| ID | 名称 | 尺寸 | 路由文件 | 备注 |
|---|---|---|---|---|
| `162:856` | ST-01 Settings | 393×**1085** | `app/settings/index.tsx` | 设置主页（长滚） |
| `162:944` | ST-02A Subscription · Free | 393×852 | `app/settings/subscription.tsx` | 免费用户态 |
| `181:967` | ST-02B Subscription · Premium | 393×852 | 同上（状态变体） | 付费用户态 |
| `164:884` | ST-03a Child Profile List | 393×852 | `app/settings/profiles/index.tsx` | 孩子列表 |
| `164:924` | ST-03 Child Profile Edit | 393×852 | `app/settings/profiles/[id].tsx` | 单个孩子编辑 |
| `164:991` | ST-04 Data & Privacy | 393×852 | `app/settings/privacy.tsx` | 数据隐私 |
| `167:924` | ST-05 About | 393×852 | `app/settings/about.tsx` | 关于 |
| `167:956` | ST-06 Feedback | 393×852 | `app/settings/feedback.tsx` | 反馈 |
| `167:980` | ST-07 Account | 393×852 | `app/settings/account.tsx` | 账号 |

---

## 6. Page `01 Design System` 组件总览（canvas `21:2`）

`02 Main UI` 上的屏复用这些原子/分子组件。详细 node ID 见单独的实现期注释，本表只列总数：

### Atoms (`31:18`)
- **Button** ×15（5 type Primary/Secondary/Premium/Text/Destructive × 3 status Default/Pressed/Disabled）
- **Input** ×6（SingleLine/MultiLine × Default/Focused/withContent）
- **Tag** ×3（Selected/Unselected/Disabled）
- **StatusBadge** ×5（Inactive/Active/Warning/Error/**Premium**）
- **Toggle** ×4（On/Off × withText/withoutText）
- **Unit** ×4（Height/Weight × Metric/Imperial）— onboarding 录身高/体重用
- **Filter** ×3（Year / YearMonth-aFew / YearMonth-many）
- **PhotoIndicator** / **Progress Bar**
- **Photo** ×4（AddPlaceholder + Thumbnail × Default/Count/Delete）
- **StatusBar** / **NavBar** ×3（Back&Title / full / BackOnlyforOnboarding）/ **TabBar** ×3（Home / Stories / Highlights）

### Molecules (`31:20`)
- **BottomSheet** / **Loading-Page** / **Abnormal** ×2（Empty / WebIssue） / **Toast** ×3（Success/Warning/Error）
- **HighlightCard** ×4（4:3/3:4 × OneLine/TwoLine）
- **Notify** ×4（Success/Warning/Error/Info）
- **MemoryCard** ×2（Content/Empty）
- **photoCarousel** ×2（Landscape/Portrait）
- **StoryCard** ×7（Current × {Empty/Collecting/Locked/Generating} + History × {Generated/GeneratedLight/NotGenerated}）
- **Modal/Paywall** ×8（A/B/C/D × year/month）

### Image Assets (`52:1289`)
- **Logo** ×2（Image / Image&Text）
- **Home HeroSection BG**（H-01 顶部绿色装饰背景）

---

## 实现优先级建议（基于 1-month launch deadline，2026-04-30 起算）

| 阶段 | 屏组 | 工时（粗估） |
|---|---|---|
| Day 1-2 | O-01 Welcome + O-02 Sign In 精校 + 路由串通 | 1 天 |
| Day 3-5 | O-03 a/b/c + O-04 Notifications + O-05 Plan | 2-3 天 |
| Day 5-7 | H-01 Home + H-02 Add Memory + H-03/H-04 Memory | 2-3 天 |
| Day 7-9 | S-01 Stories + S-02 Story Detail（WebView 壳）| 1.5 天 |
| Day 9-11 | HL-01/02 Highlights | 1.5 天 |
| Day 11-13 | ST-01~07 Settings 全套 | 2 天 |
| Day 13-14 | 像素回扫 + 状态变体 + 字体 | 1.5 天 |

剩余约 14-16 天给后端 + AI Pipeline + Submission。
