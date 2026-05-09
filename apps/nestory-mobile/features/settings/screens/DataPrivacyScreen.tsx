import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const DATA_POINTS = [
  'Your photos and text are processed securely to generate Stories.',
  'We do not sell your data or use it for advertising purposes.',
  'Your data is encrypted in transit and at rest.',
];

export function DataPrivacyScreen() {
  const router = useRouter();
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Data & Privacy</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>How We Use Your Data</Text>
        <Text style={styles.intro}>
          Nestory uses AI to transform your photos and notes into beautiful monthly Stories. Here is
          how your data is handled:
        </Text>

        <View style={styles.bulletList}>
          {DATA_POINTS.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <RemixIcon name="shield-check-line" size={20} color={theme.text.brand} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
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
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.l,
  },

  heading: { ...theme.typography.h1, color: theme.text.primary },
  intro:   { ...theme.typography.body, color: theme.text.secondary },

  bulletList: { gap: theme.spacing.m },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.m,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.text.primary,
    flex: 1,
  },
});
