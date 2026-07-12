import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { palette, theme } from '@/shared/theme';

const GLOW_SIZE = 440; // pt — decorative halo diameter
const GLOW_CENTER_Y = 0.46; // vertical center at 46% of screen height
const BRAND_GREEN = palette.primary[500]; // #23ab65

// Breathing loop: one full sine-like cycle ≈ 2.5s (1.25s each direction).
// The gradient is baked at full center alpha; we animate the layer's opacity
// between 0.09 ↔ 0.19 so the effective center alpha matches the spec, and
// scale between 0.95 ↔ 1.05 about the halo's center.
const HALF_CYCLE_MS = 1250;
const OPACITY_RANGE = [0.09, 0.19];
const SCALE_RANGE = [0.95, 1.05];

/**
 * Nestory launch screen — warm off-white field with a softly breathing green
 * glow behind the logo, wordmark, and slogan. Passive (no interactions); the
 * host (RootLayout) mounts it over the app and fades it out once data is ready.
 *
 * Spec: docs/delivery/启动页.md
 */
export function SplashScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const glowOpacity = phase.interpolate({
    inputRange: [0, 1],
    outputRange: OPACITY_RANGE,
  });
  const glowScale = phase.interpolate({
    inputRange: [0, 1],
    outputRange: SCALE_RANGE,
  });

  const glowTop = screenHeight * GLOW_CENTER_Y - GLOW_SIZE / 2;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.glow,
          { top: glowTop, opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      >
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={1} />
              <Stop offset="66%" stopColor={BRAND_GREEN} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <View style={styles.stack}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>Nestory</Text>
        <Text style={styles.slogan}>{'Every little moment\nbecomes a story'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.surface.default, // #fefcfa
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    // centered horizontally; `top` is set dynamically from screen height
    alignSelf: 'center',
    pointerEvents: 'none',
  },
  stack: {
    alignItems: 'center',
    marginBottom: 64, // nudge the stack a touch above optical center
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 26,
  },
  wordmark: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: theme.text.primary, // #1a1a1a
    marginBottom: 11,
  },
  slogan: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21, // 1.5 × 14
    letterSpacing: 0.15,
    textAlign: 'center',
    color: '#9CA3AF', // slogan-grey — spec token, no semantic alias in theme
    maxWidth: 260,
  },
});
