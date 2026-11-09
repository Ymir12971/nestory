# Nestory · 上线后待办

> 2026-11-08 提审（Android 1.0.0 / vc24）时定下来的事：都不挡上线，上线后再做。
> 做完一条就删掉，或者打勾并写上 commit。

---

## AUTH-01 · 浏览器里直接打开 Supabase 登录地址时，接住回跳的凭证

**现象**：在浏览器里直接打开
`https://ovggqeaxqkaybrgnzfwh.supabase.co/auth/v1/authorize?provider=google`，不带 `redirect_to`。
这时 Supabase 走 implicit flow，登录完跳到 Site URL，并把 `access_token` 和 `refresh_token` 放在网址的 `#` 后面。
Site URL 现在是 `https://nestory.love`（2026-11-08 从 localhost 改过来）。落地页不处理这段 hash，
凭证会一直留在地址栏和浏览历史里。

**影响面**：
- App 不受影响。它带着 `redirectTo: nestory://` 走 PKCE，回来的只是一次性的 code，见 `SignInScreen.tsx`。
- 真实用户也走不到这里，因为 web 端没有登录入口。只有专门去打开这个地址的人才会遇到。

**做法**：
- [ ] 在 `apps/nestory-web` 加一个页面，比如 `/auth/landing`，设 `noindex`。页面在客户端：
  - 读 `location.hash` 里的 `access_token`；
  - 调 `POST /auth/v1/logout`（带 Bearer token 和 publishable key），作废这次会话；
  - 用 `history.replaceState` 抹掉 hash；
  - 显示 "Please sign in from the Nestory app"，附上商店链接。
- [ ] Supabase → Authentication → URL Configuration，把 Site URL 改成这个页面。
- [ ] Redirect URLs 里的 `nestory://` 保留，App 的 Google 登录靠它回到 App。

---

## 其他上线后事项

- **R8 / DEX 优化**：Play 提示 "DEX code optimization is below our threshold"（Obfuscation 2%），**2027-02 前要修**。
  修法是在 `expo-build-properties` 里加 `android.enableMinifyInReleaseBuilds: true`。
  R8 可能删掉 RevenueCat、Sentry、expo 模块靠反射用到的类，所以要单独出一个包，在真机上把购买、登录、通知测一遍。
- **后端权益清单**：`GET /subscriptions/me` 返回的 `benefits` 还写着 Highlights 和 Birthday Celebrations。
  1.0.0 的包已经不读它（`41af284`）。要么改成和 mobile 的 `PREMIUM_BENEFITS` 一致，要么把这个字段删掉。
- **OAuth 的支持邮箱**：Google Auth Platform → Branding 里的 User support email 现在是 justin@blakard.com。
  要换成 support@nestory.love，得先把它建成 justin 能管理的 Google Group。
- **公开仓库里的默认密码**：`apps/nestory-api/prisma/set-demo-password.ts` 写死了默认密码，而仓库是公开的。
  要改掉 justin@blakard.com 的密码，并让脚本必须传 `DEMO_PASSWORD` 才能运行。
- **商店截图**：第 1 张图上的 "+ Add Memory" 换成现在的 "+ Add Moment"。
