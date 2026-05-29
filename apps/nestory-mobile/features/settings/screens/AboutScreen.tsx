import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const REMIX_URL   = 'https://remixicon.com/';
const APP_VERSION = '1.0.0 (Build 1)';

export function AboutScreen() {
  const router = useRouter();
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>About</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand column */}
        <View style={styles.brandCol}>
          {/* TODO: replace with <Image source={require('@/assets/logo.png')} style={{ width: 160, height: 53 }} /> */}
          <View style={styles.logoPlaceholder}>
            <RemixIcon name="heart-2-fill" size={28} color={theme.text.onColor} />
            <Text style={styles.logoText}>Nestory</Text>
          </View>
          <Text style={styles.tagline}>Every little moment becomes a story</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>

        {/* Legal links — point at in-app pages until public URLs are hosted */}
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push('/onboarding/terms')}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={() => router.push('/onboarding/privacy')}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
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
        <Text style={styles.copyright}>© 2026 Nestory. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle:  { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

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
  logoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.brand,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.radius.m,
    gap: theme.spacing.s,
  },
  logoText: {
    ...theme.typography.h1,
    color: theme.text.onColor,
  },
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
  copyright: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
});
