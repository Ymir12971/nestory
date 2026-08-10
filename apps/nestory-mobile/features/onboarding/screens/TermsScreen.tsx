import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavBar } from '@/shared/components/NavBar';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

// Copy transcribed verbatim from O-Terms of Service 739:1547. It is the
// design's placeholder wording, including the "(placeholder)" markers and the
// Apr 15, 2026 date — Justin asked for these two pages to follow the frame
// exactly. Handoff still says both will become an embedded Termly page.
const TERMS_SECTIONS = [
  {
    title: '1. Agreement',
    body: 'By using Nestory, you agree to these terms. If you disagree, please stop using the service.',
  },
  {
    title: '2. Accounts',
    body: 'You are responsible for your account security and all activity under your credentials.',
  },
  {
    title: '3. Billing',
    body: 'Paid subscriptions and refunds follow the platform billing rules shown at checkout.',
  },
  {
    title: '4. Contact',
    body: 'Questions: support@nestory.app (placeholder)',
  },
];


export function TermsScreen() {
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar title="Terms of Service" onBack={goBack} />

      {/* body 739:1550 — sections sit flat on the page, no card wrapper */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedLabel}>Last updated: Apr 15, 2026 · Placeholder copy</Text>
        <Text style={styles.hint}>Placeholder content for legal review and layout validation.</Text>

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
