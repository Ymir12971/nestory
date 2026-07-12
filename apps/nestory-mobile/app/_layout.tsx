import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api';
import { useSession } from '@/features/auth/hooks/useSession';
import { initPurchases, identifyPurchaseUser } from '@/features/billing/purchases';
import { ToastHost } from '@/features/ui/ToastHost';
import { SplashScreen as BrandSplash } from '@/features/splash/SplashScreen';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

// Minimum time the branded splash stays up once it appears, so the breathing
// glow always plays at least one full cycle even when boot is near-instant.
const MIN_SPLASH_MS = 2500;
const FADE_OUT_MS = 250;

export default function RootLayout() {
  const { session, isLoading: sessionLoading } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fontsReady = fontsLoaded || fontError;

  // Branded splash overlay: shown over the app from the moment the native
  // launch screen hides until boot is ready AND the minimum display time has
  // elapsed, then cross-fades out.
  const [showSplash, setShowSplash] = useState(true);
  const [minElapsed, setMinElapsed] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Hide the native launch screen as soon as fonts are ready; the branded
  // splash overlay takes over seamlessly underneath the same off-white field.
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  // Start the minimum-display timer once fonts are ready (i.e. once the branded
  // splash is actually on screen).
  useEffect(() => {
    if (!fontsReady) return;
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [fontsReady]);

  // Boot is "ready" when fonts loaded, session restore settled, and the minimum
  // display window has passed. Then cross-fade the splash away.
  const ready = fontsReady && !sessionLoading && minElapsed;
  useEffect(() => {
    if (!ready) return;
    const anim = Animated.timing(splashOpacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setShowSplash(false);
    });
    return () => anim.stop();
  }, [ready, splashOpacity]);

  // Configure RevenueCat once at startup (no-op on web / when key absent).
  useEffect(() => {
    initPurchases();
  }, []);

  // Alias the RC customer to our user id whenever a session is present — covers
  // both fresh sign-in and cold-start session restore.
  useEffect(() => {
    if (session?.userId) identifyPurchaseUser(session.userId);
  }, [session?.userId]);

  // Keep the native launch screen up until fonts are ready, so there is no
  // unstyled flash before the branded splash can render with its typefaces.
  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ToastHost />
        {showSplash && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: splashOpacity, pointerEvents: ready ? 'none' : 'auto' },
            ]}
          >
            <BrandSplash />
          </Animated.View>
        )}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
