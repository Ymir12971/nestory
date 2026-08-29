# Nestory 移动端发布手册（App Store / Google Play）

> **适用范围**：`apps/nestory-mobile`，Expo SDK 52 + EAS Build / EAS Submit。
>
> **权威性**：本文取代 `09_Nestory_环境与CI_v1.0.md` 第 3.1 / 3.2 节。那份文档写于账号注册之前，
> 里面的 Bundle ID（`app.nestory.ios` / `app.nestory.android`）**是过期的**，实际以 `app.json` 为准：
> 两端都是 `com.blakard.nestory`。第 3.3 节描述的 OTA channel 目前也**尚未实现**（见 §6）。
>
> 最后核对：2026-08-25，对应 `app.json` version `0.0.1` / versionCode `11`。

---

## 1 · 现状速查

| 项 | 值 | 出处 |
|---|---|---|
| iOS Bundle ID | `com.blakard.nestory` | `app.json` → `ios.bundleIdentifier` |
| Android Package | `com.blakard.nestory` | `app.json` → `android.package` |
| EAS Project ID | `14a340fa-15e4-438d-ae66-75a366a1f510` | `app.json` → `extra.eas.projectId` |
| 版本号来源 | `local`（写在 `app.json` 里，非 EAS 服务端托管） | `eas.json` → `cli.appVersionSource` |
| 构建 Node | 22.11.0（锁定） | `eas.json` 各 profile |
| OTA 热更新 | **没有**（未安装 `expo-updates`） | 见 §6 |

### Build profile 一览

| profile | 分发方式 | Android 产物 | 用途 |
|---|---|---|---|
| `development` | internal | APK | 带 dev client 的调试包 |
| `preview` | internal | APK | **不走商店**的内部直装包 |
| `beta` | store | AAB | TestFlight / Play 内部测试 |
| `production` | store | AAB | App Store / Play 正式版 |

`beta` 用 `extends: "production"`，继承它的 `autoIncrement`、AAB 格式和环境变量，只把分发方式写明为 `store`。

**"非正式版"不是构建的属性，是轨道的属性**——同一个包投 internal track 就是内测，投 production track 就是正式版；
iOS 上传到 App Store Connect 的包默认只进 TestFlight，不点提审就永远不会变成正式版。

### Submit profile 一览

| profile | iOS | Android track |
|---|---|---|
| `beta` | TestFlight（上传即到） | `internal` |
| `production` | TestFlight → 手动提审 | `production` |

---

## 2 · 一次性准备

下面每一项没做完，对应平台的发布都跑不起来。

### 2.1 Apple

1. **Apple Developer Program**，$99/年，个人或公司。审核 1–3 天。
2. **App Store Connect 建 App 记录**：My Apps → ➕ → 平台 iOS，Bundle ID 选 `com.blakard.nestory`
   （需先在 Certificates, Identifiers & Profiles 里注册这个 Identifier），填 SKU 和主要语言。
   > `eas submit` 也能自动创建，但名称和 SKU 由它代填，建议手动建以免后面改不动。
3. **记下三个值**，填进 `eas.json` 的 `submit.beta` / `submit.production`（现在是 `REPLACE_*` 占位符）：
   - `appleId`：Apple ID 邮箱
   - `ascAppId`：App Store Connect 里 App 的数字 ID（App Information 页 URL 里那串）
   - `appleTeamId`：10 位 Team ID（Membership 页）
4. **App Store Connect API Key**（可选但强烈建议）：Users and Access → Integrations → App Store Connect API
   → 生成 Key（角色 App Manager），下载 `.p8`。有它 `eas submit` 才能非交互运行，
   否则每次都要输 Apple ID 密码和双因子验证码。用 `eas credentials` 存进 EAS。
5. **签名证书**：Distribution Certificate 和 Provisioning Profile 交给 EAS 托管，
   首次 `eas build` 会询问，选自动生成即可。

### 2.2 Google

1. **Play Console 开发者账号**，$25 一次性。
2. **建 App**：包名 `com.blakard.nestory`（**建完不可更改**）。
3. **第一个 AAB 必须手工上传**。Play 的 Publishing API 无法为一个从未发布过的 App 创建首个版本，
   所以第一次要走 Play Console → 测试 → 内部测试 → 创建新版本 → 上传构建产物。之后 `eas submit` 才能接管。
4. **Service Account**：
   - Google Cloud Console → 对应项目 → IAM & Admin → Service Accounts → 新建 → 生成 JSON key
   - Play Console → 用户和权限 → 邀请该 service account 邮箱 → 授予**发布管理员**
     （至少要有"管理测试轨道版本"权限）
   - JSON 放到仓库根目录 `secrets/play-service-account.json`
     （`.gitignore` 已排除 `secrets/` 与 `*service-account*.json`，**不要提交**）
5. **Keystore**：交给 EAS 托管，首次 `eas build` 自动生成。
   生成后立刻用 `eas credentials` 导出备份——**弄丢了就再也无法更新这个包名的 App**。

