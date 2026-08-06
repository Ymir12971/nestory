# Figma 1:1 校准记录 · 2026-08-05

**在线文件：** `wS1hJeZhXMkUnn8YwLtFcv` → 页面 `Nestory-new version` (`731:1269`)
**方法：** 每屏 `get_design_context` 取权威规格（几何 / token / 文案 / 排版）+ `get_screenshot` 目视核对 → 逐项对齐代码。
**范围：** 只校准已实现的屏；刻意偏离（Justin 拍板项）保留并在此登记。

---

## 0. Token 层（先修，避免逐屏返工）

| Token | 旧值（0429 文件） | 新文件定义 | 处理 |
|---|---|---|---|
| `typography.tagBadge` | Inter Medium **12**/16 | Inter Medium **14**/16 | ✅ 已改（影响 17 处调用点，逐模块目视核对） |
| palette primary 50/100/200/300/400/500/700 | — | 完全一致 | ✅ 无需改 |
| `text/*`、`surface/*`、`border/*`、`radius M-10/L-16/Full`、`spacing XS-4/M-12/XXL-24/SafeBtm-34` | — | 完全一致 | ✅ 无需改 |
| `Caption` = Inter 14/16、`ButtonLabel-M` = Manrope Bold 16/22、`Heading2` = Manrope Bold 18/24 | — | 一致 | ✅ |

**文字样式全量核对（Design System `01 Font Family` `46:100`）—— 除 Tag&Badge 外全部一致：**

| 样式 | 新文件 | `typography.ts` | |
|---|---|---|---|
| Heading1 | Manrope Bold 28/38 | `h1` | ✅ |
| Heading2 | Manrope Bold 18/24 | `h2` | ✅ |
| Heading3 | Manrope SemiBold 16/22 | `h3` | ✅ |
| Heading4 | Manrope SemiBold 14/20 | `h4` | ✅ |
| Body | Inter Regular 16/20 | `body` | ✅ |
| Caption | Inter Regular 14/16 | `caption` | ✅ |
| ButtonLabel-M | Manrope Bold 16/22 | `buttonLabelM` | ✅ |
| ButtonLabel-S | Manrope SemiBold 14/20 | `buttonLabelS` | ✅ |
| Tag&Badge | Inter Medium **14**/16 | `tagBadge` 12/16 | ✅ 已修 |

---

## 0.1 DS Button（`Design System · 02 Atoms · Button` `47:475`）— 新增 `shared/components/Button.tsx`

**这是全局性发现：** 稿中主按钮是**绿色渐变 + 2px 浅绿描边**的胶囊，而代码里各屏手写按钮，多数是 `surface.brand` 纯色填充（15 处），渐变写法又各不相同（19 个文件各写一遍）。已按稿 1:1 落成共享组件，6 type × 3 state：

| type | 尺寸 | Default | Pressed | Disabled |
|---|---|---|---|---|
| `primary` | 52h ×353 | 渐变 primary/500→400 + **2px primary/50** | 渐变 primary/600→500，无描边 | `surface/disabled` + `text/disabled` |
| `secondary` | 52h ×353 | 白底 + 1px `border/brand`，`text/brand` | primary/50 底 + 1px `border/brand` | `surface/disabled` + 1px `border/disabled` |
| `premium` | 52h ×353 | 渐变 accent/400→300 + **2px accent/50**，`text/premium` | 渐变 accent/600→500，无描边 | 同上 |
| `small` | 36h minW72 px16 | 同 primary 渐变 + 2px 描边 | 同 primary pressed | 同上 |
| `text` | 40h px8 | 无填充，`text/brand`（文案 "Skip"） | 同 | `text/disabled` |
| `destructive` | 40h px8 | 无填充，`text/error`（文案 "Delete"） | 同 | `text/disabled` |

- 所有 type 共用 `ButtonLabel-M`（Manrope Bold 16/22）+ 全圆角。
- `Status=Pressed` 已接真实按压态，稿里的按下渐变自动生效。
- 353 = 393 − 20×2，因此在 20px 页边距容器内 `alignSelf: stretch` 即等价。
- **后续每个模块校准时，把手写按钮逐屏换成此组件**（Welcome 已换）。

## 0.2 其余已落成的共享原子

| 组件 | Figma | 关键点（与原手写实现的差异） |
|---|---|---|
| [NavBar.tsx](../../apps/nestory-mobile/shared/components/NavBar.tsx) | `48:760` | 行高 56、**px 20（各屏原来写 24）**；标题在返回箭头右侧 **gap 16 左对齐**（原来是 space-between 挤到居中）；4 种 type 用「左组 + 右槽 + 可选进度条」一套布局覆盖；进度条 px 24、w353、h4、gap 6、`surface/brand` / `border/default` |
| [Tag.tsx](../../apps/nestory-mobile/shared/components/Tag.tsx) | `48:698` | px12 py6 全圆角，Tag&Badge 14/16；selected=`surface/brand`+白字；unselected=`surface/brand-subtle`+1px `border/default`+`text/primary`；disabled=`surface/disabled`+1px `border/disabled` |
| [StatusBadge.tsx](../../apps/nestory-mobile/shared/components/StatusBadge.tsx) | `48:699` | px12 py4，5 型：inactive=`surface/muted`+`text/disabled`；active=success-subtle+`text/success`；warning / error / premium 同理配对 |
| [Input.tsx](../../apps/nestory-mobile/shared/components/Input.tsx) | `34:18` | radius **6**、px16、Body 16/20；SingleLine h48、MultiLine minH88 py12；**边框按态变**：空=`border/default`、聚焦=`border/brand`、**有内容=`border/strong`**（易错点）、禁用=`border/disabled`+`surface/disabled` |
| [Toggle.tsx](../../apps/nestory-mobile/shared/components/Toggle.tsx) | `48:737` | 51×31、旋钮 27；**关态轨道是 `primary/50` 浅绿 + 1px `border/default`**（不是 iOS 灰，所以自绘而非用 RN `Switch`）；开态 `surface/brand` + `neutral/50` 旋钮 |
| [BottomSheet.tsx](../../apps/nestory-mobile/shared/components/BottomSheet.tsx) | `775:2297` 等 | 遮罩 **rgba(0,0,0,0.35)**（原 0.45）；面板 **`surface/card` 白**（原 `surface/default`）；handle 行高 28、条 **36×4** radius 3 `border/default`（原 40×4 `border/strong`）；pb SafeBtm-34；顶部圆角 16；投影 0 -4px 6px rgba(0,0,0,.08)。配套 `sheetSection.title/body/cta`（title·body = px20 py16；cta = px20 py8 gap16） |

