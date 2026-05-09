import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const TERMS_SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using Nestory, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
  },
  {
    title: 'Use of the Service',
    body: 'Nestory is a personal memory-keeping app. You are responsible for all content you create and share. You agree not to use the service for any unlawful purpose.',
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
  const router = useRouter();
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Terms of Service</Text>
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
            Please read these terms carefully before using Nestory.
          </Text>

          {TERMS_SECTIONS.map((section, i) => (
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
