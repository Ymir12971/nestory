import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * The animated shell every bottom sheet in the app sits in.
 *
 * `Modal animationType="slide"` slides the WHOLE modal up — scrim included —
 * so the dim appeared to rise with the sheet (Justin 2026-09-04). Here the
 * modal animates nothing: the scrim is painted at full strength the moment it
 * mounts, and only the sheet travels. On dismiss the modal stays mounted until
 * the sheet has slid back down.
 *
 * Geometry is the overlay + absolute scrim + bottom-pinned sheet the screens
 * hand-rolled before, so a sheet taller than the window still overflows at the
 * TOP and keeps its CTA on screen. Callers keep their own sheet styling and
 * pass it in — this owns the Modal, the scrim and the transform, nothing else.
 */
const OPEN_MS = 240;
const CLOSE_MS = 180;

export function SheetModal({
  visible,
  onRequestClose,
  sheetStyle,
  scrimColor = 'rgba(0,0,0,0.35)', // DS scrim
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  scrimColor?: string;
  children: ReactNode;
}) {
  // `mounted` trails `visible` on the way out so the slide-down can play.
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current; // 0 offscreen → 1 open
  // Measured on first layout and kept across opens (this component stays
  // mounted; only the Modal's children come and go).
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? OPEN_MS : CLOSE_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [mounted, visible, anim]);

  // Before the first layout, park it a full screen down — anything past the
  // sheet's own height is off-screen, and the real value lands on layout.
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight || Dimensions.get('window').height, 0],
  });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onRequestClose}>
      <View style={s.overlay}>
        <Pressable style={[s.scrim, { backgroundColor: scrimColor }]} onPress={onRequestClose} />
        <Animated.View
          style={[sheetStyle, { transform: [{ translateY }] }]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: StyleSheet.absoluteFillObject,
});
