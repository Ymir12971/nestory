import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api';
import { useSession } from '@/features/auth/hooks/useSession';
import { initPurchases, identifyPurchaseUser } from '@/features/billing/purchases';
import { ToastHost } from '@/features/ui/ToastHost';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Configure RevenueCat once at startup (no-op on web / when key absent).
  useEffect(() => {
    initPurchases();
  }, []);

  // Alias the RC customer to our user id whenever a session is present — covers
  // both fresh sign-in and cold-start session restore.
  useEffect(() => {
    if (session?.userId) identifyPurchaseUser(session.userId);
  }, [session?.userId]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ToastHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
