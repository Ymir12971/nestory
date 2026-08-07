import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import { NavBar } from '@/shared/components/NavBar';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const REMIX_URL = 'https://remixicon.com/';
const SUPPORT_EMAIL = 'support@nestory.love';
// Read the real version + build code from the installed package. Falls back to
// the source string when expo-application can't resolve it (web, etc.).
const APP_VERSION =
  Application.nativeApplicationVersion && Application.nativeBuildVersion
    ? `${Application.nativeApplicationVersion} (Build ${Application.nativeBuildVersion})`
    : '0.0.1 (dev)';

export function AboutScreen() {
  const router = useRouter();
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar title="About" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* brandCol 770:2587 — the logo lockup, not an app icon over a wordmark */}
        <View style={styles.brandCol}>
          <Image
            source={require('@/assets/images/nestory-logo.png')}
            style={styles.logoLockup}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Every little moment becomes a story</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>

        {/* Legal links — point at in-app pages until public URLs are hosted */}
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push('/onboarding/terms')}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <RemixIcon name="external-link-line" size={20} color={theme.text.secondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={() => router.push('/onboarding/privacy')}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <RemixIcon name="external-link-line" size={20} color={theme.text.secondary} />
          </Pressable>
        </View>

        {/* Attribution */}
        <Text style={styles.attribution}>
          {'Icons by '}
          <Text style={styles.attributionLink} onPress={() => Linking.openURL(REMIX_URL)}>
            Remix Icon
          </Text>
          {'.'}
        </Text>

        {/* 770:2603 — support address in brand green */}
        <Text style={styles.attribution}>
          {'Contact us via '}
          <Text
            style={styles.supportLink}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>
        </Text>

        <Text style={styles.copyright}>© 2026 Nestory. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xxl,
    alignItems: 'center',
  },

  // Brand column — pt-16, pb-8, gap-8, center
  brandCol: {
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.s,
  },
  // 770:2588 — 160×53 logo lockup
  logoLockup: { width: 160, height: 53 },
  tagline: { ...theme.typography.caption, color: theme.text.secondary },
  version: { ...theme.typography.caption, color: theme.text.secondary },

  // Legal card
  card: {
    width: '100%',
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  rowLabel: { ...theme.typography.h4, color: theme.text.primary, flex: 1 },
  divider: { height: 1, backgroundColor: theme.border.default },

  // Attribution
  attribution: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  attributionLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 16,
    color: theme.text.secondary,
  },
  supportLink: { color: theme.text.brand },
  copyright: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
});
