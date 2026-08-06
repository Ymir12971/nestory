# Nestory 新版设计重实现 · 施工文档

| 项目 | 内容 |
|---|---|
| **文档版本** | v1.0 |
| **日期** | 2026-07-15 |
| **分支** | `design-update`(基于 main `c8c1d66`) |
| **设计依据** | Figma `wS1hJeZhXMkUnn8YwLtFcv` 页面 `Nestory-new version`(731:1269)+ `Nestory_Handoff_v1.0.md` |
| **决策依据** | `annotations-extracted.md` 决策记录 1-7(Justin 拍板,2026-07-15) |
| **范围** | 客户端 UI(Handoff 约定);后端牵连项单列 §6,另行排期 |

---

## 1. 总体变化(一屏读懂)

| # | 变化 | 影响面 |
|---|---|---|
| 1 | **Highlight 功能整体删除** | 18 个文件、1 个 tab、2 条路由、API hooks |
| 2 | **Tab 4 → 3**(Home / Stories / Settings) | tab 布局 |
| 3 | **无平台 Trial**;Free 配额语义 = "试用体验",用尽显示 "(Trial ended)" | Plan 选择、Paywall、订阅文案 |
| 4 | **Paywall 从 A/B/C/D 四变体 → 单一 global-Paywall**(权益 + 套餐选择) | PaywallModal 重写,所有触发点收敛 |
| 5 | **Moment:文字必填、照片选填(≤9)**;新增 "Just a Note" 入口 | Add/Edit 屏、API 校验(已落 productConfig) |
| 6 | **过往月 Moment:Premium 可编辑**(旧规则:人人只读) | Detail/Edit 屏 + 2 个新弹窗 |
| 7 | **Story Regenerate(Premium 专属,全新)** | Stories 卡片 + 确认弹窗 + 后端 |
| 8 | **Stories 页重构**:年份筛选、8 态卡片、Paused 折叠 | StoriesScreen 大改 |
| 9 | **Onboarding 全新流程**(19 屏,新增 Relationship / Children list / 单位切换等) | onboarding 全模块 |
| 10 | **Settings 扩充**:10% off 反馈计划、两步取消流、DELETE 删号确认 | settings 全模块 |

**不变**:Story 详情 H5(WebView,S-02)与 storyGen 后端流水线——与本次解耦,main 上的 storyGen v3 脚手架继续有效。

---

## 2. 逐屏映射 · 现有代码 → 新设计

图例:**改** = 改造现有;**新** = 新建;**删** = 移除;工作量 S/M/L。

### 2.1 Onboarding(O- 行,19 屏)

| 新设计屏 | 现有代码 | 动作 | 量 | 要点 |
|---|---|---|---|---|
| O-Launch Page(×2 场景) | `features/splash/SplashScreen` | 改 | S | 首启 + 每次启动共用;含 O-Launch(transition to Home) |
| O-Welcome-1 / -2 | `onboarding/WelcomeScreen` | 改 | M | 拆成两页,Next → Enter Nestory |
| O-Sign In | `auth/SignInScreen` | 改 | S | 仅 Apple/Google;失败 toast 2s |
| O-Privacy claim | `onboarding/PrivacyScreen` | 改 | S | 静态承诺页,唯一 CTA |
| O-Child basic info(+filled) | `onboarding/ChildProfileScreen` | 改 | M | 头像/名/生日必填才激活;生日默认当天,上限当天 |
| O-Birthday Confirm popup | — | 新 | S | 确认生日 sheet |
| O-Child more Details(+filled) | —(部分逻辑在 ChildProfileScreen) | 新 | M | 全选填,Continue/Skip;**cm↔ft+in、kg↔lbs 切换**(复用 `HeightInput`,DS `Unit` 组件) |
| O-Relationship(+custom) | — | 新 | M | 必填;Other → 输入框激活;切回预设则禁用但保留数据;**Add Another Child 循环不再询问,默认亲子**(决策 Q1) |
| O-Children list(one / multi) | — | 新 | M | 标题随孩子数变化;Add Another Child 循环 basic info + more details;年龄三档缩写 |
| O-Notification access | `onboarding/NotificationsScreen` | 改 | S | 开了才前进,不开留在原页 |
| O-Choose plan(yearly / monthly) | `onboarding/PlanScreen` | 改 | M | 默认年付 $100(~17% Off);**无 Trial 文案**;支付失败 toast |
| O-Welcome to premium | — | 新 | S | 与 global-Welcome to premium 同一组件 |
| O-Terms of Service / O-Privacy Policy | `onboarding/TermsScreen` + `settings/privacy` | 改 | S | Termly 嵌入 H5,双入口复用 |

### 2.2 Home(H- 行,18 屏)

