import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { theme, palette } from '@/shared/theme';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

export function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
          </Pressable>
        </View>
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < CURRENT_STEP && styles.progressActive]}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.headline}>Don't miss a moment</Text>
          <Text style={styles.subtitle}>Get notified when the monthly Story is ready</Text>
        </View>
        <View style={styles.storySample}>
          <Text style={styles.samplePlaceholder}>[ Story sample — image placeholder ]</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.buttonWrap, pressed && { opacity: 0.85 }]}
          onPress={async () => {
            await Notifications.requestPermissionsAsync();
            router.push('/onboarding/plan');
          }}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Enable Notifications</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/onboarding/plan')}
        >
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  navBar: {
    paddingHorizontal: theme.spacing.xxl,
  },
  navRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.border.default,
  },
  progressActive: {
    backgroundColor: theme.surface.brand,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    gap: theme.spacing.xl,
  },
  titleGroup: {
    gap: 8,
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  storySample: {
    height: 240,
    backgroundColor: theme.surface.card,
    borderRadius: theme.radius.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  samplePlaceholder: {
    ...theme.typography.body,
    color: theme.text.hint,
  },
  spacer: {
    flex: 1,
  },
  cta: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: theme.spacing.safeBtm,
    gap: 4,
    alignItems: 'center',
  },
  buttonWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  skipButton: {
    height: 44,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  skipLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
});