> 待补原子：TabBar `48:825`、Toast `329:48`、Notify `48:697`、MemoryCard `290:2523`、**StoryCard 8 变体 `48:680`**、Filter/Year `49:893`、Photo 5 变体 `48:700`、Unit `173:1028`、Checkbox `819:3389`、Progress Bar `40:16`、PhotoIndicator `49:891`、Loading/Page `45:174`、Abnormal `290:2562`、photoCarousel `510:1484`。

---

## 附录：页面 node ID 全量清单（`Nestory-new version` 731:1269）

**Onboarding：** O-Launch `739:1985` · O-Launch(transition) `739:2032` · Welcome-1 `739:1085` · Welcome-2 `739:1104` · Sign In `739:1134` · Privacy claim `752:1639` · Child basic info `739:1155` / filled `739:1176` · Birthday Confirm `739:1224` · Child more Details `739:1256` / filled `739:1282` · Children list(one) `750:2581` / (more) `751:1334` · Relationship `751:1396` / (custom) `752:1570` · Notification access `739:1940` · Choose plan(yearly) `739:1406` / (monthly) `758:1219` · Welcome to premium `761:2377` · Terms of Service `739:1547` · Privacy Policy `739:1566`

**Home：** Launch `810:2993` · Sign In `810:3006` · Home Empty `731:1270` · Home Empty-Multiple Children `733:1178` · First Memory `731:1304` · Normal Memory list `731:1370` · Current month empty `731:2572` · Add Memory Popup `742:2985` · Add Memory page Empty `742:3144` · Add from "Just a note" `741:2053` · Add from "Take a photo"/album `742:3081` · New Memory Added `762:3341` · View Memory `741:2133` · NoPremium request to edit `744:3627` · Memory Edit Alert `745:1252` · Edit Memory Page `743:4822` · full picture `774:4717` · Memories couldn't load `774:3710`

**Stories：** Story Empty `821:1534` · First Story Generating `731:1547` · No Memory to generate `731:3280` · Normal Generation `731:1515` · Normal Generation 2 `731:1569` · Free quota used/Premium Ended `731:3218` · Premium recovered `731:3426` · Past months folded `731:3602` · Over one year `731:3336` · Regeneration allowed `761:2628` · Regeneration confirm `761:2717` · Stories couldn't load `774:3769`

**Settings：** Settings(free) `768:4581` · Settings(premium) `731:2891` · feedback `768:4295` · Current plan(Free) `764:3775` · Current plan(Premium) `764:3844` · Plan cancelled `771:3205` · Child Profile Edit(premium) `769:2306` / (free) `769:2487` · Data & Privacy `770:2563` · About `770:2583` · Account `770:2604`

**Global：** Paywall `775:1819` · Welcome to premium `771:3311`

---

## 3. 已校准（续 §1）

### O-Sign In `739:1134` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 渐变 | 无 stop 位置 | `40.9deg, primary/600 3.73% → primary/400 75.07%`（左下 → 右上） | ✅ |
| 顶部状态栏区底色 | 绿（渐变透出） | `surface/default` 奶白，与下方面板连成一块 | ✅ |
| 奶白面板 | 高度自适应，px16 | **定高 330**（+安全区），px **20**，overflow hidden | ✅ |
| Hero 图圆角 | radius/m 10 | 无圆角（由面板裁切） | ✅ |
| body 下边距 | 无 | pb 24 | ✅ |
| 按钮组 | pt16 gap8 | pt **24** gap **12** | ✅ |
| Apple / Google 图标 | 22 / 20 | 均 **24** | ✅ |
| 底部安全区 | SafeAreaView + pb34（双算） | pb = max(inset, 34) | ✅ |
| 按钮本体 290×52 + 1px `border/brand` + `surface/default` 底 | — | 一致 | ✅ 无需改 |

**刻意保留：** 邮箱 + 密码登录区（分隔线、两个输入框、Sign in with Email）稿中没有，是为无 GMS 设备/大陆用户加的可用路径，保留。

### O-Privacy claim `752:1639` — ✅ 重写

原实现把三条承诺做成了**白底卡片 + 44px 圆形图标底托**，稿里没有卡片：

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 顶部 128×128 盾牌图块 | **整块缺失** | `surface/brand-subtle` 底、radius/l、内含 72px `shield-check-line`（`#23AB65`） | ✅ 补上 |
| 承诺行 | 卡片（1px 边 + radius/l + padding16）+ 圆形图标托 | 纯 **24px 图标 + 文字**，行内 gap **4**，列表 gap **24** | ✅ |
| 图标 | lock-2 / shield-check / hand-heart | lock-2 / **error-warning** / **price-tag-3** | ✅ |
| 承诺标题 | `h4`（14/20）深色 | Manrope **SemiBold 16/22**、**品牌绿 `#177a48`**，与正文同段落流 | ✅ |
| 主标题 | 全深色 | "Privacy " 用 `text/brand` 绿，其余深色 | ✅ |
| 标题区 | pt48 gap10 | py **16** gap **6** | ✅ |
| CTA | 渐变无描边、pt12 | DS Primary（含 2px 环）、pt **16** | ✅ |

