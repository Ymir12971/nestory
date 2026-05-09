import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const PRIVACY_SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly, such as your name, email address, and the content you create in the app. We also collect usage data to improve the service.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to provide and improve Nestory, send you updates, and personalize your experience. We do not sell your personal data to third parties.',
  },
  {
    title: 'Data Storage and Security',
    body: 'Your data is stored securely on our servers. We use industry-standard encryption to protect your information. You can request deletion of your account and data at any time.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data. To exercise these rights or for privacy inquiries, please contact us through the app\'s feedback feature.',
  },
];

export function PrivacyScreen() {
  const router = useRouter();
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Privacy Policy</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Last updated */}
        <Text style={styles.updatedLabel}>Last updated: January 1, 2025</Text>

        {/* Content card */}
        <View style={styles.card}>
          <Text style={styles.hint}>
            Your privacy matters to us. This policy explains how we handle your data.
          </Text>

          {PRIVACY_SECTIONS.map((section, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
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
  navTitle: { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

  body: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },

  updatedLabel: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },

  card: {
    backgroundColor: theme.surface.muted,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    padding: 16,
    gap: 14,
  },

  hint: {
    ...theme.typography.caption,
    color: theme.text.hint,
  },

  section: {
    gap: 4,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  sectionBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
});
