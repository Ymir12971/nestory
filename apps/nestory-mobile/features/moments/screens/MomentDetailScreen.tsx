import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Moment } from '@nestory/types';
import { theme } from '@/shared/theme';
import { useAsset, useSubscription } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { FullscreenPhotoViewer } from '@/shared/components/FullscreenPhotoViewer';
import { MomentEditGateSheet } from '@/shared/components/MomentEditGateSheet';
import { PaywallModal } from '@/shared/components/PaywallModal';

const SCREEN_W = Dimensions.get('window').width;

const PHOTO_CENTER_W = 225;
const PHOTO_CENTER_H = 300;
const PHOTO_SIDE_W   = 195;
const PHOTO_SIDE_H   = 260;
const PHOTO_GAP      = 12;
const CAROUSEL_PADDING = (SCREEN_W - PHOTO_CENTER_W) / 2;

function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export function MomentDetailScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const momentQ = useAsset(id ?? null);

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top, backgroundColor: theme.surface.default }} />

      {momentQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : momentQ.isError || !momentQ.data ? (
        <View style={styles.center}>
          <View style={styles.navBar}>
            <Pressable hitSlop={8} onPress={goBack}>
              <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
            </Pressable>
            <Text style={styles.navTitle}>Moment</Text>
            <View style={styles.navSpacer} />
          </View>
          <Text style={styles.errorText}>Failed to load moment.</Text>
          <Pressable onPress={() => momentQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <Body moment={momentQ.data} />
      )}

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function Body({ moment }: { moment: Moment }) {
  const router = useRouter();
  const goBack = useGoBack();
  const subQ = useSubscription();
  const dotCount = moment.files.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [gateVisible, setGateVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const isPremium =
    subQ.data?.subscriptionStatus === 'premium_active' ||
    subQ.data?.subscriptionStatus === 'trial_active';

  // Current month (isEditable) → straight to edit. Past month: Premium sees a
  // regenerate heads-up first; Free sees the upgrade gate.
  const onEditPress = () => {
    if (moment.isEditable) router.push(`/moment/${moment.id}/edit`);
    else setGateVisible(true);
  };

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (PHOTO_CENTER_W + PHOTO_GAP));
    setActiveIndex(Math.max(0, Math.min(dotCount - 1, idx)));
  };

  return (
    <>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Moment</Text>
        <Pressable hitSlop={8} onPress={onEditPress}>
          <Text style={styles.editButton}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {moment.files.length > 0 && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={PHOTO_CENTER_W + PHOTO_GAP}
              decelerationRate="fast"
              onMomentumScrollEnd={onCarouselScroll}
              style={styles.carouselScroll}
              contentContainerStyle={[
                styles.carouselContent,
                { paddingHorizontal: CAROUSEL_PADDING },
              ]}
            >
              {moment.files.map((f, i) => (
                <Pressable key={f.id} onPress={() => setViewerIndex(i)}>
                  <Image
                    source={{ uri: f.fileUrl }}
                    style={[
                      styles.photoCenter,
                      i < moment.files.length - 1 ? { marginRight: PHOTO_GAP } : null,
                    ]}
                  />
                </Pressable>
              ))}
            </ScrollView>

            {dotCount > 1 && (
              <View style={styles.dots}>
                {Array.from({ length: dotCount }).map((_, i) => (
                  <View key={i} style={i === activeIndex ? styles.dotActive : styles.dotInactive} />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.body}>
          {moment.textNote ? (
            <Text style={styles.noteText}>{moment.textNote}</Text>
          ) : null}

          {moment.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {moment.tags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagLabel}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <RemixIcon name="time-line" size={16} color={theme.text.secondary} />
            <Text style={styles.metaText}>{formatCapturedAt(moment.capturedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      <FullscreenPhotoViewer
        visible={viewerIndex !== null}
        photoUrls={moment.files.map(f => f.fileUrl)}
        initialIndex={viewerIndex ?? 0}
        onDismiss={() => setViewerIndex(null)}
      />

      <MomentEditGateSheet
        visible={gateVisible}
        variant={isPremium ? 'premium' : 'free'}
        onPrimary={() => {
          setGateVisible(false);
          if (isPremium) router.push(`/moment/${moment.id}/edit`);
          else setPaywallVisible(true);
        }}
        onViewBenefits={() => {
          setGateVisible(false);
          setPaywallVisible(true);
        }}
        onDismiss={() => setGateVisible(false)}
      />

      <PaywallModal
        visible={paywallVisible}
        onSubscribe={() => setPaywallVisible(false)}
        onDismiss={() => setPaywallVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
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
  editButton: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: theme.text.brand,
  },
  navSpacer: { width: 40 },

  carouselScroll: {
    height: PHOTO_CENTER_H,
    marginTop: theme.spacing.s,
  },
  carouselContent: {
    alignItems: 'flex-end',
  },
  photoCenter: {
    width: PHOTO_CENTER_W,
    height: PHOTO_CENTER_H,
    borderRadius: theme.radius.l,
    backgroundColor: theme.border.default,
  },
  photoSide: {
    width: PHOTO_SIDE_W,
    height: PHOTO_SIDE_H,
    borderRadius: theme.radius.l,
    backgroundColor: theme.border.default,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.m,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: theme.radius.s,
    backgroundColor: theme.text.brand,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.s,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.l,
  },

  noteText: {
    ...theme.typography.body,
    color: theme.text.primary,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  tagPill: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
  },
  tagLabel: {
    ...theme.typography.tagBadge,
    color: theme.text.onColor,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
});
