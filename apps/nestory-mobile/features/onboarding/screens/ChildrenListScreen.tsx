import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Child } from '@nestory/types';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { palette, theme } from '@/shared/theme';
import { useChildren } from '@/api';
import { formatAge } from '@/shared/lib/formatAge';

// O-Children list (Figma 750:2581 one child / 751:1334 more). Shown after each
// child is created. "Add another child" loops back through basic info + details
// (?another=1 → relationship not asked again). No cap on children.
//
// Each child is its own 72px card outlined in border/success; the add-another
// entry is a same-sized card with a 2px dashed brand outline.

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function titleFor(children: Child[]): string {
  if (children.length === 1) return `${children[0]!.name} is all set`;
  const word = COUNT_WORDS[children.length] ?? String(children.length);
  return `${word} babies are all set`;
}

const GENDER_LABEL: Record<string, string> = { girl: 'Girl', boy: 'Boy' };

function subtitleFor(child: Child): string {
  const age = formatAge(child.birthDate);
  const gender = child.gender ? GENDER_LABEL[child.gender] : undefined;
  // 'prefer_not_to_say' → age only (annotation: 不显示)
  return gender ? `${age}, ${gender}` : age;
}

export function ChildrenListScreen() {
  const router = useRouter();
  const childrenQ = useChildren();
  const children = childrenQ.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Still phase 1 of the onboarding progress — same as the profile form */}
      <NavBar progress={{ total: 3, active: 1 }} />

      {childrenQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : (
        <>
          {/* title 750:2584 */}
          <View style={styles.title}>
            <Text style={styles.heading}>{titleFor(children)}</Text>
            <Text style={styles.subheading}>
              Add as many little ones as you like — each gets their own Story.
            </Text>
          </View>

          {/* body 750:2588 */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.row}>
                  {child.avatarUrl ? (
                    <Image source={{ uri: child.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar} />
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{child.name}</Text>
                    <Text style={styles.rowSub}>{subtitleFor(child)}</Text>
                  </View>
                  <RemixIcon name="checkbox-circle-fill" size={24} color={theme.text.brand} />
                </View>
              </View>
            ))}

            {/* 751:1288 — dashed add-another card */}
            <Pressable
              style={styles.addCard}
              onPress={() => router.push('/onboarding/profile?another=1')}
            >
              <View style={styles.row}>
                <View style={styles.addIconCircle}>
                  <RemixIcon name="add-large-line" size={24} color={theme.text.brand} />
                </View>
                <Text style={styles.addLabel}>Add another child</Text>
                <View style={styles.rowSpacer} />
              </View>
            </Pressable>
          </ScrollView>
        </>
      )}

      {/* cta 774:4785 — footnote sits above the button */}
      <View style={styles.cta}>
        <Text style={styles.footnote}>You can add later in Settings</Text>
        <Button label="Continue" onPress={() => router.push('/onboarding/permissions')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  center: { flex: 1, paddingTop: 120, alignItems: 'center' },

  title: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingVertical: theme.spacing.l, // 16
    gap: 12,
  },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  scroll: { flex: 1 },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.l, // 16
  },

  childCard: {
    height: 72,
    borderWidth: 1,
    borderColor: theme.border.success, // #bbf7d0
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    overflow: 'hidden',
  },
  addCard: {
    height: 72,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.border.brand,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: theme.spacing.l, // 16
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...theme.typography.h3, color: theme.text.primary }, // Manrope SemiBold 16/22
  rowSub: { ...theme.typography.caption, color: theme.text.secondary },
  rowSpacer: { flex: 1 },

  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: palette.primary[100], // #d1f5de
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 12,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xs, // 4
    alignItems: 'center',
  },
  footnote: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },
});
