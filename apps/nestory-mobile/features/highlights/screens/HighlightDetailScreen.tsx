import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Highlight } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useDeleteHighlight, useHighlight, useUpdateHighlight } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

function formatFullDate(capturedAt: string): string {
  return new Date(capturedAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function pickCoverUrl(item: Highlight): string | null {
  if (item.renderedImageUrl) return item.renderedImageUrl;
  return item.asset.fileUrls[0] ?? null;
}

export function HighlightDetailScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const highlightQ = useHighlight(id ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Highlight</Text>
        <View style={styles.navSpacer} />
      </View>

      {highlightQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : highlightQ.isError || !highlightQ.data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load highlight.</Text>
          <Pressable onPress={() => highlightQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <Body key={highlightQ.data.id} item={highlightQ.data} />
      )}
    </SafeAreaView>
  );
}

function Body({ item }: { item: Highlight }) {
  const router = useRouter();
  const goBack = useGoBack();
  const { width } = useWindowDimensions();
  const updateHighlight = useUpdateHighlight(item.id);
  const deleteHighlight = useDeleteHighlight();

  const [editVisible, setEditVisible]     = useState(false);
  const [removeVisible, setRemoveVisible] = useState(false);
  const [draftTitle, setDraftTitle]       = useState('');
  const [actionError, setActionError]     = useState<string | null>(null);

  const coverUrl = pickCoverUrl(item);
  const coverW = width - theme.spacing.l * 2;
  const coverH = item.coverOrientation === 'portrait'
    ? Math.round(coverW * 4 / 3)
    : Math.round(coverW * 3 / 4);

  const handleShare = async () => {
    try {
      await Share.share({
        message: item.title ?? 'Highlight',
        url:     coverUrl ?? undefined,
      });
    } catch {
      /* user dismissed */
    }
  };

  const handleConfirmRemove = async () => {
    setActionError(null);
    try {
      await deleteHighlight.mutateAsync(item.id);
      setRemoveVisible(false);
      goBack();
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to remove highlight.');
    }
  };

  const handleOpenEdit = () => {
    setDraftTitle(item.title ?? '');
    setEditVisible(true);
  };

  const handleSaveTitle = async () => {
    setActionError(null);
    try {
      await updateHighlight.mutateAsync({ title: draftTitle.trim() || null });
      setEditVisible(false);
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to update title.');
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={[styles.coverPhoto, { width: coverW, height: coverH }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPhoto, { width: coverW, height: coverH }]} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.info}>
            <Text style={styles.dateText}>{formatFullDate(item.asset.capturedAt)}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={2}>{item.title ?? '—'}</Text>
              <Pressable hitSlop={8} onPress={handleOpenEdit}>
                <RemixIcon name="pencil-line" size={20} color={theme.text.secondary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.viewMemoryBtn}
            onPress={() => router.push(`/memory/${item.assetId}`)}
          >
            <Text style={styles.viewMemoryLabel}>View original memory →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.cta}>
        {actionError && <Text style={styles.errorInline}>{actionError}</Text>}
        <Pressable
          style={({ pressed }) => [styles.shareButtonWrap, pressed && { opacity: 0.85 }]}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonLabel}>Share Highlight</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.removeBtn} onPress={() => setRemoveVisible(true)}>
          <Text style={styles.removeLabel}>Remove Highlight</Text>
        </Pressable>
      </View>

      {/* Sheet · Edit Highlight Title */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdrop} onPress={() => setEditVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle}><View style={styles.sheetHandleBar} /></View>
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Edit Highlight Title</Text>
              <TextInput
                style={styles.titleInput}
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Enter title"
                placeholderTextColor={theme.text.hint}
                maxLength={80}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={draftTitle.trim() ? handleSaveTitle : undefined}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sheetPrimaryWrap,
                  (!draftTitle.trim() || pressed || updateHighlight.isPending) && { opacity: 0.5 },
                ]}
                onPress={handleSaveTitle}
                disabled={!draftTitle.trim() || updateHighlight.isPending}
              >
                <LinearGradient
                  colors={[palette.primary[500], palette.primary[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sheetPrimaryBtn}
                >
                  <Text style={styles.sheetPrimaryLabel}>
                    {updateHighlight.isPending ? 'Saving…' : 'Save'}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.sheetTextBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.sheetTextBtnLabel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sheet · Remove Highlight Confirm */}
      <Modal
        visible={removeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRemoveVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setRemoveVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle}><View style={styles.sheetHandleBar} /></View>
            <View style={styles.sheetContent}>
              <View style={styles.sheetTextBlock}>
                <Text style={styles.sheetHeadline}>Remove this Highlight?</Text>
                <Text style={styles.sheetCaption}>
                  {"This will permanently delete this Highlight. You can't undo this."}
                </Text>
              </View>
              <Pressable
                style={[styles.sheetDestructiveBtn, deleteHighlight.isPending && { opacity: 0.5 }]}
                onPress={handleConfirmRemove}
                disabled={deleteHighlight.isPending}
              >
                <Text style={styles.sheetDestructiveLabel}>
                  {deleteHighlight.isPending ? 'Removing…' : 'Remove Highlight'}
                </Text>
              </Pressable>
              <Pressable style={styles.sheetTextBtn} onPress={() => setRemoveVisible(false)}>
                <Text style={styles.sheetTextBtnLabel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  scrollContent: { paddingBottom: theme.spacing.m },

  hero: {
    paddingHorizontal: theme.spacing.l,
    alignItems: 'center',
  },
  coverPhoto: {
    borderRadius: theme.radius.l,
    backgroundColor: theme.border.default,
  },

  content: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.m,
  },

  info: { gap: 6 },
  dateText: { ...theme.typography.caption, color: theme.text.secondary },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    ...theme.typography.h2,
    color: theme.text.primary,
    flex: 1,
    paddingRight: theme.spacing.s,
  },

  viewMemoryBtn: {
    height: 44,
    minWidth: 110,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  viewMemoryLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },

  cta: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },
  shareButtonWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  shareButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonLabel: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
  removeBtn: { alignItems: 'center', paddingVertical: theme.spacing.s },
  removeLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.error,
  },

  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.surface.card,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  sheetHandle: { height: 28, alignItems: 'center', justifyContent: 'center' },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: theme.border.default,
  },
  sheetContent: {
    gap: 16,
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.safeBtm,
  },
  sheetTitle: { ...theme.typography.h2, color: theme.text.primary },
  sheetTextBlock: { gap: 12 },
  sheetHeadline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 38,
    color: theme.text.primary,
  },
  sheetCaption: { ...theme.typography.caption, color: theme.text.secondary },
  titleInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.l,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: theme.text.primary,
    backgroundColor: theme.surface.card,
  },
  sheetPrimaryWrap: {
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: palette.primary[50],
    overflow: 'hidden',
  },
  sheetPrimaryBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryLabel: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
  sheetDestructiveBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.text.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDestructiveLabel: { ...theme.typography.buttonLabelM, color: theme.text.error },
  sheetTextBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  sheetTextBtnLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },
});
