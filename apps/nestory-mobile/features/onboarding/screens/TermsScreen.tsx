import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavBar } from '@/shared/components/NavBar';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const TERMS_SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using Nestory, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
  },
  {
    title: 'Use of the Service',
    body: 'Nestory is a personal moment-keeping app. You are responsible for all content you create and share. You agree not to use the service for any unlawful purpose.',
  },
  {
    title: 'Intellectual Property',
    body: 'All content you upload remains yours. By using Nestory, you grant us a limited license to store and display your content solely to provide the service.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Nestory is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
  },
];

export function TermsScreen() {
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar title="Terms of Service" onBack={goBack} />

      {/* body 739:1550 — sections sit flat on the page, no card wrapper */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedLabel}>Last updated: January 1, 2025</Text>
        <Text style={styles.hint}>Please read these terms carefully before using Nestory.</Text>

        {TERMS_SECTIONS.map((section, i) => (
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
