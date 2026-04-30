import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/hooks/useSession';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

export default function HomeRoute() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;
  if (!session) return <Redirect href="/onboarding/welcome" />;
  return <HomeScreen />;
}
