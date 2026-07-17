import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

// ST-Plan cancelled (Figma 771:3205). Shown once the platform cancellation has
// actually landed (RevenueCat webhook flips the status) — 方案A: the app never
// pretends an in-app cancel completed. Not auto-navigated yet; routable at
// /settings/plan-cancelled for when status-change detection lands (WorkPlan §6).

export function PlanCancelledScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <RemixIcon name="check-line" size={40} color={theme.text.brand} />
        </View>
        <Text style={styles.title}>Premium has been cancelled</Text>
        <Text style={styles.caption}>
          Your Premium benefits stay active until the end of the current billing period. All your Stories, Memories and Profiles are safe — nothing gets deleted.
        </Text>
      </View>

      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.replace('/settings')}
        >
          <Text style={styles.backBtnLabel}>Back to Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.l,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.text.primary,
    textAlign: 'center',
  },
  caption: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
  },
  backBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
