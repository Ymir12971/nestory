import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MEMORY_CONSTRAINTS } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { PhotoSourceSheet } from '@/shared/components/PhotoSourceSheet';
import { TagPickerSheet } from '@/shared/components/TagPickerSheet';
import { DateTimePickerSheet } from '@/shared/components/DateTimePickerSheet';
import { usePhotoCamera, usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { uploadPhoto, useChildren, useCreateAsset } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { showToast } from '@/features/ui/toast';

const MAX_PHOTOS = MEMORY_CONSTRAINTS.maxPhotos;

function formatCapturedAt(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

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

export function AddMemoryScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const pickFromLibrary = usePhotoPicker({ multiple: true });
  const takePhoto       = usePhotoCamera();
  const childrenQ = useChildren();
  const createAsset     = useCreateAsset();
  const [noteText, setNoteText]       = useState('');
  const [photos, setPhotos]           = useState<PickedPhoto[]>([]);
  const [tags, setTags]               = useState<string[]>([]);
  const [capturedAt, setCapturedAt]   = useState(() => new Date());
  const [photoSourceVisible, setPhotoSourceVisible] = useState(false);
  const [tagSheetVisible, setTagSheetVisible] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoStripRef = useRef<ScrollView>(null);

  const hasPhotos   = photos.length > 0;
  const hasText     = noteText.trim().length > 0;
  const saveState   = getSaveState(hasPhotos, hasText);
  const canSave     = saveState === 'active' && !saving;

  const children = childrenQ.data ?? [];
  const activeChildId =
    children.find(c => c.isActive)?.id ?? children[0]?.id ?? null;

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
        ...(tags.length > 0 ? { tagValues: tags } : {}),
        files: uploaded,
      });

      goBack();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-scroll the photo strip so the "+" button stays visible as photos are added.
  useEffect(() => {
    photoStripRef.current?.scrollToEnd({ animated: true });
  }, [photos.length]);

  const addPickedPhotos = (picked: PickedPhoto[]) => {
    if (picked.length === 0) return;
    setPhotos(prev => {
      const room = MAX_PHOTOS - prev.length;
      const accepted = picked.slice(0, room);
      if (accepted.length < picked.length) {
        showToast({ type: 'warning', message: 'Maximum 10 photos per memory.' });
      }
      return [...prev, ...accepted];
    });
  };

  const handleOpenAddPhoto = () => {
    if (photos.length >= MAX_PHOTOS) return;
    setPhotoSourceVisible(true);
  };

  const handleTakePhoto = async () => {
    setPhotoSourceVisible(false);
    addPickedPhotos(await takePhoto());
  };

  const handleChooseFromLibrary = async () => {
    setPhotoSourceVisible(false);
    addPickedPhotos(await pickFromLibrary({ selectionLimit: MAX_PHOTOS - photos.length }));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
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
          ref={photoStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((p, i) => (
            <View key={p.uri} style={styles.photoThumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.photoThumbImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemovePhoto(i)}
              >
                <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable style={styles.photoAdd} onPress={handleOpenAddPhoto}>
              <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
            </Pressable>
          )}
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
          <Pressable style={styles.detailRow} onPress={() => setTagSheetVisible(true)}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailRight}>
              {tags.length > 0 ? (
                <>
                  {tags.slice(0, 3).map(tag => (
                    <View key={tag} style={styles.miniChip}>
                      <Text style={styles.miniChipLabel}>{tag}</Text>
                    </View>
                  ))}
                  {tags.length > 3 && (
                    <Text style={styles.detailValue}>+{tags.length - 3} more</Text>
                  )}
                </>
              ) : (
                <Text style={styles.detailValue}>Add tags</Text>
              )}
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          <Pressable style={styles.detailRow} onPress={() => setDateSheetVisible(true)}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>{formatCapturedAt(capturedAt)}</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <PhotoSourceSheet
        visible={photoSourceVisible}
        onTakePhoto={() => void handleTakePhoto()}
        onChooseLibrary={() => void handleChooseFromLibrary()}
        onDismiss={() => setPhotoSourceVisible(false)}
      />

      <TagPickerSheet
        visible={tagSheetVisible}
        selected={tags}
        onDone={setTags}
        onDismiss={() => setTagSheetVisible(false)}
      />

      <DateTimePickerSheet
        visible={dateSheetVisible}
        value={capturedAt}
        onConfirm={setCapturedAt}
        onDismiss={() => setDateSheetVisible(false)}
      />

      {/* Save CTA */}
      <View style={styles.cta}>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <Pressable
          style={({ pressed }) => [styles.saveBtnWrap, pressed && canSave && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {canSave ? (
            <LinearGradient
              colors={[palette.primary[500], palette.primary[400]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Text style={styles.saveLabel}>
                {saving ? 'Saving…' : SAVE_LABELS[saveState]}
              </Text>
            </LinearGradient>
          ) : (
            <View style={[styles.saveButton, styles.saveButtonDisabled]}>
              <Text style={[styles.saveLabel, styles.saveLabelDisabled]}>
                {saving ? 'Saving…' : SAVE_LABELS[saveState]}
              </Text>
            </View>
          )}
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
    borderRadius: theme.radius.m,
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
    borderRadius: theme.radius.m,
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
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  miniChip: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brandSubtle,
  },
  miniChipLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.brand,
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
