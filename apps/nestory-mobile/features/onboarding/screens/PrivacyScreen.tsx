import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavBar } from '@/shared/components/NavBar';
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
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar title="Privacy Policy" onBack={goBack} />

      {/* body 739:1569 — sections sit flat on the page, no card wrapper */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedLabel}>Last updated: January 1, 2025</Text>
        <Text style={styles.hint}>
          Your privacy matters to us. This policy explains how we handle your data.
        </Text>

        {PRIVACY_SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  body: {
    paddingTop: theme.spacing.l, // 16
    paddingHorizontal: theme.spacing.xl, // 20
    paddingBottom: theme.spacing.safeBtm, // 34
    gap: theme.spacing.s, // 8
  },

  updatedLabel: {
    ...theme.typography.caption,
    color: theme.text.secondary,
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
