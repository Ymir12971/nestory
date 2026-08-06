import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MOMENT_CONSTRAINTS, type Moment, type MomentFile } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { PhotoSourceSheet } from '@/shared/components/PhotoSourceSheet';
import { usePhotoCamera, usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { showToast } from '@/features/ui/toast';

const MAX_PHOTOS = MOMENT_CONSTRAINTS.maxPhotos;
import {
  uploadPhoto,
  useAsset,
  useDeleteAsset,
  useUpdateAsset,
} from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MomentEditScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const momentQ = useAsset(id ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* The loaded state renders its own NavBar so Save can live in the right
          slot (743:4824); these placeholder states just need the bar. */}
      {(momentQ.isLoading || momentQ.isError || !momentQ.data) && (
        <NavBar title="Edit Memory" onBack={goBack} />
      )}

      {momentQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : momentQ.isError || !momentQ.data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load moment.</Text>
          <Pressable onPress={() => momentQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <EditForm key={momentQ.data.id} moment={momentQ.data} />
      )}
    </SafeAreaView>
  );
}

function EditForm({ moment }: { moment: Moment }) {
  const router = useRouter();
  const goBack = useGoBack();
  const updateAsset     = useUpdateAsset(moment.id);
  const deleteAsset     = useDeleteAsset();
  const pickFromLibrary = usePhotoPicker({ multiple: true });
  const takePhoto       = usePhotoCamera();

  const [noteText, setNoteText]               = useState(moment.textNote ?? '');
  const [removedFileIds, setRemovedFileIds]   = useState<Set<string>>(new Set());
  const [newPhotos, setNewPhotos]             = useState<PickedPhoto[]>([]);
  const [photoSourceVisible, setPhotoSourceVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const remainingFiles = useMemo(
    () => moment.files.filter(f => !removedFileIds.has(f.id)),
    [moment.files, removedFileIds],
  );
  const totalPhotos = remainingFiles.length + newPhotos.length;

  const addPickedPhotos = (picked: PickedPhoto[]) => {
    if (picked.length === 0) return;
    setNewPhotos(prev => {
      const room = MAX_PHOTOS - remainingFiles.length - prev.length;
      const accepted = picked.slice(0, room);
      if (accepted.length < picked.length) {
        showToast({ type: 'warning', message: `Maximum ${MAX_PHOTOS} photos per moment.` });
      }
      return [...prev, ...accepted];
    });
  };

  const handleOpenAddPhoto = () => {
    if (totalPhotos >= MAX_PHOTOS) return;
    setPhotoSourceVisible(true);
  };

  const handleTakePhoto = async () => {
    setPhotoSourceVisible(false);
    addPickedPhotos(await takePhoto());
  };

  const handleChooseFromLibrary = async () => {
    setPhotoSourceVisible(false);
    addPickedPhotos(await pickFromLibrary({ selectionLimit: MAX_PHOTOS - totalPhotos }));
  };

  const handleRemoveExisting = (file: MomentFile) => {
    setRemovedFileIds(prev => {
      const next = new Set(prev);
      next.add(file.id);
      return next;
    });
  };

  const handleRemoveNew = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Redesign save rule: text required (photos optional) — same as Add Moment.
  const onChangeNote = (text: string) => {
    if (text.length > MOMENT_CONSTRAINTS.maxTextChars) {
      showToast({ type: 'warning', message: `Notes are limited to ${MOMENT_CONSTRAINTS.maxTextChars} characters.` });
      setNoteText(text.slice(0, MOMENT_CONSTRAINTS.maxTextChars));
      return;
    }
    setNoteText(text);
  };

  const handleSave = async () => {
    if (saving) return;
    if (MOMENT_CONSTRAINTS.textRequiredToSave && noteText.trim().length === 0) {
      setSaveError('Add a note before saving.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const uploaded = newPhotos.length > 0
        ? await Promise.all(newPhotos.map(p => uploadPhoto(p, 'memories')))
        : [];

      await updateAsset.mutateAsync({
        textNote: noteText.trim(),
        ...(uploaded.length > 0      ? { addFiles:      uploaded } : {}),
        ...(removedFileIds.size > 0  ? { removeFileIds: [...removedFileIds] } : {}),
      });

      showToast({ type: 'success', message: 'Moment saved' });
      goBack();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setSaveError(null);
    setDeleting(true);
    try {
      await deleteAsset.mutateAsync({ id: moment.id, hard: true });
      // Detail page is now stale; pop both detail+edit so the user lands back on
      // the Home timeline (annotation: 编辑或删除完成后回到 Memory 列表).
      router.dismissAll();
      router.replace('/');
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to delete moment.');
      setDeleting(false);
    }
  };

  return (
    <>
      {/* NavBar Type=withButton (743:4824) — Save sits in the right slot */}
      <NavBar
        title="Edit Memory"
        onBack={goBack}
        right={
          <Button
            label={saving ? 'Saving…' : 'Save'}
            type="small"
            disabled={saving || deleting}
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
        {/* memoryInput first, photo grid under it (743:4826 / 744:2748) */}
        <TextInput
          style={[styles.noteInput, noteText.length > 0 && styles.noteInputFilled]}
          placeholder="A quick note about the day."
          placeholderTextColor={theme.text.hint}
          multiline
          textAlignVertical="top"
          value={noteText}
          onChangeText={onChangeNote}
        />

        <View style={styles.photoGrid}>
          {remainingFiles.map((f) => (
            <View key={f.id} style={styles.photoCell}>
              <Image source={{ uri: f.fileUrl }} style={styles.photoCellImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemoveExisting(f)}
              >
                <RemixIcon name="close-line" size={24} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {newPhotos.map((p, i) => (
            <View key={`new-${p.uri}`} style={styles.photoCell}>
              <Image source={{ uri: p.uri }} style={styles.photoCellImg} />
              <Pressable style={styles.deleteBadge} hitSlop={6} onPress={() => handleRemoveNew(i)}>
                <RemixIcon name="close-line" size={24} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {totalPhotos < MAX_PHOTOS && (
            <Pressable style={styles.photoAdd} onPress={handleOpenAddPhoto}>
              <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
            </Pressable>
          )}
        </View>

        {/* detailsList 774:3685 — the frame only draws Memory Date; the Tags row
            is kept because Tags ship as a feature. */}
        <View style={styles.detailsList}>
          <Pressable
            style={styles.detailRow}
            onPress={() => router.push(`/moment/tags?momentId=${moment.id}`)}
          >
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>
                {moment.tags.length > 0
                  ? `${moment.tags[0]}${moment.tags.length > 1 ? ` +${moment.tags.length - 1}` : ''}`
                  : 'None'}
              </Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.hint} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Memory Date — read-only here; capture date is fixed at create */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Memory Date</Text>
            <Text style={styles.detailValue}>{formatDate(moment.capturedAt)}</Text>
          </View>
        </View>

        {saveError && <Text style={styles.errorInline}>{saveError}</Text>}
      </ScrollView>

      {/* cta 743:4885 — the footer only carries Delete Memory */}
      <View style={styles.cta}>
        <Button
          label={deleting ? 'Deleting…' : 'Delete Memory'}
          type="destructive"
          style={styles.deleteBtn}
          disabled={saving || deleting}
          onPress={() => setDeleteConfirmVisible(true)}
        />
      </View>

      {/* H-04 / Sheet · Delete Memory Confirm (annotation copy) */}
      <BottomSheet
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={sheetSection.title}>
          <Text style={styles.sheetTitle}>Delete this memory?</Text>
        </View>
        <View style={sheetSection.body}>
          <Text style={styles.sheetBody}>
            This can't be undone. All photos and notes in this memory will be permanently removed.
          </Text>
        </View>
        <View style={sheetSection.cta}>
          <Button
            label={deleting ? 'Deleting…' : 'Delete Memory'}
            type="destructive"
            disabled={deleting}
            onPress={() => {
              setDeleteConfirmVisible(false);
              void handleDelete();
            }}
          />
          <Button label="Cancel" type="text" onPress={() => setDeleteConfirmVisible(false)} />
        </View>
      </BottomSheet>

      <PhotoSourceSheet
        visible={photoSourceVisible}
        onTakePhoto={() => void handleTakePhoto()}
        onChooseLibrary={() => void handleChooseFromLibrary()}
        onDismiss={() => setPhotoSourceVisible(false)}
      />
    </>
  );
}

// 3 × 107 + 2 × 16 = 353, the padded body width
const PHOTO_CELL = 107;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  // body 743:4825
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingTop: theme.spacing.l, // 16
    paddingBottom: theme.spacing.safeBtm, // 34
    gap: theme.spacing.l, // 16
  },

  // Photo grid 744:2748 — same geometry as the Add page
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.l,
  },
  photoCell: {
    width: PHOTO_CELL,
    height: PHOTO_CELL,
    borderRadius: theme.radius.m,
    backgroundColor: palette.neutral[200],
    overflow: 'hidden',
  },
  photoCellImg: { width: PHOTO_CELL, height: PHOTO_CELL },
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

  noteInput: {
    height: 144,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  noteInputFilled: { borderColor: theme.border.strong },

  detailsList: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m, // 10
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

  sheetTitle: { ...theme.typography.h1, color: theme.text.primary },
  sheetBody: { ...theme.typography.body, color: theme.text.primary },
  detailLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    ...theme.typography.caption, // Inter 14/16
    color: theme.text.secondary,
  },

  // cta 743:4885 — pt4 / pb SafeBtm, gap 8
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },
  // The design instances the DS Destructive button at 44 tall here
  deleteBtn: { height: 44 },
  deleteBtnLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.error,
  },
});
