import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken } from '@/api';

// Expo 推送 token 注册。前提链条(Handoff §4):已登录 → 系统已授权 → 才注册。
// 这里不主动索权(Onboarding 的 Notification access 页负责),只在已授权时
// 取 token 并上报;权限被拒时安静跳过。Expo Go 拿不到真 token,静默略过。

export function usePushRegistration(isSignedIn: boolean): void {
  useEffect(() => {
    if (!isSignedIn || Platform.OS === 'web') return;
    let cancelled = false;

    (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (!perm.granted) return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any).easConfig?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !token) return;

        await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch {
        // 无 projectId / 模拟器 / 网络失败 — 推送是增强项,不打扰用户
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn]);
}