### 2.3 RevenueCat（订阅必需）

1. RC Dashboard 建 Project，分别添加 iOS App（填 Bundle ID + App Store Connect API Key）
   和 Android App（填包名 + Play service account JSON）。
2. 商店侧先建好商品：
   - App Store Connect → Features → In-App Purchases → 两个 Auto-Renewable Subscription，放同一个 Subscription Group
   - Play Console → 创收 → 订阅 → 两个订阅
   - Product ID 两端保持一致：`nestory_premium_yearly` / `nestory_premium_monthly`
     （后端 `inferBillingCycle()` 靠 ID 里的 `yearly` / `annual` / `monthly` 关键字判断计费周期）
3. RC → Products 导入这两个商品；建 Offering（命名 `default`），
   **必须建成 Annual 和 Monthly 两个标准 package**，因为客户端读的是
   `offerings.current.annual` / `.monthly`（见 `features/billing/purchases.native.ts`）。
4. RC → Integrations → Webhooks：URL 填 `https://<api域名>/subscriptions/sync`，
   Authorization header 填一个自己生成的随机串，同一个值配到 Railway 的 `REVENUECAT_WEBHOOK_SECRET`。
5. RC → API Keys：
   - 两个 **public SDK key**（`appl_…` 和 `goog_…`）→ 进 EAS secret，见 §2.4
   - 一个 **secret key**（`sk_…`）→ 进 Railway 的 `REVENUECAT_API_KEY`

### 2.4 环境变量

