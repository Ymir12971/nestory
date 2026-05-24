import { Component, type ReactNode, useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api';
import { useSession } from '@/features/auth/hooks/useSession';
import { initPurchases, identifyPurchaseUser } from '@/features/billing/purchases';
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

// Surfaces render errors on screen in production builds (which otherwise just
// show a blank page). Temporary diagnostic — keep until the demo build is green.
class DebugErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#c00', marginBottom: 12 }}>App error</Text>
          <Text selectable style={{ fontSize: 13, color: '#222', marginBottom: 12 }}>{String(this.state.error?.message ?? this.state.error)}</Text>
          <Text selectable style={{ fontSize: 11, color: '#666' }}>{this.state.error?.stack ?? ''}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

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
    <DebugErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </QueryClientProvider>
    </DebugErrorBoundary>
  );
}
