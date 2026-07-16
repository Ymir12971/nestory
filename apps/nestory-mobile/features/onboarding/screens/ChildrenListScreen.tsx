import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import type { Child } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useChildren } from '@/api';
import { formatAge } from '@/shared/lib/formatAge';

// O-Children list (Figma 750:2581 one child / 751:1334 more). Shown after each
// child is created. "Add Another Child" loops back through basic info + details
// (?another=1 → relationship not asked again). No cap on children.

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {childrenQ.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.text.brand} />
          </View>
        ) : (
          <>
            <View style={styles.headingGroup}>
              <Text style={styles.heading}>{titleFor(children)}</Text>
              <Text style={styles.subheading}>
                Add as many little ones as you like — each gets their own Story.
              </Text>
            </View>

            <View style={styles.list}>
              {children.map((child, i) => (
                <View key={child.id}>
                  {i > 0 && <View style={styles.divider} />}
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
                    <RemixIcon name="checkbox-circle-fill" size={22} color={theme.text.brand} />
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.addBtn}
              onPress={() => router.push('/onboarding/profile?another=1')}
            >
              <RemixIcon name="add-line" size={20} color={theme.text.brand} />
              <Text style={styles.addLabel}>Add Another Child</Text>
            </Pressable>

            <Text style={styles.footnote}>You can add later in Settings</Text>
          </>
        )}
      </ScrollView>

      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtnWrap, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/onboarding/permissions')}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnLabel}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  center: { paddingTop: 120, alignItems: 'center' },

  headingGroup: { gap: 6 },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  list: {
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l,
  },
  divider: { height: 1, backgroundColor: theme.border.default },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surface.brandSubtle,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...theme.typography.h4, color: theme.text.primary },
  rowSub: { ...theme.typography.caption, color: theme.text.secondary },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.brand,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brandSubtle,
  },
  addLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },

  footnote: {
    ...theme.typography.caption,
    color: theme.text.hint,
    textAlign: 'center',
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  ctaBtnWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  ctaBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaBtnLabel: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
});