### O-Child basic info `739:1155` + Birthday Confirm `739:1224` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 进度条段数 | **5** 段 | **3** 段（basic → details → relationship） | ✅ |
| NavBar 内边距 | px 24 | px **20** | ✅ 换共享 NavBar |
| 头像圈 | 无描边 | 1px `#a6ecbf`（primary/200）描边 | ✅ |
| 相机图标 | 右下角**绿色实心圆底托** + 20px 白图标 | **居中 40px** `#23AB65` 相机字形，无底托 | ✅ |
| "Tap to add a photo" | Manrope **Medium** 16 | DS Text 按钮标签 = Manrope **Bold** 16/22 | ✅ |
| 字段标签间距 | gap 8 | gap **6** | ✅ |
| 生日行边框 | `border/default` | **`border/strong`** | ✅ |
| 禁用态 CTA | 保留 2px 环、标签用 `text/hint` | 无环、标签 `text/disabled` | ✅（换共享 Button） |
| 确认弹窗正文 | `text/secondary`、lineHeight 22 | Body 16/20 **`text/primary`** | ✅ |
| 确认弹窗结构 | 自绘 Modal（遮罩 .45、白奶底、handle 40×4） | DS BottomSheet（.35 遮罩、白底、36×4 handle、title/body/cta 分区） | ✅ |
| "Back to edit" | 自绘 44 高文字按钮 | DS Text 按钮（稿内实例 44 高） | ✅ |

**待确认：** 稿里 onboarding NavBar 右侧带一个 `share-line` 图标（`739:1157` 内的 DS 默认槽位），onboarding 分享无实际语义，判断为设计稿遗留，实现里留空 24px 占位。

### 进度条语义（重要修正）

原实现是 **5 段、按 `step+1` 递增**。逐屏核对实例后确认：**共 3 段，对应 onboarding 三个阶段**，不是表单内步骤——

| 屏 | 稿中填充 |
|---|---|
| O-Child basic info `739:1157` / more Details `739:1258` / Relationship `816:3347` | **1 / 3**（三屏都只填第 1 段） |
| O-Notification access `739:1942` | **2 / 3** |
| O-Choose plan | 预期 3 / 3（待该屏校准时确认） |

### O-Child more Details `739:1256` + O-Relationship `751:1396` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 标题/副标题间距 | 6 | **12**（basic info 才是 6） | ✅ |
| 标题区 → 表单区 | gap 24 | **32**（title pb16 + body pt16） | ✅ |
| 字段组之间 | gap 20 | **32** | ✅ |
| 字段标签 → 控件 | gap 8 | 8 ✓（此屏是 8，basic info 是 6） | ✅ |
| 性别/称谓 tag | DS 默认尺寸（px12 py6 + Tag&Badge 14/16） | **px16 py8 + Body 16/20**（两屏都用加大号实例） | ✅ |
| tag 行间距 | 8 | **16** | ✅ |
| Relationship 布局 | 8 个 tag 一起 wrap + 下方通栏输入框 | 6 个亲属 tag wrap → "Prefer not to say" 独占一行 → **"Other..." 与输入框同行**（gap 16，输入框 flex-1） | ✅ |
| Other 输入框禁用态 | `surface/default` 底、无边框变化 | `surface/disabled` 底 + `border/disabled` 边 | ✅ |
| Other 输入框 placeholder | "Tell us who you are" | **"e.g. Nana"** | ✅ |
| 单位切换胶囊 | 标签宽度自适应（cm↔ft 会挤动箭头） | 标签固定 **32 宽**槽位（`193:1382`），py6 | ✅（含 `HeightInput`） |
| Skip 按钮高度 | 44 | **40**（DS Text 按钮） | ✅ |
| CTA 上边距 | 统一 16 | basic info 16、后两屏 **12** | ✅ |
| 单位输入框边框 `border/strong`、胶囊 `surface/brand-subtle` px8 py4、单位标签 Manrope Bold 18/24 | — | 一致 | ✅ 无需改 |

### O-Notification access `739:1940` — ✅ 重写主体

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 进度条 | 5 段填 4 | **3 段填 2** | ✅ |
| 示意区 | 单张白底卡（radius/l、padding16、投影） | **上下两块**：128×128 应用图标砖（`primary/50` 底、**radius 24**）+ **红色角标**（`#ff5757` 30×30、top -9 / left 107、Inter Bold 16/20 白色 "1"）；下方通知行 `primary/50` 底、radius **10**、padding **10**、gap 10、**无投影** | ✅ |
| 通知行图标 | 40×40 绿底 + 白色 `book-open-fill` | 40×40 **`surface/default` 底、radius 8**，内嵌 app logo | ✅ |
| 通知行文案 | 上 "Nestory" + 下 caption 灰字两行 | **只有一行** Body 16/20 `text/primary`，无 app 名行 | ✅ |
| CTA | 手写渐变 + 44 高 Skip | DS Primary + DS Text（40 高） | ✅ |

---

### O-Children list `750:2581` / `751:1334` — ✅ 重写

| 项 | 原实现 | Figma | |
|---|---|---|---|
| NavBar | **整块缺失** | 有（进度条 1/3，与档案表单同阶段） | ✅ 补上 |
| 孩子列表 | **一整张分组卡 + 分隔线** | **每个孩子一张独立卡**：h72、1px **`border/success #bbf7d0`**、radius/l、卡间距 16 | ✅ |
| 头像 | 48、无描边、`brand-subtle` 底 | **40**、1px `border/strong`、`surface/brand` 底 | ✅ |
| 姓名字号 | `h4`（14/20） | **`h3`（Manrope SemiBold 16/22）** | ✅ |
| 勾选图标 | 22 | 24 | ✅ |
| 添加入口 | 通栏胶囊（h48、1px 实线、`brand-subtle` 底） | **同尺寸卡片**：h72、**2px 虚线 `border/brand`**、白底；内含 40 圆底 `primary/100` + 24 `add-large-line` + Text 按钮文案 | ✅ |
| 添加入口文案 | "Add Another Child" | **"Add another child"** | ✅ |
| "You can add later in Settings" | 在滚动区、`text/hint` | 在 **CTA 区、按钮上方**、`text/secondary` | ✅ |
| 图标名 | `add-line` | `add-large-line` | ✅ |
| 标题间距 | 6 | 12 | ✅ |

