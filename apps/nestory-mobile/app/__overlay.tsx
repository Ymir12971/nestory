import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { PaywallModal } from '@/shared/components/PaywallModal';
import { AddMomentEntrySheet } from '@/shared/components/AddMomentEntrySheet';
import { MomentEditGateSheet } from '@/shared/components/MomentEditGateSheet';
import { FullscreenPhotoViewer } from '@/shared/components/FullscreenPhotoViewer';
import { SplashScreen as BrandSplash } from '@/features/splash/SplashScreen';

/**
 * Dev-only mount point for the frames that are overlays rather than routes.
 *
 * Several frames are components a screen holds open with a `visible` prop —
 * the paywall, the add-moment sheet, the edit gate, the fullscreen viewer —
 * so the gallery has nothing to navigate to. This gives each an address. The
 * component rendered is the real one; only the thing holding it open is
 * synthetic. Dismissing returns to the gallery.
 */
const PHOTO = 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&q=70';

export default function OverlayRoute() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  if (!__DEV__) return null;

  const close = () => router.back();

  return (
    <View style={styles.backdrop}>
      {name === 'paywall' && (
        <PaywallModal visible onSubscribe={close} onDismiss={close} source="gallery" />
      )}
      {name === 'add-entry' && (
        <AddMomentEntrySheet visible onSelect={close} onDismiss={close} />
      )}
      {name === 'edit-gate-free' && (
        <MomentEditGateSheet visible variant="free" onPrimary={close} onViewBenefits={close} onDismiss={close} />
      )}
      {name === 'edit-gate-premium' && (
        <MomentEditGateSheet visible variant="premium" onPrimary={close} onDismiss={close} />
      )}
      {name === 'photo' && (
        <FullscreenPhotoViewer visible photoUrls={[PHOTO]} initialIndex={0} onDismiss={close} />
      )}
      {/* The splash normally lives in the root layout and fades after ~2.5s;
          here it just stays up so it can be compared against the frame. */}
      {name === 'splash' && <BrandSplash />}
    </View>
  );
}

const styles = StyleSheet.create({
  // A plain page behind the overlay, so what you compare against the frame is
  // the overlay itself and not whichever screen happened to be underneath.
  backdrop: { flex: 1, backgroundColor: theme.surface.default },
});