| 新设计屏 | 现有代码 | 动作 | 量 | 要点 |
|---|---|---|---|---|
| H-Home Empty(+Multiple Children) | `home/HomeScreen` | 改 | L | 多孩子头像旁切换按钮;空态文案 |
| H-Sheet · Profile Switcher(Free / Premium) | — | 新 | M | Free:列表只读 + 金色 Upgrade + View benefits 链;Premium:可切换,Stories 跟随;徽标 Active/Current 照稿(决策 7) |
| H-First Moment / Normal list / Current month empty | `home/HomeScreen` + `moments/MomentListScreen` | 改 | L | **月份 filter 从首条 Moment 月起算**;当前月恒最左;无 moment 过往月不显示 filter;当月空态卡 |
| H-Add Moment Popup | `shared/PhotoSourceSheet` | 改 | S | 3 项:Just a Note / Take a photo / Choose from Album(`ADD_MOMENT_ENTRY_OPTIONS`) |
| H-Add Moment page(空态 + 3 入口变体) | `moments/AddMomentScreen` | 改 | M | **文字必填才激活 Save**(`textRequiredToSave`);照片 ≤9;Just a Note 直接弹键盘;500 字符超限 toast;Tag 显示"首个 +X" |
| H-New Moment Added | toast(现有) | 改 | S | 成功 toast 2s |
| H-View Moment | `moments/MomentDetailScreen` | 改 | M | 全文不滚动显示;摘 Highlight |
| H-NoPremium request to edit Popup | — | 新 | S | 双 CTA 模式(决策 4) |
| H-Moment Edit Alert | — | 新 | S | Premium 编辑过往月提示"已用于 Story,可重新生成" |
| H-Edit Moment Page | `moments/MomentEditScreen` | 改 | M | Delete + 二次确认 sheet;完成回列表 + toast |
| H-full picture | `shared/FullscreenPhotoViewer` | 改 | S | 多图指示条横滑;仅查看态可进 |
| H-Moments couldn't load | — | 新 | S | 失败态 + 下拉刷新(与 S- 共用组件) |

### 2.3 Stories(S- 行,12 屏)

| 新设计屏 | 现有代码 | 动作 | 量 | 要点 |
|---|---|---|---|---|
| S-Story Empty → S-Over one year 全部列表态 | `stories/StoriesScreen` | 改 | **L** | 本次最大单体:**年份筛选器**(当前年最左默认选中,按年分组);**8 态 StoryCard**(映射见决策 5);**Paused 折叠卡**(连续空窗合并、跨年各自折叠);Free 配额尽顶部 Locked 横幅常驻;Premium 到期 Renew 卡 |
| S-Regeneration allowed(+confirm popup) | — | 新 | M | 蓝色 regenerate 条(Generated / NoMoments 两种卡都可带);二次确认 sheet(覆盖警告);**判定 = 有占位卡即可**(决策 3) |
| S-Stories couldn't load | — | 新 | S | 与 H- 共用失败态组件 |
| S-02 Story 详情(H5) | `stories/StoryDetailScreen` + `StoryWebView` | 不动 | — | 与本次解耦 |

### 2.4 Settings(ST- 行,13 屏)

| 新设计屏 | 现有代码 | 动作 | 量 | 要点 |
|---|---|---|---|---|
| ST-Settings(free / premium) | `settings/SettingsScreen` | 改 | M | 顶部优惠位(→ feedback);Story Notification / **Upload Reminders(新,默认开)** / Story Location 开关;Current Plan 卡两版(Free 显示剩余配额) |
| ST-feedback | `settings/FeedbackScreen` | 改 | M | **10% off 计划**:How-it-works sheet + Thanks sheet(带账号邮箱可改);照片 ≤9 同 Moment 流;**文字或图片任一激活**(`FEEDBACK_CONSTRAINTS`) |
| ST-Child Profile Edit(free / premium) | `settings/ChildProfileEditScreen` | 改 | S | Free 顶部常驻提示;身高体重单位切换 |
| ST-Current plan(Free) | `settings/SubscriptionScreen` | 改 | M | 权益对比 + 套餐选择 + Start with Premium |
| ST-Current plan(Premium) | 同上 | 改 | L | 周期/价格/Next Billing;**两步取消流**:损失清单 sheet → 原因问卷 sheet(单选 + Other 200 字) |
| ST-Plan cancelled | — | 新 | S | 取消成功页 → Back to Settings |
| ST-Account | `settings/AccountScreen` | 改 | M | Logout 确认;**输入 "DELETE" 才激活删号**;Premium 版 v2 弹窗(订阅不自动取消提示) |
| ST-Data & Privacy | `settings/DataPrivacyScreen` | 改 | S | 静态说明 |
| ST-About | `settings/AboutScreen` | 改 | S | slogan/版本/ToS/Privacy/版权/support@nestory.love |

