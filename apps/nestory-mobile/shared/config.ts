import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Runtime config — replace placeholder values before each environment's build.
 *
 * Dev：默认指向本机 api server。模拟器需要通过 host IP 访问，可在 app.config.ts 里覆盖。
 * Prod：使用线上域名。
 */

const dev = __DEV__;

// 在模拟器/真机上，localhost 不指向 dev 机；从 expo-constants 拿 dev host IP
const expoHostUri = Constants.expoConfig?.hostUri ?? '';
const devHost     = expoHostUri.split(':')[0] || 'localhost';

/**
 * RevenueCat public SDK keys are per-store: an Android `goog_…` key rejects
 * every call when handed to the iOS SDK, and vice versa. Resolve by platform
 * rather than shipping one key to both. Empty → IAP disabled
 * (isPurchasesAvailable() false), which is the web and un-provisioned case.
 *
 * Both branches name the env var literally because Metro inlines
 * `process.env.EXPO_PUBLIC_*` textually at build time — a computed key would
 * come back undefined.
 */
const revenueCatKey =
  Platform.select({
    ios:     process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: '',
  }) ?? '';

export const config = {
  // Non-dev builds (EAS preview/production) hit the deployed Railway API + Vercel web.
  apiBaseUrl: dev ? `http://${devHost}:3001` : 'https://nestoryapi-production.up.railway.app',
  webBaseUrl: dev ? `http://${devHost}:3000` : 'https://nestory-web-lilac.vercel.app',
  // EXPO_PUBLIC_* envs are inlined at build time. Both default to '' so the
  // Supabase client can be constructed lazily and produce a clear error if missing.
  supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  revenueCatKey,
} as const;
