import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Moment } from '@nestory/types';
import { palette, theme } from '@/shared/theme';
import { useAsset, useSubscription } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { FullscreenPhotoViewer } from '@/shared/components/FullscreenPhotoViewer';
import { MomentEditGateSheet } from '@/shared/components/MomentEditGateSheet';
import { PaywallModal } from '@/shared/components/PaywallModal';

// Photo cells match the Add page: 3 × 107 + 2 × 16 = 353 across the padded body.
const PHOTO_CELL = 107;

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
          <NavBar title="Moment" onBack={goBack} />
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

  return (
    <>
      {/* NavBar Type=withButton (743:3280) — Edit is a DS Text button */}
      <NavBar
        title="Moment"
        onBack={goBack}
        right={<Button label="Edit" type="text" style={styles.editBtn} onPress={onEditPress} />}
      />

      {/* body 743:3213 — note first, then a 3-up photo grid, then the meta row */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {moment.textNote ? <Text style={styles.noteText}>{moment.textNote}</Text> : null}

        {moment.files.length > 0 && (
          <View style={styles.photoGrid}>
            {moment.files.map((f, i) => (
              <Pressable key={f.id} onPress={() => setViewerIndex(i)}>
                <Image source={{ uri: f.fileUrl }} style={styles.photoCell} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.metaRow}>
          <RemixIcon name="time-line" size={16} color={theme.text.secondary} />
          <Text style={styles.metaText}>{formatCapturedAt(moment.capturedAt)}</Text>
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

  // The design instances the DS Text button at 36 tall in the nav bar
  editBtn: { height: 36 },

  scroll: { flex: 1 },
  body: {
    paddingHorizontal: theme.spacing.xl, // 20
    paddingTop: theme.spacing.l, // 16
    paddingBottom: theme.spacing.safeBtm, // 34
    gap: theme.spacing.l, // 16
  },

  // 743:3215 — same 3-up 107px grid as the Add page
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
  },

  noteText: {
    ...theme.typography.body,
    color: theme.text.primary,
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
