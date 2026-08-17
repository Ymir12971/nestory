import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { palette, theme } from '@/shared/theme';

// O-Notification access (Figma 739:1940) — phase 2 of 3 in the onboarding
// progress bar. The sample is a mock of the real push: the app icon with an
// unread badge above, the notification row below, both on primary/50.
export function NotificationsScreen() {
  const router = useRouter();

  const requestThenAdvance = async () => {
    // Annotation: advance only if the user actually enabled notifications;
    // otherwise stay on this page (Skip remains the explicit way past).
    const res = await Notifications.requestPermissionsAsync();
    if (res.granted || res.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      router.push('/onboarding/plan');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar progress={{ total: 3, active: 2 }} />

      {/* title 739:1943 */}
      <View style={styles.title}>
        <Text style={styles.headline}>Don't miss a Story</Text>
        <Text style={styles.subtitle}>Get notified when the monthly Story is ready</Text>
      </View>

      {/* Body 758:1344 → storySample 758:1348.
          The mark is logo.png (the leaf), not icon.png — 758:1349 puts the
          Logo component on a primary/50 tile. icon.png is the packaged app
          icon: it carries its own opaque cream field and square corners, which
          covered the tile's colour and its 24px radius entirely. */}
      <View style={styles.body}>
        <View style={styles.storySample}>
          <View style={styles.appIconTile}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>1</Text>
            </View>
          </View>

          <View style={styles.pushRow}>
            <View style={styles.pushIcon}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.pushIconImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.pushBody}>
              Your little one's monthly Story is ready. Tap to read.
            </Text>
          </View>
        </View>
      </View>

      {/* cta 739:1956 */}
      <View style={styles.cta}>
        <Button label="Enable Notifications" onPress={requestThenAdvance} />
        <Button label="Skip" type="text" onPress={() => router.push('/onboarding/plan')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  title: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
    gap: theme.spacing.s, // 8
  },
  headline: { ...theme.typography.h1, color: theme.text.primary },
  subtitle: { ...theme.typography.body, color: theme.text.secondary },

  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.xl,
  },
  storySample: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl, // 20
    gap: theme.spacing.xxl, // 24
    borderRadius: theme.radius.l,
  },

  appIconTile: {
    width: 128,
    height: 128,
    borderRadius: 24,
    backgroundColor: palette.primary[50],
  },
  appIcon: { width: 128, height: 128 },
  badge: {
    position: 'absolute',
    top: -9,
    left: 107,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff5757',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 20,
    color: theme.text.onColor,
  },

  // 758:1353 — flat primary/50 row, no card shadow and no app-name line
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: 10,
    borderRadius: theme.radius.m, // 10
    backgroundColor: palette.primary[50],
  },
  pushIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.surface.default,
    overflow: 'hidden',
  },
  pushIconImg: { width: 40, height: 40 },
  pushBody: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.primary,
    flex: 1,
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 12,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xs, // 4
    alignItems: 'center',
  },
});
