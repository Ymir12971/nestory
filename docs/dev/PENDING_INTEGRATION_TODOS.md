# Nestory · 集成待办（Justin 负责）

> 以下集成项需要外部账号配置或原生层修改，由 Justin 在对应平台完成设置后，
> 再回来替换代码里的占位符 / TODO。

---

## IAP-01 · RevenueCat 订阅内购（2026-04-30）

**涉及文件**：`features/onboarding/screens/PlanScreen.tsx`

**当前状态**：点"Try Premium Free for 1 Month"直接 `router.replace('/')`，无真实购买逻辑。
Product ID 占位符已定义：
```ts
const IAP_PRODUCT_ID_YEARLY  = 'nestory_premium_yearly_placeholder';
const IAP_PRODUCT_ID_MONTHLY = 'nestory_premium_monthly_placeholder';
```

**Justin 需要完成的步骤**：

### 1. App Store Connect
- [ ] 登录 App Store Connect → My Apps → Nestory → Features → In-App Purchases
- [ ] 新建两个 Auto-Renewable Subscription：
  - Product ID: `nestory_premium_yearly`（$99.99/year，1 个月免费试用）
  - Product ID: `nestory_premium_monthly`（$9.99/month）
- [ ] 填写本地化描述、截图（App Review 要求）
- [ ] 在 Subscription Group 里设置两者的降级/升级关系

### 2. RevenueCat Dashboard
- [ ] 注册 / 登录 [app.revenuecat.com](https://app.revenuecat.com)
- [ ] 新建 Project → 添加 iOS App，填入 Bundle ID 和 App Store Connect API Key
- [ ] Products 页面添加上面两个 Product ID
- [ ] 新建 Offering（建议命名 `default`），创建 Package：
  - Annual package → 绑定 `nestory_premium_yearly`
  - Monthly package → 绑定 `nestory_premium_monthly`
- [ ] 复制 **RevenueCat Public SDK Key**（iOS）

### 3. 代码集成（开发侧，Justin 配置完再做）
- [ ] `pnpm add react-native-purchases` in `apps/nestory-mobile`
- [ ] `app.json` 添加 RevenueCat plugin（参考 RC 文档）
- [ ] `app/_layout.tsx` 初始化 SDK：
  ```ts
  import Purchases from 'react-native-purchases';
  Purchases.configure({ apiKey: 'YOUR_RC_PUBLIC_KEY' });
  ```
- [ ] `PlanScreen.tsx` 替换占位符：
  ```ts
  const IAP_PRODUCT_ID_YEARLY  = 'nestory_premium_yearly';
  const IAP_PRODUCT_ID_MONTHLY = 'nestory_premium_monthly';
  ```
- [ ] 实现购买逻辑（替换 TODO 注释处）：
  ```ts
  const offerings = await Purchases.getOfferings();
  const pkg = plan === 'yearly'
    ? offerings.current?.annual
    : offerings.current?.monthly;
  if (pkg) await Purchases.purchasePackage(pkg);
  router.replace('/');
  ```

### 4. Sandbox 测试
- [ ] App Store Connect → Users and Access → Sandbox Testers → 新建测试账号
- [ ] 真机（非模拟器）用 Sandbox 账号跑完整购买流程

---

## NOTIF-01 · expo-notifications 推送权限（2026-04-30）

**涉及文件**：`features/onboarding/screens/NotificationsScreen.tsx`

**当前状态**：点"Enable Notifications"直接跳 `/onboarding/plan`，无权限请求。

**Justin 需要完成的步骤**：

### 1. Apple Developer Console
- [ ] Certificates, Identifiers & Profiles → Identifiers → Nestory App ID
- [ ] 勾选 **Push Notifications** capability
- [ ] 生成 APNs Key（.p8 文件）或 APNs Certificate

### 2. 推送后端方案确认
- [ ] 选择方案：**Expo Push Service**（免费，简单）或自建后端（直连 APNs）
  - 推荐先用 Expo Push Service，MVP 阶段够用

### 3. 代码集成（方案确认后再做）
- [ ] `pnpm add expo-notifications` in `apps/nestory-mobile`
- [ ] `app.json` 添加 `expo-notifications` plugin
- [ ] 替换 `NotificationsScreen.tsx` 中的 TODO：
  ```ts
  import * as Notifications from 'expo-notifications';
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync();
    // 发给后端存储
  }
  router.push('/onboarding/plan');
  ```