### O-Choose plan `739:1406` / `758:1219` — ✅（进度条确认 3/3）

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 卡片圆角 | radius/l 16 | **radius/m 10**（两张卡都是） | ✅ |
| 卡片内距 | padding 16 | **px16 py12** | ✅ |
| Premium 卡描边 | `text/premium` 琥珀色 | **`border/strong` 灰**（琥珀色只用于选中的套餐卡） | ✅ |
| 权益条目 | "•" 文字符号 | **20px `vip-crown-2-line` 图标**（Free 卡同结构，图标为灰） | ✅ |
| Free 卡标题 | 无图标、`text/primary` | **24px `layout-left-2-line`** + 纯黑 | ✅ |
| 卡头图标 | 20 | 24 | ✅ |
| 套餐卡内距/间距 | padding12、gap2 | **px16 py14、gap8**；月付卡定高 **94** 与年付卡对齐 | ✅ |
| 价格字号 | Manrope Bold 22/30 | **`h3` Manrope SemiBold 16/22** | ✅ |
| 选中描边 | 2px `text/premium` | 2px **`border/premium #f59e0b`** | ✅ |
| 未选描边 | 1px `border/default` | 1px **`border/strong`** | ✅ |
| 单选控件 | 自绘圆点 + check-line 12 | **20px `checkbox-circle-fill` / `checkbox-blank-circle-line`** | ✅ |
| "~17% Off" | Caption 14/16 | **`h4` Manrope SemiBold 14/20** | ✅ |
| Premium 按钮 | 渐变 accent/**500→400**、描边 `premiumSubtle` | DS Premium：accent/**400→300** + 2px **`accent/50`** | ✅ |
| "Start with Free" | 通栏 52 高描边按钮 | **DS Text 按钮**（44 高、无填充无描边） | ✅ |
| 法律行 | 独立 footer 区、与正文同段 | 在 **CTA 区内**（gap 12）；"Auto-renews…" 后**换行**，两个链接**带下划线**、`text/brand` | ✅ |

### global-Welcome to premium `771:3311`（= O-Welcome to premium `761:2377`）— ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 顶部渐变卡 | accent/500→400，135° | **accent/400→500，160.79°**（0% → 70.71%） | ✅ |
| 卡内装饰 | 无 | **3 个深琥珀圆斑**：(−42,−49) 140 `#f8aa14`、(285,82) 63 `#f9b21a`、(255,−11) 36 `#f9b21a`，出血裁切 | ✅ 补上 |
| 皇冠图标 | `vip-crown-2-fill` 32 | **`vip-crown-fill` 41** | ✅ |
| "Premium Plan" | Manrope Bold 26/34 | **`h1` 28/38** | ✅ |
| 卡内距 | py32 gap8 | **px16 py20 gap4** | ✅ |
| 明细行数值 | Inter SemiBold 16 | **`h3` Manrope SemiBold 16/22** | ✅ |
| 明细卡 gap | 10 | 12 | ✅ |
| "Auto-renews…" | `text/hint`、左对齐 | **`text/secondary`、居中** | ✅ |
| includedCard | 无描边、padding16、gap12 | **1px `neutral/200`**、px16 **py20**、gap **14** | ✅ |
| 权益图标 | 16、行内居中、gap8 | **20**、**顶对齐**、gap **4** | ✅ |
| CTA | 手写渐变 | DS Premium 按钮 | ✅ |

### O-Terms of Service `739:1547` / O-Privacy Policy `739:1566` — ✅

- NavBar 换共享组件（`Type=Back&Title`：px20、gap16、标题左对齐紧贴箭头；原来 px24 + space-between 把标题挤到居中）。
- 稿中正文**没有卡片容器**，各节直接平铺在页面底色上；原实现套了一层 `surface.muted` 卡片（1px 边 + radius/m + padding16），已去掉。
- 正文 pb 从 24 改为 **SafeBtm-34**。
- 文案保留代码里更完整的占位法务文本（稿里是 "1. Agreement / 2. Accounts…" 纯占位）；按 Handoff，这两页最终会换成 Termly 嵌入 H5。

---

## 5. ⚠️ 需要你拍板：启动页两套规范冲突

`O-Launch Page 739:1985` 与 [docs/delivery/启动页.md](../delivery/启动页.md) 对不上，而现有实现（[SplashScreen.tsx](../../apps/nestory-mobile/features/splash/SplashScreen.tsx)）是**严格按后者做的**（含呼吸动画）。我没有单方面改写，两边参数并列如下：

| 项 | `docs/delivery/启动页.md`（现有实现） | Figma `739:1985` |
|---|---|---|
| Logo | 90×90 | **120×120** |
| 字标 | Manrope **800**、36/36、letter-spacing −0.6、`#1a1a1a` | Manrope **Bold(700)**、**40**、行高 normal、**纯黑** |
| slogan | Inter 14、行高 21、字距 0.15、**`#9ca3af`**、**两行**（moment 后断行）、maxWidth 260 | Inter **16/20**（Body）、**纯黑**、**单行** |
| 三者间距 | logo→字标 26、字标→slogan 11 | 统一 **gap 6** |
| 光晕 | **440** 圆、竖向中心 46%、alpha 0.09↔0.19 + scale 0.95↔1.05 呼吸（2.5s 正弦循环） | **248×250** 椭圆 @(73,330)（中心约 53.4%）、径向渐变 + 高斯模糊、整体 opacity 0.4、**静态** |
| 内容块 | 整体上移（margin-bottom 64） | 定高 793、居中、pb 34 |

`启动页.md` 自称 "complete, self-contained specification / hifi"，还带一个动效 live preview；Figma 那一帧画不出动效，且尺寸明显更粗。**倾向：以 `启动页.md` 为准，把 Figma 那帧当过时稿**——但这是你的决定。确认后我再动（若以 Figma 为准，`O-Launch Page(transition to Home) 739:2032` 与 `H-Launch 810:2993` 一并跟着改）。

---

## 6. Home 模块

### DS 原子规格（本模块用到）

**TabBar `48:825`** — ✅ 已改 [(tabs)/_layout.tsx](../../apps/nestory-mobile/app/(tabs)/_layout.tsx)

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 标签文字 | Inter Medium **12**/16 | **Tag&Badge 14/16** | ✅ |
| Settings 图标 | `settings-3-fill` / `settings-3-line` | **`settings-fill` / `settings-line`** | ✅ |
| 图标→文字间距 | 2 | **4** | ✅ |
| 高度 / 下内距 | 64 + inset、pb = inset + 12 | **pt8 + 44 + SafeBtm-34 = 86**、pb = SafeBtm | ✅ |
| 顶部 1px `border/default` 描边、`surface/default` 底、激活色 `text/brand` | — | 一致 | ✅ |

