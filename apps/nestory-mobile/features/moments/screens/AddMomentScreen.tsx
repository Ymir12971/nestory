import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MOMENT_CONSTRAINTS } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { DateTimePickerSheet } from '@/shared/components/DateTimePickerSheet';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { uploadPhoto, useChildren, useCreateAsset } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { showToast } from '@/features/ui/toast';
import { track } from '@/shared/lib/analytics';

const MAX_PHOTOS = MOMENT_CONSTRAINTS.maxPhotos;

function formatCapturedAt(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export function AddMomentScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const pickFromLibrary = usePhotoPicker({ multiple: true });
  const childrenQ = useChildren();
  const createAsset     = useCreateAsset();
  // Entry mode from the Add Moment popup: note (keyboard fast path) or album
  // (launch picker first). Undefined = plain open.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [noteText, setNoteText]       = useState('');
  const [photos, setPhotos]           = useState<PickedPhoto[]>([]);
  const [capturedAt, setCapturedAt]   = useState(() => new Date());
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Redesign save rule: text is the ONLY activation condition — photos alone
  // can't save, text alone can (MOMENT_CONSTRAINTS.textRequiredToSave).
  const hasText     = noteText.trim().length > 0;
  const canSave     = (MOMENT_CONSTRAINTS.textRequiredToSave ? hasText : hasText || photos.length > 0) && !saving;

  // Cap note length; exceeding shows a 2s toast (H-Add "Just a note" annotation).
  const onChangeNote = (text: string) => {
    if (text.length > MOMENT_CONSTRAINTS.maxTextChars) {
      showToast({ type: 'warning', message: `Notes are limited to ${MOMENT_CONSTRAINTS.maxTextChars} characters.` });
      setNoteText(text.slice(0, MOMENT_CONSTRAINTS.maxTextChars));
      return;
    }
    setNoteText(text);
  };

  const children = childrenQ.data ?? [];
  const activeChild = children.find(c => c.isActive) ?? children[0];
  const activeChildId = activeChild?.id ?? null;
  // Placeholder is name-personalised in the design ("A quick note about Emma's day.")
  const activeChildName = activeChild?.name ?? 'your little one';

  const handleSave = async () => {
    if (!canSave) return;
    if (!activeChildId) {
      setSaveError('No active child profile found.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const uploaded = await Promise.all(
        photos.map((p, i) =>
          uploadPhoto(p, 'memories').then(meta => ({ ...meta, displayOrder: i })),
        ),
      );

      await createAsset.mutateAsync({
        childId:    activeChildId,
        capturedAt: capturedAt.toISOString(),
        ...(noteText.trim() ? { textNote: noteText.trim() } : {}),
        files: uploaded,
      });

      const now = new Date();
      track('moment_saved', {
        photoCount: photos.length,
        charCount:  noteText.trim().length,
        isBackfill: capturedAt.getFullYear() !== now.getFullYear() ||
                    capturedAt.getMonth() !== now.getMonth(),
      });

      goBack();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save moment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // The album entry mode launches the picker once on mount ('note' is handled
  // by autoFocus on the text input).
  const modeLaunched = useRef(false);
  useEffect(() => {
    if (modeLaunched.current) return;
    modeLaunched.current = true;
    if (mode === 'album') {
      void pickFromLibrary({ selectionLimit: MAX_PHOTOS }).then(addPickedPhotos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPickedPhotos = (picked: PickedPhoto[]) => {
    if (picked.length === 0) return;
    setPhotos(prev => {
      const room = MAX_PHOTOS - prev.length;
      const accepted = picked.slice(0, room);
      if (accepted.length < picked.length) {
        showToast({ type: 'warning', message: `Maximum ${MAX_PHOTOS} photos per moment.` });
      }
      return [...prev, ...accepted];
    });
  };

  // The "+" goes straight to the album — no source sheet, the product doesn't
  // take photos (Justin 2026-09-04).
  const handleOpenAddPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    addPickedPhotos(await pickFromLibrary({ selectionLimit: MAX_PHOTOS - photos.length }));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar Type=withButton (742:3083) — Save lives here, not in a footer */}
      <NavBar
        title="Add Moment"
        onBack={goBack}
        right={
          <Button
            label={saving ? 'Saving…' : 'Save'}
            type="small"
            disabled={!canSave}
            onPress={handleSave}
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* memoryInput (742:3148) — the note comes first in the design, with the
            photo grid under it. autoFocus on the "Just a Note" fast path so the
            keyboard slides up immediately (annotation). */}
        <TextInput
          style={[styles.noteInput, noteText.length > 0 && styles.noteInputFilled]}
          placeholder={`A quick note about ${activeChildName}'s day.`}
          placeholderTextColor={theme.text.hint}
          multiline
          textAlignVertical="top"
          value={noteText}
          onChangeText={onChangeNote}
          autoFocus={mode === 'note'}
        />

        {/* Photo grid 742:3086 — 3 columns of 107px cells, 16 apart */}
        <View style={styles.photoGrid}>
          {photos.map((p, i) => (
            <View key={p.uri} style={styles.photoCell}>
              <Image source={{ uri: p.uri }} style={styles.photoCellImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemovePhoto(i)}
              >
                <RemixIcon name="close-line" size={24} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable style={styles.photoAdd} onPress={() => void handleOpenAddPhoto()}>
              <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
            </Pressable>
          )}
        </View>

        {/* detailsList 742:3153 — Memory Date only, matching the frame. Tags
            were removed from the product (Justin 2026-08-09). */}
        <View style={styles.detailsList}>

          <Pressable style={styles.detailRow} onPress={() => setDateSheetVisible(true)}>
            <Text style={styles.detailLabel}>Moment Date</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>{formatCapturedAt(capturedAt)}</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.hint} />
            </View>
          </Pressable>
        </View>

        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      </ScrollView>

      <DateTimePickerSheet
        visible={dateSheetVisible}
        value={capturedAt}
        onConfirm={setCapturedAt}
        onDismiss={() => setDateSheetVisible(false)}
      />

    </SafeAreaView>
  );
}

// Photo cells are 107 across a 353-wide body: 3 × 107 + 2 × 16 = 353 exactly.
const PHOTO_CELL = 107;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // body 742:3147
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingTop: theme.spacing.l, // 16
    paddingBottom: theme.spacing.safeBtm, // 34
    gap: theme.spacing.l, // 16
  },

  // memoryInput — MultiLine Input, border/default while empty and border/strong
  // once it has content (DS Input state rule)
  noteInput: {
    height: 144,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s, // 6
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m, // 12
    ...theme.typography.body,
    color: theme.text.primary,
  },
  noteInputFilled: { borderColor: theme.border.strong },

  // Photo grid 742:3086
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.l, // 16 on both axes
  },
  photoCell: {
    width: PHOTO_CELL,
    height: PHOTO_CELL,
    borderRadius: theme.radius.m,
    backgroundColor: palette.neutral[200],
    overflow: 'hidden',
  },
  photoCellImg: { width: PHOTO_CELL, height: PHOTO_CELL },
  // 46:124 — 24px overlay-65 puck at (79, 4) inside the 107 cell
  deleteBadge: {
    position: 'absolute',
    top: 4,
    left: 79,
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoAdd: {
    width: PHOTO_CELL,
    height: PHOTO_CELL,
    borderRadius: theme.radius.m,
    borderWidth: 1.5,
    borderColor: theme.border.default,
    backgroundColor: theme.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // detailsList 742:3153 — radius/m, rows px16 / py14
  detailsList: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.border.default,
  },
  detailLabel: {
    ...theme.typography.body,
    lineHeight: 22, // 742:3163
    color: theme.text.primary,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    justifyContent: 'flex-end',
    gap: 6,
  },
  detailValue: {
    ...theme.typography.caption, // Inter 14/16
    color: theme.text.secondary,
  },
  // CTA
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },
  saveBtnWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  saveButton: {
    height: 52,
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
