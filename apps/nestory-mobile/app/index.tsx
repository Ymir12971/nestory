import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/hooks/useSession';

export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;

  return session
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/onboarding/welcome" />;
}
