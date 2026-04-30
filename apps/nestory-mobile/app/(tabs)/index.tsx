// TEMP: 在 auth flow 接通之前，根路径直接渲染 SignIn 屏方便预览
// TODO: 改回 HomeScreen + 加 Redirect 逻辑（基于 useSession()）
export { SignInScreen as default } from '@/features/auth/screens/SignInScreen';
