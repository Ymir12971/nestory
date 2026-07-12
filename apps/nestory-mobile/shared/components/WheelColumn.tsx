import { useCallback, useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/shared/theme';

const ITEM_H = 44;
const VISIBLE = 5;

/** Drum-roll wheel column (month/day/year, hour/minute, etc. — used by O-03b Birthday and H-02 Date & Time). */
export function WheelColumn({
  items,
  selectedIndex,
  onChange,
}: {
  items: string[];
  selectedIndex: number;
  onChange: (idx: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  // Idle-based snap: works on both native (momentum) and web (mouse wheel),
  // since `onMomentumScrollEnd` doesn't fire for desktop browser scroll events.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, []); // scroll to initial position on mount only

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const y = e.nativeEvent.contentOffset.y;
      idleTimerRef.current = setTimeout(() => {
        const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
        onChange(idx);
        ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
      }, 120);
    },
    [items.length, onChange],
  );

  return (
    <View style={styles.col}>
      <ScrollView
        ref={ref}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          return (
            <View key={item} style={styles.item}>
              <Text
                style={
                  dist === 0
                    ? styles.selected
                    : dist === 1
                    ? styles.adjacent
                    : styles.outer
                }
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Selection indicator — two lines framing the middle row */}
      <View pointerEvents="none" style={styles.selectionBand} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1, height: ITEM_H * VISIBLE },
  scroll: { flex: 1 },
  content: { paddingVertical: ITEM_H * 2 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  selected: { ...theme.typography.h1, color: theme.text.primary },
  adjacent: { ...theme.typography.body, color: theme.text.secondary },
  outer: { ...theme.typography.body, color: theme.text.hint },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,       // 2 padding rows above center
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border.strong,
  },
});