### 2.5 全局(global- 行)

| 新设计屏 | 现有代码 | 动作 | 量 | 要点 |
|---|---|---|---|---|
| global-Paywall | `shared/PaywallModal` | **重写** | M | 旧 A/B/C/D 变体逻辑全废;单一 sheet:权益 5 条 + $100/$10 选择 + Upgrade CTA;触发 = 各处 "View Premium benefits";**遗留待定:各弹窗金色主按钮是直付还是也弹此 Paywall(建议 MVP 统一弹此,见决策 4)** |
| global-Welcome to premium | — | 新 | S | 订阅/续费成功统一落地页,"I'm all set" 回发起位置 |

---

## 3. 摘除清单(Highlight + 旧机制)

**整文件删除:**
- `app/(tabs)/highlights.tsx`、`app/highlight/[id].tsx`
- `features/highlights/`(2 屏)
- `api/highlights.ts`
- `app/moment/cover.tsx` + `moments/MomentCoverScreen`(Highlight 封面选择,无对应新设计)

**文件内摘除:**
- `app/(tabs)/_layout.tsx`:Highlights tab(4→3)
- `AddMomentScreen` / `MomentEditScreen` / `MomentDetailScreen`:Mark as Highlight 行、`useCreateHighlight`
- `api/assets.ts` / `api/index.ts` / `api/queryClient.ts`:highlight hooks 与缓存键
- `shared/TopNotify.tsx`:旧 R-10 降级 Notify 体系 → 评估删除(新设计只在 Stories 顶部有 Locked 横幅,属 StoryCard 组件)
- `shared/theme/colors.ts`:highlight 专属色标记清理
- `packages/types`:`highlight.ts`、`topNotify.ts` 导出(**保留文件到后端同步摘除时一并删**,避免 API 类型断裂)

**保留:**
- `TagPickerSheet` / `app/moment/tags.tsx`(Tag 保留,仅预设集合)
- `moment/date.tsx`(Moment Date 选择,新设计仍有)

---

## 4. 施工顺序(建议 6 个 Phase)

| Phase | 内容 | 理由 |
|---|---|---|
| **P0 拆除** | 摘 Highlight(§3)+ tab 4→3 + PaywallModal 重写 + Welcome to premium | 全局依赖,先拆后建;Paywall 是所有模块的公共依赖 |
| **P1 Onboarding** | §2.1 全部 | 独立流程,不依赖主 app 改造;新用户第一印象 |
| **P2 Home/Moment** | §2.2 全部 | 核心日常路径;Profile Switcher 依赖 P0 的 Paywall |
| **P3 Stories** | §2.3 全部 | 最大单体(8 态 + 折叠);regenerate UI 可先做,后端接口后接 |
| **P4 Settings** | §2.4 全部 | 取消流/删号流独立性强 |
| **P5 收尾** | couldn't-load 态统一、埋点 9 事件(Handoff §5)、全流程走查 | 横切关注点最后统一 |

每个 Phase 完成即 commit;P0 完成后 app 应能跑通(3 tab、无 Highlight、新 Paywall)。

---

## 5. 遗留待定项(不阻塞开工)

| # | 事项 | 状态 |
|---|---|---|
| 1 | 升级弹窗金色主按钮的确切去向(直付 or 弹 Paywall) | 建议 MVP 统一弹 global-Paywall;可开工后随时切 |
| 2 | Add Another Child 是否询问 Relationship | Justin:暂不问,默认亲子;后续可能改 |
| 3 | Settings 顶部优惠活动位内容 | Vicol:"后续可能会调整";先按稿实现 |

## 6. 后端牵连项(本次不做,单独排期)

1. **Regenerate API**:moment 变更追踪(哪月变了)+ 重生成端点 + 覆盖写;判定"有占位卡"
2. **订阅枚举清理**:`trial_active/trial_ended` 平台试用语义废弃;"Trial ended" 文案对应的判定是 `free && quota=0`,**勿复用旧枚举**
3. **Story 配额新规**:注册月起算、前两个月各 1 份(现有 quota 逻辑核对)
4. **Highlight 后端摘除**:routes、Prisma `Highlight` 模型、`isHighlight` 字段(数据迁移)
5. **Profile 切换规则**:Free 禁切(现有 `PROFILE_SWITCH_RESTRICTED` 逻辑核对新规则)
6. **Moment 校验**:text 必填(`textRequiredToSave`)服务端兜底
7. **Upload Reminders 推送**:连续 3 天未上传触发,文案固定
8. **Feedback 10% off**:提交通道 + 邮箱关联 + 折扣核销(全新业务)
9. **多设备实时同步(Premium)** 与换机恢复:现状核对

---

**— 文档结束 —**