**MemoryCard `290:2523`**（供逐屏使用的规格）：白底、1px `border/default`、radius/**m 10**、**定高 92**、px**12** py**10**、gap 12、items-start；`withPics` 左侧 Photo **72×72**（radius/m、`neutral/200` 底）带 **countBadge**（右4/上50、h18、`overlay-65` 底、radius 6、px4 gap2、10px `image-line` + **Inter SemiBold 9** 白字）；正文 **Body 16/20** `text/primary`、定高 72、溢出省略。

**Filter `744:2530`**（年月筛选器）：h40 py4 gap8 w353 —— yearSelector（gap2：年份 **H4 Manrope SemiBold 14/20** + 24px `arrow-down-s-line`）+ 1px×20 `border/default` 竖分隔 + monthScrollArea（w**295**、pl4、gap8；选中月 = `surface/brand` 底 + 白字，未选中月 = 白底 + **1px `border/brand`** + **`primary/700`** 字，均 px12 py6 radius full、Tag&Badge 14/16）。

**时间轴（`731:1400`）**：外层 gap16、pb16；每个日期组 gap12；组内 row gap8 items-start —— 左侧竖轨（日期胶囊：`surface/brand-subtle` 底、radius/m、py4、**w35**、居中，日 **H2 18/24** + 月 **Caption 14/16**，均 `text/brand`；下接 **2px 宽** `border/default` 竖线 flex-1）+ 右侧卡片列（flex-1、gap12）。末尾留 **196** 高占位给悬浮 CTA + TabBar。

**Home CTA（`731:1468`）**：`surface/default` 底、px20 py16、**投影 0 -4px 12px rgba(227,227,227,0.5)**；按钮 DS Primary 353×52，文案 **"+ Add Memory"**。

### ⚠️ 需要你拍板：Home 页与 Moment 列表的归属

稿中 **H- 行的四个 Home 态**（`H-Home Empty 731:1270` / `H-First Memory 731:1304` / `H-Normal Memory list 731:1370` / `H-Current month empty 731:2572`）**就是 Home tab 本身**，结构统一为：

> 顶部 header（**只有头像 28×28 + 名字 H2**，多孩子时名字旁加切换按钮）→ 年月 Filter → 日期分组时间轴 → 悬浮 CTA → TabBar

而现在代码是两套：

| | 现状 |
|---|---|
| [HomeScreen.tsx](../../apps/nestory-mobile/features/home/screens/HomeScreen.tsx)（`(tabs)/index`） | 改版前的形态：**Hero 照片轮播 + 圆点指示器 + 右上设置按钮 + 三格 Stats 卡（年龄/身高/体重）+ "N moments this month · View All" 汇总行 + "Did your little one smile today?" 提示语** —— 这些**在新稿 H- 行里全都不存在** |
| [MomentListScreen.tsx](../../apps/nestory-mobile/features/moments/screens/MomentListScreen.tsx)（`/moment/list`） | **已经是新稿的形态**：Filter 栏 + 时间轴 + 左侧日期轨 |

也就是说 P2 阶段把新版 Home 的内容做成了**二级页 `/moment/list`**，而 Home tab 还留着旧壳。要 1:1 就得二选一：

- **方案 A（照稿）**：Home tab 直接变成时间轴（把 MomentListScreen 的内容搬到 `(tabs)/index`），删掉 Hero 轮播 / Stats 卡 / 汇总行 / 提示语，`/moment/list` 退役。
- **方案 B（保留增量）**：承认 Hero + Stats 是稿外自加功能，只把 `/moment/list` 按稿校准，Home tab 维持现状。

我倾向 **A**：新稿 18 个 H- frame 里没有任何一处出现 Hero 轮播或 Stats 卡，且 annotation 明确说"用户点击 Add Memory 进入添加页"、"月份筛选从首条 memory 起算"都是 Home 页行为。但 Stats 卡是早前 Figma annotation（点击跳 ST-03 Edit）留下来的，删它属于产品决策，所以先问。

> **Justin 2026-08-05：选方案 A** —— Home tab 直接变时间轴，删掉 Hero 轮播 / Stats 卡 / 汇总行 / 提示语，`/moment/list` 退役。

### 时间轴本体校准（`MomentListScreen`，方案 A 下即将成为 Home 主体）— ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| Filter 高度 | 无（靠 py4 撑） | **定高 40** | ✅ |
| Filter 内部间距 | gap 12 | **gap 8** | ✅ |
| 年份文字 | `h3`（16/22） | **`h4` Manrope SemiBold 14/20** | ✅ |
| 月份胶囊 py | 4 | **6** | ✅ |
| 月份胶囊文字 | `caption`（Inter **Regular** 14/16） | **`tagBadge`（Inter Medium 14/16）** | ✅ |
| 日期轨 → 卡片列 间距 | 12 | **8** | ✅ |
| 卡片内距 | 只有 px12、内容垂直居中 | px12 **py10**、**items-start** | ✅ |
| 卡片正文区 | 2 行 + **时间行**（"3:45 PM"） | **定高 72 的单一文本块，稿中没有时间行** | ✅ 去掉时间行，正文 3 行 |
| 照片计数角标 | py2（高约 16） | **定高 18** | ✅ |
| 日期轨竖线 | 最后一组不画 | **每组都画**（`731:1435` 末组同样有） | ✅ |
| 年份选择弹窗 | 自绘 Modal（0.45 遮罩、奶白底、40×4 handle） | DS BottomSheet | ✅ |
| 日期胶囊 w35 / radius-m / `brand-subtle` 底 / 日 H2 + 月 Caption 均 `text/brand`、竖线 2px `border/default`、卡片 h92 radius-m 1px `border/default`、照片 72 radius-m、角标 `overlay-65` radius6 px4 gap2 + 10px `image-line` + Inter SemiBold 9 | — | 一致 | ✅ 无需改 |

### 方案 A 施工完成 — ✅

**先修正一处我早前的误读**：`H-Home Empty 731:1270` **确实有 Hero 图**（`HeroSectionBG` 393×480 绝对定位 + 白色状态栏文字 + 白色 32px 大标题 + 白字 avatarRow），只是 `H-First Memory 731:1304` / `H-Normal Memory list 731:1370` **没有**——首条 Moment 之后 Hero 消失，header 变成 `surface/default` 上的普通行。所以 Home 是**两态**，`home-hero-bg.png` 保留。

[HomeScreen.tsx](../../apps/nestory-mobile/features/home/screens/HomeScreen.tsx) 已按此重写：

| 态 | 结构 |
|---|---|
| **空态**（任何月份都没有 Moment，`useAssetMonths` 为空） | header `731:1271`：Hero 图（imageStyle 高 **480**，容器 pb8 + **底部圆角 16** + 裁切）→ 白色大标题 px20 py16、**Manrope Bold 32**、宽 363 → avatarRow px20 **py12**、白字 H2；body `731:1282`：flex-1 居中、px20 **py102**、gap24 →（w**238** gap8：**128×128** `brand-subtle` 圆角砖 + 内嵌 **72px** `camera-4-line` + Body 16/20 **纯黑**文案）+（通栏 gap8：`text/secondary` 提示 + DS Primary "+ Add Memory"） |
| **有 Moment** | header `731:1373`：px20 py16、头像 28×28 **2px `surface/brand` 描边**、名字 H2 深色 → Filter `744:2530` → 时间轴 `731:1400`（末尾 **196** 高占位）→ 悬浮 CTA `731:1468`（`surface/default` 底、px20 py16、**投影 0 -4px 12px rgba(227,227,227,0.5)**、DS Primary "+ Add Memory"） |

**删除**：Hero 照片轮播 + 圆点指示器、右上角 settings 入口、三格 Stats 卡、"N moments this month · View All" 汇总行、"Did your little one smile today?" 提示语。
**退役**：`app/moment/list.tsx` 与 `features/moments/screens/MomentListScreen.tsx` 已删除；`MomentEditScreen` 删除后的跳转从 `/moment/list` 改为 `/`。
**保留并顺带校准**：Profile Switcher / 年份选择两个弹窗改用 DS BottomSheet；Switcher 的升级按钮改用 DS Premium + DS Text 按钮；`currentBadge` 改用 StatusBadge 的 active 配色（`success-subtle` + `text/success`）。

> **待你确认的文案**：稿中空态大标题是 "Turn every moment into a **Memory**"、副文案 "Start with Emma's first **Memory**"。按 Memory→Moment 的全局改名，现在写成 "Turn every moment into a **Moment**" / "…first **Moment**"，读起来略绕（moment→Moment 同词）。要不要换个说法（例如 "Turn every little moment into a Story" 之类）？这是用户第一眼看到的句子，我没自作主张改写。

### H-Add Memory Popup `742:2985` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 弹窗外壳 | 自绘 Modal（0.45 遮罩、`surface/default` 底、40×4 handle） | DS BottomSheet | ✅ |
| 标题 | `h3` **居中** | **`h1` Manrope Bold 28/38、左对齐**，位于 px16 py16 区块 | ✅ |
| 选项容器 | 裸行（h52、px8） | **白底卡**（1px `border/default`、radius **16**），外层 px16 py16 | ✅ |
| 选项行 | h52、图标 22 `text/brand`、无右箭头 | h **56**、px16 gap12、图标 **24 `text/primary`**、**右侧 20→24px `arrow-right-s-line`**（`#a3a3a3` = `text/hint`） | ✅ |
| 图标名 | note=`quill-pen-line`、album=`image-line` | note=**`t-box-line`**、album=**`multi-image-line`** | ✅ |
| 文案 | "Just a Note" / "Choose from Album" | "**Just a note**" / "**Choose from album**" | ✅ |
| Cancel 行 | 有 | 稿中无（点遮罩关闭） | ✅ 去掉 |

**保留的刻意偏离**：稿与 annotation 都**只画了 2 项**（Just a note / Choose from album），第 3 项 "Take a photo" 是你 2026-07-15 的决策，走 `ADD_MOMENT_ENTRY_OPTIONS` 配置，保留。

### H-Add Memory page `742:3144`（空态）/ `742:3081`（有照片）— ✅ 结构性改动

| 项 | 原实现 | Figma | |
|---|---|---|---|
| **Save 按钮位置** | **底部通栏 52 高 CTA** | **NavBar 右槽的 DS Small 按钮**（36 高、minW72、px16；禁用态 `surface/disabled` + `text/disabled`） | ✅ |
| NavBar | 自绘、标题 "New Moment"、`h3`、返回图标 `arrow-left-line` | 共享 NavBar `Type=withButton`、标题 **"Add Memory"** `h2`、图标 **`arrow-left-s-line`** | ✅ |
| **元素顺序** | 照片 → 文本框 → 明细 | **文本框 → 照片 → 明细** | ✅ |
| 照片区 | 横向滚动条、72 缩略图、虚线加号框 | **3 列网格、单元 107×107、双向 gap 16**（353 = 3×107 + 2×16 精确）、加号框 **1.5px 实线** `border/default` + **36px** `add-large-line` | ✅ |
| 删除角标 | 18×18 圆、在缩略图**外侧** (-6,-6)、close 图标 12 | **24×24** `overlay-65` 圆、在单元**内部** (79,4)、close **24** | ✅ |
| 文本框 | 定高 160、常驻 `border/strong` | 定高 **144**、**空态 `border/default` / 有内容 `border/strong`**（DS Input 态规则） | ✅ |
| 文本框 placeholder | "What happened today…" | **"A quick note about {名字}'s day."** | ✅ |
| 明细卡圆角 | radius/l 16 | **radius/m 10** | ✅ |
| 明细行内距 | py12 minHeight46 | **py14** | ✅ |
| 明细行标签 | Body 16/20 | Body 16/**22** | ✅ |
| 明细行取值 | Body 16/20 | **Caption 14/16** | ✅ |
| 明细右侧 gap / 箭头色 | 4 / `text/secondary` | **6** / `text/hint` | ✅ |
| 日期行文案 | "Date & Time" | **"Memory Date"** | ✅ |
| Tag 多选显示 | 前 3 个 chip + "+N more" | 首个 + **"+X"**（annotation 规则） | ✅ |

**待你确认**：稿的 detailsList **只有 "Memory Date" 一行，没有 Tags 行**（空态、有照片两个变体都没有），但 annotation 明确写了 Tags 的显示规则、且 TagPickerSheet / `moment/tags.tsx` 是已上线功能（WorkPlan §3 写"Tag 保留"）。我**保留了 Tags 行**并按 annotation 的"首个 +X"规则显示。若稿才是最新意图，说一声我把 Tags 行摘掉。

### H-View Memory `741:2133` — ✅ 结构性改动

| 项 | 原实现 | Figma | |
|---|---|---|---|
| NavBar | 自绘、标题 "Moment"、`h3`、`arrow-left-line`、Edit 是裸文字（Manrope **Medium**） | 共享 NavBar `withButton`、标题 **"Memory"** `h2`、`arrow-left-s-line`、Edit 是 **DS Text 按钮**（36 高、ButtonLabel-M `text/brand`） | ✅ |
| **照片展示** | **横向轮播**（225×300 大图 + 圆点指示器） | **3 列 107×107 网格、gap 16**（与 Add 页同一套） | ✅ |
| **元素顺序** | 照片 → 正文 → tags → 时间 | **正文 → 照片 → 时间** | ✅ |
| body 内距 | px20 pt12、pb20 | px20 **pt16 pb34**、gap 16 | ✅ |
| 时间行 | 图标 16 + Caption、gap 4 | 一致，gap **6** | ✅ |
| 正文全文不截断 | ✓ | ✓ | ✅ 无需改 |

Tags 行同 Add 页：稿中未画、annotation 有，**保留**。点照片进全屏查看器的行为保持（annotation：仅查看态可进大图）。

### H-NoPremium request to edit `744:3627` / H-Memory Edit Alert `745:1252` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 弹窗外壳 | 自绘 Modal（0.45 遮罩、40×4 `border/strong` handle） | DS BottomSheet（36×4 `border/default` handle） | ✅ |
| 标题字号 | Manrope Bold **24/32** | **`h1` 28/38** | ✅ |
| 正文颜色 | `text/secondary`、lineHeight 22 | **`text/primary`**、20 | ✅ |
| 正文换行 | 单段连排 | 稿中分两段；Premium 版两段之间**空一行** | ✅ |
| Premium 版主按钮文案 | "Continue to Edit" | **"OK"** | ✅ |
| 按钮 | 手写渐变（Free 用 accent/500→400） | DS Premium（accent/**400→300**）/ DS Primary + DS Text ×2（40 高） | ✅ |
| Cancel 颜色 | `text/secondary` | **`text/brand`** | ✅ |
| 分区内距 | 统一 gap12 | title·body **px20 py16**、cta **px20 py8 gap16** | ✅ |

### H-Edit Memory Page `743:4822` — ✅ 结构性改动

与 Add 页同构，差异点：

| 项 | 原实现 | Figma | |
|---|---|---|---|
| **Save 位置** | 底部通栏 52 高 "Save Changes" | **NavBar 右槽 DS Small "Save"** | ✅ |
| NavBar | 自绘、标题 "Edit Moment"、`h3`、`arrow-left-line` | 共享 NavBar、标题 **"Edit Memory"** `h2`、`arrow-left-s-line` | ✅ |
| **底部区** | Save + Delete 两个按钮 | **只有 "Delete Memory"**（DS Destructive、44 高、`text/error`）；区块 px20 **pt4** pb34 gap8 | ✅ |
| **删除二次确认** | **缺失**（点 Delete 直接删） | annotation 要求先弹 `H-04 / Sheet · Delete Memory Confirm` | ✅ 补上（标题 "Delete this memory?" + 正文 "This can't be undone…" 照 annotation 原文） |
| 元素顺序 / 照片网格 / 文本框 / 明细卡 | 同 Add 页的旧写法 | 同 Add 页新规格（note → 107 三列网格 → 明细，py14、Caption 取值、radius/m） | ✅ |
| 日期行文案 | "Date" | **"Memory Date"** | ✅ |

**待你确认**：删除确认弹窗的 CTA 在稿里是 annotation 内嵌实例，我没拿到它的按钮规格，暂按「DS Destructive "Delete Memory" + DS Text "Cancel"」实现。若那个 sheet 里其实是通栏红底主按钮，说一声我改。

### H-full picture `774:4717` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 页码指示 | 顶部 **"1 / 5" 文字计数**（黑底胶囊） | **底部 DS PhotoIndicator**（`49:891`）：行内 gap 8 居中；当前页 **18×6** radius/s **`text/brand`** 实心；其余 **6×6** radius/s **1px `border/strong`** 描边空心 | ✅ |
| 黑底、左右翻页、点图关闭 | ✓ | ✓ | ✅ 无需改 |

**保留的刻意偏离**：稿中这一帧**没有画关闭按钮**（只有状态栏 + 图片区 + 指示器），实现保留右上角关闭按钮——否则只能靠点图关闭。

### H-Memories couldn't load `774:3710` — ✅

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 失败态形态 | 两行纯文字（"Your moments couldn't load." + "Pull down to refresh"） | **DS Abnormal · Type=WebIssue**（`774:3808`）：宽 **300**、p **24**、gap **20**、居中 —— **48px 图标** + 文本块（gap 8）：标题 **Body 16/20 `text/primary`** + 说明 **Caption 14/16 `text/secondary`** | ✅ |
| 文案 | 同上 | **"Memories couldn't load"** / **"Check your connection and try again."** | ✅ |
| 顶部 header | 无分隔线，且 Filter 仍显示 | header 带 **1px `border/default` 下边线**，**失败态不显示 Filter** | ✅ |
| 下拉刷新 | ✓ | annotation 要求 | ✅ 保留 |

**图标替换**：稿用 `global-off-line`，当前 `react-native-remix-icon` 版本类型里没有这个名字，改用语义等价的 `wifi-off-line`。要精确一致需升级 icon 包或内联该 SVG。

### H-Current month empty `731:2572` — ✅

原实现只有一行 "No moments this month yet."。稿里当月空态是**与首启空态同一套相机砖**，放在**时间轴区域内**（Filter 栏仍显示）：

- 块宽 **238**、gap **8**、居中：128×128 `brand-subtle` radius/l 砖 + 内嵌 72px `camera-4-line` → 标题 **"Anything to keep this month?"**（Body 16/20 **纯黑**）→ 副文案 **"A photo or a quick note :)"**（Body 16/20 `text/secondary` 居中）
- 悬浮 CTA 与 TabBar 照常显示

### DS Toast `329:48` — ✅ 全局重做（含设计师 annotation）

**这条 annotation 是关键**：Toast 要**在屏幕正中出现、停留 2 秒后自动消失，三种状态的位置与时长完全一致**。原实现是**顶部深色 snackbar**（饱和绿/红/琥珀底 + 白字 + 18px 图标 + 3.2 秒）。

| 项 | 原实现 | Figma | |
|---|---|---|---|
| 位置 | 顶部贴安全区 | **屏幕正中** | ✅ |
| 时长 | 3200ms | **2000ms** | ✅ |
| 形态 | 横向 snackbar（图标 + 文字一行） | **竖向卡片**：宽 **276**（max 300）、p **24**、radius/**m 10**、1px 边、gap **16**、内容居中 | ✅ |
| 配色 | 饱和底 + 白字（#16a34a / #dc2626 / #d97706） | ***-subtle 底 + 同族 border + 同族文字***：success = `success-subtle`/`border/success`/`text/success`，warning、error 同理 | ✅ |
| 图标 | 18px（`check-line` / `error-warning-line` / `alert-line`） | **48px**（**`checkbox-circle-line`** / `error-warning-line` / **`spam-3-line`**） | ✅ |
| 文案 | Manrope Medium 14/20 | **Body Inter 16/20 居中** | ✅ |

`info` 态稿中没有（DS 只有 Success/Warning/Error），沿用同一配方 + `info-*` token（与 Notify 的 Info 型一致）。这条改动同时修正了 Add Memory 成功提示、500 字超限警告、支付失败、登录失败等所有 toast 调用点。

### Home 模块余下待做
- [ ] `H-First Memory 731:1304`（首条 Moment 态，与 Normal list 同构，需确认是否有差异）
- [ ] `H-Add from "Just a note" 741:2053`（键盘态，检查是否有额外差异）
- [ ] `H-Home Empty-Multiple Children 733:1178` + Profile Switcher Free/Premium 两弹窗逐项核对

---

## 1. Onboarding

### O-Welcome-1 `739:1085` / O-Welcome-2 `739:1104` — ✅ 已校准

实现方式改为 **393×852 画布 + 绝对定位 + K=SCREEN_W/393 等比缩放**（手机长宽比几乎一致：393/852 = 430/932），CTA 底部吸附。

| 项 | 原实现 | Figma | 已修 |
|---|---|---|---|
| 背景渐变 | primary 400→500→600，对角 | `213.49deg, primary/300 14.88% → primary/700 91.68%`（两档） | ✅ |
| MomentCard 底色 | `surface.card` 白 | `surface/success-subtle #f0fdf4` | ✅ |
| MomentCard 描边 | 无 | 1px `border/default` | ✅ |
| MomentCard 圆角 / padding / gap | 12 / 10 / 6 | 16 / 12·10 / 12 | ✅ |
| MomentCard 阴影 | 有（0.14） | 无 | ✅ 移除 |
| 卡内照片高度 | 统一 108（带 tag 144） | 逐卡 **120 / 160 / 90** | ✅ |
| 照片圆角 | 8 | 10 (`radius/m`) | ✅ |
| caption | Inter 11/15 | Inter **14/16** `text/primary`，宽 122，首卡截 3 行 | ✅ |
| Tag "First Step" | 底色 primary50 + 边 primary200，11 Medium | **透明底** + 1px `border/brand`，Inter **Bold 14**/16，`text/brand`，px12 py6 | ✅ |
| 主按钮 | 半透明白底 + 1.5px 白边 | **primary/500→400 横向渐变** + **2px `primary/50`** 边，Manrope Bold 16/22 | ✅ |
| W1 主文案 | Inter 14/21 + Manrope Bold 34/42，primary100 | Manrope **Regular 24/32** + **Bold 32/48**，均白色，宽 165 | ✅ |
| W1 插画 | flex 流内 contain | 绝对 (0,231) 226×542 cover | ✅ |
| W2 卡宽 | `SCREEN_W-48` = 345（溢出容器） | **312** @ (40,162) | ✅ |
| W2 卡描边 / gap / 阴影 | 无边 / 12 / 重阴影 | 1px `border/default` / **16** / 无阴影 | ✅ |
| W2 月份胶囊 | Inter 12/16，px10 | **Manrope Bold 18/24**（Heading2），px12 py4 | ✅ |
| W2 5 点指示器 | primary**200** | `#d1f5de` = primary**100** | ✅ |
| W2 照片区 | 3×2 等高网格 h80 | **3 列 masonry**：列 x=0/88/202，宽 78/104/78；行 y=0 与 89（左列 115）；尺寸 78×104 / 104×78 / 78×78 / 78×78 / 104×104 / 78×104 | ✅ |
| W2 正文 | Inter 13/18 `text.secondary` | Inter **14/16** `text/primary`，定高 88 溢出隐藏 | ✅ |
| W2 "54 moments" | Inter 13/18 `text.hint` | Inter **14/16** `text/secondary` | ✅ |
| W2 叠影卡 | 半透明白 rgba(.45/.28)，尺寸自估 | **#d9fae6** (80,114) 234×190 / **#bfe9d0** (56,138) 282×228，圆角 16 | ✅ |
| W2 同心圆装饰 | 缺失 | (87,545) 586×586，三环 r=153/225/288，`#41A86F` 10px 描边 @20% | ✅ 补上 |

**保留的刻意偏离：**
- W1 右侧卡列 Figma 在 y=-16（贴顶出血），实现改为从安全区下沿开始（Justin 2026-07-27，避免被状态栏压住）。
- 文案术语 Memory → Moment（Justin 2026-07-27）：`kept as Moment` / `Every moment, woven into a Story` / `54 moments`。

---

## 2. 待办（按模块）

- [ ] Onboarding 余下 12 屏：Launch ×3、Sign In、Privacy claim、Child basic info(+filled)、Birthday confirm、More details(+filled)、Children list ×2、Relationship(+custom)、Notification access、Choose plan ×2、Welcome to premium、ToS/Privacy
- [ ] Home / Moment 15 屏
- [ ] Stories 11 屏
- [ ] Settings 9 屏
- [ ] Global：Paywall、Welcome to premium
