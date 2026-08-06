import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { palette, theme } from '@/shared/theme';

/**
 * DS Toggle — Figma `Design System · 02 Atoms · Toggle` (48:737).
 *
 * 51×31 track, 27px knob. Drawn rather than delegated to RN's `Switch` because
 * the design's OFF track is a light-green `primary/50` fill with a 1px
 * `border/default` hairline — neither of which iOS's native switch can render.
 *
 *   Off  track primary/50 + 1px border/default, white knob at x=2
 *   On   track surface/brand, neutral/50 knob at x=22
 */
const TRACK_W = 51;
const TRACK_H = 31;
const KNOB = 27;
const OFF_X = 2;
const ON_X = TRACK_W - KNOB - OFF_X; // 22

export function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [OFF_X, ON_X] });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.primary[50], theme.surface.brand],
  });
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border.default, theme.surface.brand],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[s.track, { backgroundColor, borderColor }, disabled && s.disabled]}>
        <Animated.View style={[s.knob, { transform: [{ translateX }] }]}>
          <View style={s.knobFill} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: theme.radius.full,
    // Figma knob carries a soft drop shadow (filter0_d)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  knobFill: {
    flex: 1,
    borderRadius: theme.radius.full,
    backgroundColor: palette.neutral[50], // #fefcfa
  },
});
