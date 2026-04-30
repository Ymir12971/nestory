import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';
import { PaywallModal } from '@/shared/components/PaywallModal';

type SaveState = 'both_empty' | 'need_photos' | 'need_note' | 'active';

function getSaveState(hasPhotos: boolean, hasText: boolean): SaveState {
  if (hasPhotos && hasText)  return 'active';
  if (hasPhotos && !hasText) return 'need_note';
  if (!hasPhotos && hasText) return 'need_photos';
  return 'both_empty';
}

const SAVE_LABELS: Record<SaveState, string> = {
  both_empty:  'Save',
  need_photos: 'Add photos to Save',
  need_note:   'Add a note to Save',
  active:      'Save',
};

// TODO: derive from GET /subscriptions/me — highlightCount + highlightLimit
const MOCK_HL_COUNT = 7;
const MOCK_HL_LIMIT: number | null = 10; // null = Premium unlimited
// TODO: derive from GET /subscriptions/me
type HlSubStatus = 'free' | 'trial_ended' | 'premium_ended' | 'premium';
const MOCK_HL_SUB: HlSubStatus = 'free';

function getHlCaption(sub: HlSubStatus, count: number, limit: number): string {
  const K = sub === 'trial_ended' ? 'Trial' : 'Premium';
  return (sub === 'trial_ended' || sub === 'premium_ended')
    ? `${K} ended · ${count} / ${limit} Highlights used`
    : `Free plan · ${count} / ${limit} Highlights used`;
}

export function AddMemoryScreen() {
  const router = useRouter();
  const [noteText, setNoteText]       = useState('');
  const [isHighlight, setIsHighlight] = useState(false);
  const [photos, setPhotos]           = useState<string[]>([]);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const hlLocked = MOCK_HL_LIMIT != null && MOCK_HL_COUNT >= MOCK_HL_LIMIT;

  const hasPhotos   = photos.length > 0;
  const hasText     = noteText.trim().length > 0;
  const saveState   = getSaveState(hasPhotos, hasText);
  const canSave     = saveState === 'active';

  const handleSave = () => {
    if (!canSave) return;
    // TODO: wire to POST /assets (memory create API)
    router.back();
  };

  const handleAddPhoto = () => {
    // TODO(expo-image-picker): replace with real picker
    // See docs/dev/PENDING_INTEGRATION_TODOS.md
    setPhotos(prev => [...prev, `placeholder_${Date.now()}`]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>New Memory</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((_, i) => (
            <View key={i} style={styles.photoThumbWrap}>
              {/* TODO: replace with <Image source={...}> when picker is wired */}
              <View style={styles.photoThumbImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemovePhoto(i)}
              >
                <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.photoAdd} onPress={handleAddPhoto}>
            <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
          </Pressable>
        </ScrollView>

        {/* Note Input */}
        <TextInput
          style={styles.noteInput}
          placeholder="What happened today…"
          placeholderTextColor={theme.text.hint}
          multiline
          textAlignVertical="top"
          value={noteText}
          onChangeText={setNoteText}
        />

        {/* Details List */}
        <View style={styles.detailsList}>
          {/* Tags */}
          <Pressable style={styles.detailRow} onPress={() => router.push('/memory/tags')}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>Playtime +4</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Date */}
          <Pressable style={styles.detailRow} onPress={() => router.push('/memory/date')}>
            <Text style={styles.detailLabel}>Date</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>Today, Mar 15</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Highlight toggle — Locked when Free user at limit → Paywall B */}
          <Pressable
            style={styles.detailRow}
            onPress={hlLocked ? () => setPaywallVisible(true) : undefined}
          >
            <Text style={styles.detailLabel}>Mark as Highlight</Text>
            <Switch
              value={isHighlight}
              onValueChange={hlLocked ? () => setPaywallVisible(true) : setIsHighlight}
              trackColor={{ true: theme.surface.brand, false: theme.border.strong }}
              thumbColor={theme.surface.card}
              disabled={hlLocked}
            />
          </Pressable>
          {hlLocked && MOCK_HL_LIMIT != null && (
            <View style={styles.hlCaptionWrap}>
              <Text style={styles.hlCaption}>
                {getHlCaption(MOCK_HL_SUB, MOCK_HL_COUNT, MOCK_HL_LIMIT)}
              </Text>
            </View>
          )}

          {/* Cover photo sub-row — visible when highlight on + ≥2 photos */}
          {!hlLocked && isHighlight && photos.length >= 2 && (
            <>
              <View style={styles.rowDivider} />
              <Pressable style={styles.detailRow} onPress={() => router.push('/memory/cover')}>
                <Text style={styles.detailLabelBrand}>Change cover photo</Text>
                <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        variant="B"
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />

      {/* Save CTA */}
      <View style={styles.cta}>
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>
            {SAVE_LABELS[saveState]}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // NavBar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    height: 56,
  },
  navTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  navSpacer: {
    width: 24,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },

  // Photo strip
  photoStrip: {
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.s,
  },
  photoThumbWrap: {
    width: THUMB,
    height: THUMB,
  },
  photoThumbImg: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.s,
    backgroundColor: theme.border.strong,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.s,
    borderWidth: 1.5,
    borderColor: theme.border.default,
    borderStyle: 'dashed',
    backgroundColor: theme.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Note input
  noteInput: {
    height: 160,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  // Details list
  detailsList: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.l,
    minHeight: 46,
    paddingVertical: theme.spacing.m,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.border.default,
    marginHorizontal: theme.spacing.l,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  detailLabelBrand: {
    ...theme.typography.body,
    color: theme.text.brand,
  },
  hlCaptionWrap: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: 6,
  },
  hlCaption: {
    ...theme.typography.tagBadge,
    color: theme.text.secondary,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },

  // CTA
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
  },
  saveButton: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.surface.disabled,
  },
  saveLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  saveLabelDisabled: {
    color: theme.text.disabled,
  },
});
