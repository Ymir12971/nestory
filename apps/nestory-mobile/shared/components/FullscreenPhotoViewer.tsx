import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';

interface FullscreenPhotoViewerProps {
  visible:      boolean;
  photoUrls:    string[];
  initialIndex: number;
  onDismiss:    () => void;
}

/** Full-screen swipeable photo viewer, opened by tapping a thumbnail (e.g. H-04 Moment Detail carousel). */
export function FullscreenPhotoViewer({ visible, photoUrls, initialIndex, onDismiss }: FullscreenPhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    // Jump straight to the tapped photo — no animation, so there's no visible flash from photo 0.
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false }));
  }, [visible, initialIndex, width]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.root}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {photoUrls.map((uri, i) => (
            <Pressable key={i} style={[styles.page, { width, height }]} onPress={onDismiss}>
              <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.closeBtn, { top: insets.top + theme.spacing.s }]}
          hitSlop={12}
          onPress={onDismiss}
        >
          <RemixIcon name="close-line" size={24} color="#fff" />
        </Pressable>

        {/* DS PhotoIndicator (774:4778) — dots at the bottom, not a "1 / 5"
            counter at the top: active pill 18×6 in text/brand, the rest 6×6
            outlined in border/strong. */}
        {photoUrls.length > 1 && (
          <View
            style={[
              styles.indicator,
              { bottom: Math.max(insets.bottom, theme.spacing.safeBtm) },
            ]}
          >
            {photoUrls.map((_, i) => (
              <View key={i} style={i === index ? styles.dotActive : styles.dotInactive} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute',
    right: theme.spacing.l,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s, // 8
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: theme.radius.s, // 6
    backgroundColor: theme.text.brand,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.s,
    borderWidth: 1,
    borderColor: theme.border.strong,
  },
});
