import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { PaywallModal } from '@/shared/components/PaywallModal';

/**
 * Dev-only mount point for the frames that are overlays rather than routes.
 *
 * The Paywall is a <Modal> driven by a `visible` prop from four different
 * screens, so the gallery cannot navigate to it — this gives it an address.
 * The component rendered is the real one; only the thing holding it open is
 * synthetic. Dismissing returns to the gallery.
 */
export default function OverlayRoute() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  if (!__DEV__) return null;

  const close = () => router.back();

  return (
    <View style={styles.backdrop}>
      {name === 'paywall' && (
        <PaywallModal visible onSubscribe={close} onDismiss={close} source="gallery" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A plain page behind the overlay, so what you compare against the frame is
  // the overlay itself and not whichever screen happened to be underneath.
  backdrop: { flex: 1, backgroundColor: theme.surface.default },
});
