import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { theme } from '@/shared/theme';
import { showToast } from '@/features/ui/toast';
import { setApiReadOnly } from '@/api/client';
import { GALLERY_CASES, GALLERY_MODULES, type GalleryCase } from './cases';
import { clearForcedState } from './forceState';

const FIGMA_FILE = 'wS1hJeZhXMkUnn8YwLtFcv';

/**
 * Dev-only index of every Figma frame with a way to render it on demand.
 *
 * Half the frames in the redesign are conditional states of a route the app
 * already has — a failed load, an exhausted quota, a story mid-generation —
 * and reaching them by tapping around means breaking the network or burning
 * real quota. Each row here seeds the query cache and jumps to the real
 * screen, so the frame you want is two taps away.
 *
 * The cache overrides are sticky by design (see forceState.ts), so "Reset"
 * clears them; the app is back to live data afterwards.
 */
export function GalleryScreen() {
  const qc = useQueryClient();
  const [onlyHard, setOnlyHard] = useState(false);

  const open = (c: GalleryCase) => {
    clearForcedState(qc);
    // Every button on these screens is live. Without this, walking the
    // onboarding frames creates real child profiles, and the dev database is
    // the one production reads.
    setApiReadOnly(true);
    c.prepare?.(qc);
    router.push(c.route as never);
  };

  // On Expo Web this opens the frame in a second tab — the app on one screen,
  // the frame on the other, which is the whole point of the exercise.
  const openFigma = async (c: GalleryCase) => {
    if (c.nodeId === '—') {
      showToast({ type: 'info', message: '这一帧稿里没有（实现中新增的状态）' });
      return;
    }
    const url = `https://www.figma.com/design/${FIGMA_FILE}?node-id=${c.nodeId.replace(':', '-')}`;
    await Linking.openURL(url);
  };

  const shown = onlyHard ? GALLERY_CASES.filter(c => c.hardToReach) : GALLERY_CASES;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Text style={s.title}>Frame Gallery</Text>
        <Text style={s.sub}>
          {GALLERY_CASES.length} 个用例 · {GALLERY_CASES.filter(c => c.hardToReach).length} 个正常操作难以触发
        </Text>
        <Text style={s.sub}>
          打开任一用例即进入只读：写操作被拦截，不会污染数据库。Reset 解除。
        </Text>
        <View style={s.actions}>
          <Pressable style={[s.chip, onlyHard && s.chipOn]} onPress={() => setOnlyHard(v => !v)}>
            <Text style={[s.chipLabel, onlyHard && s.chipLabelOn]}>只看难触发的</Text>
          </Pressable>
          <Pressable
            style={s.chip}
            onPress={() => {
              clearForcedState(qc);
              setApiReadOnly(false);
              showToast({ type: 'success', message: '已恢复真实数据，写操作解除拦截' });
            }}
          >
            <Text style={s.chipLabel}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {GALLERY_MODULES.map((mod) => {
          // Ordered by where the screen falls in the flow, not by when the
          // case was written — walking a module top to bottom should follow
          // the path a user takes.
          const rows = shown
            .filter(c => c.module === mod)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          if (rows.length === 0) return null;
          return (
            <View key={mod} style={s.section}>
              <Text style={s.sectionTitle}>{mod}</Text>
              {rows.map((c) => (
                <View key={c.id} style={s.row}>
                  <Pressable style={s.rowMain} onPress={() => open(c)}>
                    <View style={s.rowTop}>
                      <Text style={s.rowLabel}>{c.label}</Text>
                      {c.hardToReach && <View style={s.badge}><Text style={s.badgeLabel}>难触发</Text></View>}
                    </View>
                    <Text style={s.rowMeta}>{c.nodeId} · {c.route}</Text>
                    {c.note && <Text style={s.rowNote}>{c.note}</Text>}
                  </Pressable>
                  <Pressable style={s.copyBtn} hitSlop={8} onPress={() => void openFigma(c)}>
                    <Text style={s.copyLabel}>Figma</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  title: { ...theme.typography.h1, color: theme.text.primary },
  sub: { ...theme.typography.caption, color: theme.text.secondary },
  actions: { flexDirection: 'row', gap: theme.spacing.s, marginTop: 4 },
  chip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },
  chipOn: { backgroundColor: theme.surface.brand, borderColor: theme.surface.brand },
  chipLabel: { ...theme.typography.caption, color: theme.text.primary },
  chipLabelOn: { color: theme.text.onColor },

  body: { paddingBottom: theme.spacing.safeBtm },
  section: { paddingTop: theme.spacing.l },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.text.secondary,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.border.default,
    gap: theme.spacing.m,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s },
  rowLabel: { ...theme.typography.body, color: theme.text.primary },
  rowMeta: { ...theme.typography.caption, color: theme.text.hint },
  rowNote: { ...theme.typography.caption, color: theme.text.warning },
  badge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.warningSubtle,
  },
  badgeLabel: { ...theme.typography.tagBadge, color: theme.text.warning },
  copyBtn: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
  },
  copyLabel: { ...theme.typography.caption, color: theme.text.brand },
});