**EAS secret**（在 `apps/nestory-mobile` 下执行，会注入所有 profile 的构建）：

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY     --value "appl_xxx"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_xxx"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN             --value "https://xxx@xxx.ingest.sentry.io/xxx"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY            --value "phc_xxx"
```

> 这几个**不要写进 `eas.json` 的 `env`**。两个原因：`eas.json` 里的同名值会盖掉 secret；
> 而且这些值靠"空字符串 = 功能关闭"兜底（`isPurchasesAvailable()`、Sentry init、PostHog client
> 都是这个判断），写一个假占位符反而会让它们拿着无效 key 去初始化。
> Supabase 那两个 `EXPO_PUBLIC_` 变量是公开值，已直接写在 `eas.json` 里，照旧。

**Railway（API 侧）**：

| 变量 | 缺失后果 |
|---|---|
| `REVENUECAT_WEBHOOK_SECRET` | 所有订阅事件被 401 拒绝，用户付了钱拿不到权益，日志只有一行 warn |
| `REVENUECAT_API_KEY` | `POST /subscriptions/refresh` 返回 503，"恢复购买"按钮不可用 |

---

## 3 · 版本号规则

`eas.json` 里 `cli.appVersionSource` 是 `local`，版本号的事实源是 **`app.json`**，不是 EAS 服务端。

| 字段 | 作用 | 谁改 |
|---|---|---|
| `expo.version` | 用户可见版本号（如 `1.0.0`） | 手动，发版时决定 |
| `expo.ios.buildNumber` | TestFlight / App Store 构建号，同 version 下必须递增 | `autoIncrement` 自动 |
| `expo.android.versionCode` | Play 构建号，**必须全局严格递增** | `autoIncrement` 自动 |

`beta` 和 `production` 都带 `autoIncrement: true`，因此：

> **`eas build` 会直接修改工作区的 `app.json`，构建完必须 commit 这个改动。**
> 忘了提交，下次构建会从同一个号重新加一，撞号后 Play 直接拒收。

`preview` / `development` **没有** `autoIncrement`，用它们出包不会动版本号。仓库历史里那几个
`chore(mobile): versionCode N` 的手工提交就是这么来的。**两种方式不要混用**——
一旦开始用 `beta` 出包，就交给 `autoIncrement` 管，别再手动改。

---

## 4 · 发布流程

所有命令都在 `apps/nestory-mobile` 目录下执行。首次先 `npx eas-cli login`。

### 4.1 只给自己人测 —— 不走商店（最快）

绕开两个商店的审核和轨道，直接出可安装的包：

```bash
npx eas-cli build -p android --profile preview   # APK，构建完给一个链接/二维码，直接装
npx eas-cli device:create                        # iOS 需先注册每台测试机的 UDID
npx eas-cli build -p ios --profile preview       # ad hoc 包，只有注册过的设备能装
```

几分钟出结果，适合日常联调。代价是 iOS 每加一台设备都要重新注册并重新构建。

### 4.2 TestFlight（iOS 内测）

```bash
npx eas-cli build -p ios --profile beta --auto-submit-with-profile beta
```

构建 + 上传一步完成。之后：

1. `app.json` 被 `autoIncrement` 改过 → `git add app.json && git commit`
2. App Store Connect → TestFlight，等 5–30 分钟处理完
3. 首次会要求填**出口合规声明**（Export Compliance）。本 App 只用 HTTPS，属豁免类，照实勾选即可
4. **内部测试组**：最多 100 人，必须是 App Store Connect 团队成员，**无需审核**，处理完即可安装
5. **外部测试组**：最多 10000 人，只要邮箱，但首次需要 **Beta App Review**，约 1–2 天

### 4.3 Google Play 内部测试

前提：§2.2 第 3 条的首个 AAB 已经手工传过。

```bash
npx eas-cli build -p android --profile beta --auto-submit-with-profile beta
```

投到 `internal` track。同样记得 commit `app.json`。

Play 的四条轨道由内到外：**内部测试**（最多 100 人，即时生效，无审核）→ **封闭测试** →
**开放测试** → **正式版**。

> 新注册的**个人**开发者账号有额外门槛：需先完成一段封闭测试（一定人数 + 连续天数）才能申请上正式版。
> 具体人数和天数 Google 调整过几次，**以你 Play Console 里当时的提示为准**。
> 内部测试轨道本身不受这条限制，但排期时要算进去。

### 4.4 正式版

**iOS**：正式版和 TestFlight 用的是同一个包。

```bash
npx eas-cli build -p ios --profile production --auto-submit-with-profile production
```

上传后到 App Store Connect → 该版本 → 填元数据（截图、描述、关键词、隐私标签、演示账号）→ 提交审核，
审核约 1–3 天。**订阅类 App 必须在元数据里提供一个可用的测试账号**，否则审核员进不去，直接被拒。

**Android**：

```bash
npx eas-cli build -p android --profile production --auto-submit-with-profile production
```

投到 `production` track。也可以先投 internal，验证没问题后在 Play Console 里用"提升版本"
把同一个包推到正式版，不必重新构建——推荐这条路。

---

## 5 · 提审要点（本项目相关）

订阅类 App 最常见的几个拒审点，对照检查：

- **恢复购买入口**（Guideline 3.1.1）：必须有。已实现，在设置 → 订阅页 Free 状态下的
  "Restore Purchases"（`features/settings/screens/SubscriptionScreen.tsx`）。
  注意它依赖 `POST /subscriptions/refresh`，Railway 上没配 `REVENUECAT_API_KEY` 时按钮会报错。
- **订阅信息披露**：价格、周期、自动续费说明、服务条款与隐私政策链接必须在购买页可见。已在 CTA 下方。
- **账号删除入口**（Guideline 5.1.1(v)）：App 内必须能发起账号删除。已实现。
- **隐私标签**：App Store Connect 的 App Privacy 和 Play 的数据安全表单都要如实填写照片、邮箱、
  使用数据的收集情况，且与 `packages/legal` 里的隐私政策保持一致。
- **演示账号**：审核备注里给一个能登录、且已经有内容的账号。

---

## 6 · 关于 OTA（目前没有）

`09_Nestory_环境与CI_v1.0.md` 第 3.3 节描述了 `preview` / `staging` / `production` 三条 EAS Update channel，
**那是规划，尚未实现**——项目没有安装 `expo-updates`，`eas.json` 里也没有 `channel` 字段。

现状是：**任何改动，哪怕只改一行文案，都要重新构建并重新上传商店。**

若要补上 OTA：`npx expo install expo-updates` + 给各 profile 加 `channel` + 用 `eas update` 推送。
好处是 JS 层改动可以绕过审核直接下发；原生依赖变化仍必须走完整构建。

---

## 7 · 排错

| 症状 | 原因 |
|---|---|
| `eas submit` 报 Android 找不到 App | 首个 AAB 还没手工传过（§2.2-3），或 service account 权限不够 |
| Play 拒收：versionCode 已存在 | 上次构建后忘了 commit `app.json` |
| iOS 购买全部失败 / RC 报 401 | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` 没配，或误用了 `goog_` 开头的 key |
| 购买成功但 App 里仍是 Free | webhook 没通。查 Railway 日志有无 `RC webhook received`；没有就是 RC Dashboard 的 URL 或 `REVENUECAT_WEBHOOK_SECRET` 不对 |
| "恢复购买"返回 503 | Railway 缺 `REVENUECAT_API_KEY` |
| 购买页报 "The yearly plan isn't available" | RC Offering 里没建成 Annual / Monthly 标准 package |
| 测试包里点订阅直接跳到 Premium 欢迎页 | 构建时没注入 RC key，`isPurchasesAvailable()` 为 false，走了 web 兜底分支 |

---

## 附 · 一次 beta 发版的完整动作

```bash
cd apps/nestory-mobile
npx eas-cli build -p ios     --profile beta --auto-submit-with-profile beta
npx eas-cli build -p android --profile beta --auto-submit-with-profile beta
cd ../..
git add apps/nestory-mobile/app.json
git commit -m "chore(mobile): build numbers for <版本> beta"
git push
```

然后去 App Store Connect 填出口合规，去 Play Console 确认内部测试轨道已上架。
