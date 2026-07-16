import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MEMORY_CONSTRAINTS, type Memory, type MemoryFile } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { PhotoSourceSheet } from '@/shared/components/PhotoSourceSheet';
import { usePhotoCamera, usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { showToast } from '@/features/ui/toast';

const MAX_PHOTOS = MEMORY_CONSTRAINTS.maxPhotos;
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

export function MemoryEditScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryQ = useAsset(id ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Edit Memory</Text>
        <View style={styles.navSpacer} />
      </View>

      {memoryQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : memoryQ.isError || !memoryQ.data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load memory.</Text>
          <Pressable onPress={() => memoryQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <EditForm key={memoryQ.data.id} memory={memoryQ.data} />
      )}
    </SafeAreaView>
  );
}

function EditForm({ memory }: { memory: Memory }) {
  const router = useRouter();
  const goBack = useGoBack();
  const updateAsset     = useUpdateAsset(memory.id);
  const deleteAsset     = useDeleteAsset();
  const pickFromLibrary = usePhotoPicker({ multiple: true });
  const takePhoto       = usePhotoCamera();

  const [noteText, setNoteText]               = useState(memory.textNote ?? '');
  const [removedFileIds, setRemovedFileIds]   = useState<Set<string>>(new Set());
  const [newPhotos, setNewPhotos]             = useState<PickedPhoto[]>([]);
  const [photoSourceVisible, setPhotoSourceVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const photoStripRef = useRef<ScrollView>(null);

  const remainingFiles = useMemo(
    () => memory.files.filter(f => !removedFileIds.has(f.id)),
    [memory.files, removedFileIds],
  );
  const totalPhotos = remainingFiles.length + newPhotos.length;

  // Auto-scroll the photo strip so the "+" button stays visible as photos are added.
  useEffect(() => {
    photoStripRef.current?.scrollToEnd({ animated: true });
  }, [totalPhotos]);

  const addPickedPhotos = (picked: PickedPhoto[]) => {
    if (picked.length === 0) return;
    setNewPhotos(prev => {
      const room = MAX_PHOTOS - remainingFiles.length - prev.length;
      const accepted = picked.slice(0, room);
      if (accepted.length < picked.length) {
        showToast({ type: 'warning', message: `Maximum ${MAX_PHOTOS} photos per memory.` });
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

  const handleRemoveExisting = (file: MemoryFile) => {
    setRemovedFileIds(prev => {
      const next = new Set(prev);
      next.add(file.id);
      return next;
    });
  };

  const handleRemoveNew = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (saving) return;
    if (totalPhotos === 0 && noteText.trim().length === 0) {
      setSaveError('Add a photo or note before saving.');
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

      showToast({ type: 'success', message: 'Memory saved' });
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
      await deleteAsset.mutateAsync({ id: memory.id, hard: true });
      // Detail page is now stale; pop both detail+edit so user lands on list.
      router.dismissAll();
      router.replace('/memory/list');
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to delete memory.');
      setDeleting(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Strip — existing files first, then newly picked */}
        <ScrollView
          ref={photoStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {remainingFiles.map(f => (
            <View key={f.id} style={styles.photoThumbWrap}>
              <Image source={{ uri: f.fileUrl }} style={styles.photoThumbImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemoveExisting(f)}
              >
                <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {newPhotos.map((p, i) => (
            <View key={`new-${p.uri}`} style={styles.photoThumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.photoThumbImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemoveNew(i)}
              >
                <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          {totalPhotos < MAX_PHOTOS && (
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
          {/* Tags */}
          <Pressable
            style={styles.detailRow}
            onPress={() => router.push(`/memory/tags?memoryId=${memory.id}`)}
          >
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>
                {memory.tags.length > 0
                  ? `${memory.tags[0]}${memory.tags.length > 1 ? ` +${memory.tags.length - 1}` : ''}`
                  : 'None'}
              </Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Date — read-only here; capture date is fixed at create */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(memory.capturedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        {saveError && <Text style={styles.errorInline}>{saveError}</Text>}
        <Pressable
          style={({ pressed }) => [styles.saveWrap, pressed && !saving && { opacity: 0.88 }]}
          onPress={handleSave}
          disabled={saving || deleting}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnLabel}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={saving || deleting}>
          <Text style={styles.deleteBtnLabel}>
            {deleting ? 'Deleting…' : 'Delete Memory'}
          </Text>
        </Pressable>
      </View>

      <PhotoSourceSheet
        visible={photoSourceVisible}
        onTakePhoto={() => void handleTakePhoto()}
        onChooseLibrary={() => void handleChooseFromLibrary()}
        onDismiss={() => setPhotoSourceVisible(false)}
      />
    </>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

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

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },

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
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },
  saveWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: palette.primary[50],
    overflow: 'hidden',
  },
  saveBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  deleteBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  deleteBtnLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.error,
  },
});
