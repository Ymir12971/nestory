import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LegalDocument } from '@nestory/legal';
import { NavBar } from '@/shared/components/NavBar';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

/**
 * Terms and Privacy share one screen (739:1547 / 739:1566 are the same layout
 * with different copy): body pt 16 / px 20 / gap 8, a Caption meta line, a
 * Caption hint, then sections of Heading4 title + Body text 4 apart.
 *
 * The text comes from @nestory/legal, the same source the web pages render —
 * the frames' own copy is placeholder ("Placeholder copy", "1. Agreement"),
 * which is fine to lay out against but not to ship. Layout follows the frame;
 * only the words come from elsewhere.
 */
export function LegalScreen({ doc }: { doc: LegalDocument }) {
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar title={doc.title} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedLabel}>Effective {doc.effectiveDate}</Text>
        <Text style={styles.hint}>{doc.intro}</Text>

        {doc.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.blocks.map((block, i) =>
              block.kind === 'bullets' ? (
                (block.items ?? []).map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>{'\u2022'}</Text>
                    <Text style={styles.sectionBody}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text key={i} style={styles.sectionBody}>{block.text}</Text>
              ),
            )}
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

  section: { gap: 4 },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.text.primary,
  },
  sectionBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  bulletDot: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
});
