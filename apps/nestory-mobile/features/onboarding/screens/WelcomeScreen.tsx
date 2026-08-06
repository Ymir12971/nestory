import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/shared/components/Button';
import { palette, theme } from '@/shared/theme';

// O-Welcome-1 (Figma 739:1085) / O-Welcome-2 (739:1104).
//
// Both are composed absolutely on a 393×852 frame. Phone aspect ratios barely
// move (393/852 = 430/932 = 0.461), so scaling every canvas coordinate by
// SCREEN_W/393 keeps the composition 1:1 across devices; the CTA is pinned to
// the bottom instead of scaled so it always clears the home indicator.
const CANVAS_W = 393;
const K = Dimensions.get('window').width / CANVAS_W;
const px = (v: number) => v * K;

// Shared backdrop: linear-gradient(213.49deg, primary/300 14.88%, primary/700 91.68%).
// A CSS angle θ maps to the direction vector (sin θ, −cos θ) in screen space,
// which for 213.49° runs from the top-right down to the bottom-left corner.
const GRADIENT_COLORS = [palette.primary[300], palette.primary[700]] as const;
const GRADIENT_LOCATIONS = [0.14883, 0.91682] as const;
const GRADIENT_START = { x: 0.776, y: 0.083 };
const GRADIENT_END = { x: 0.224, y: 0.917 };

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={GRADIENT_LOCATIONS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={s.fill}
    >
      {children}
    </LinearGradient>
  );
}

// Figma `cta` frame: full width, pt 24 / px 20 / pb SafeBtm-34, button right-aligned.
// The button itself is the DS Primary, just narrower than its 353 default.
function Cta({ label, width, onPress }: { label: string; width: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.cta, { paddingBottom: Math.max(insets.bottom, px(34)) }]}>
      <Button
        label={label}
        onPress={onPress}
        style={{ width: px(width), height: px(52), alignSelf: 'auto' }}
      />
    </View>
  );
}

// ─── Step 1: "Every little moment, kept as Moment" ───────────────────────────

// Right-hand card column (739:1086): three MomentCards, each with its own photo
// height, stacked with a 12px gap.
const W1_CARDS: { photo: ImageSourcePropType; photoH: number; caption: string; tag?: string }[] = [
  {
    photo: require('@/assets/images/welcome-bedtime.png'),
    photoH: 120,
    caption: 'Fell asleep mid-laugh during bedtime stories.',
  },
  {
    photo: require('@/assets/images/welcome-firststep.png'),
    photoH: 160,
    caption: 'Took his first wobbly steps across the room today.',
    tag: 'First Step',
  },
  {
    photo: require('@/assets/images/welcome-butterfly.png'),
    photoH: 90,
    caption: "Caught a tiny butterfly in the park — wouldn't let go.",
  },
];

function MomentCard({ photo, photoH, caption, tag }: (typeof W1_CARDS)[number]) {
  return (
    <View style={card.wrap}>
      <Image source={photo} style={[card.photo, { height: px(photoH) }]} resizeMode="cover" />
      {tag && (
        <View style={card.tag}>
          <Text style={card.tagLabel}>{tag}</Text>
        </View>
      )}
      {/* Card 1's caption is clamped to 3 lines in the design (fixed 48px block) */}
      <Text style={card.caption} numberOfLines={photoH === 120 ? 3 : undefined}>
        {caption}
      </Text>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface.successSubtle, // #f0fdf4
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: px(theme.radius.l),
    paddingHorizontal: px(theme.spacing.m),
    paddingVertical: px(10),
    gap: px(12),
  },
  photo: {
    width: px(120),
    borderRadius: px(theme.radius.m),
    backgroundColor: palette.neutral[200],
  },
  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.border.brand,
    borderRadius: theme.radius.full,
    paddingHorizontal: px(theme.spacing.m),
    paddingVertical: px(6),
  },
  tagLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: px(14),
    lineHeight: px(16),
    color: theme.text.brand,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: px(14),
    lineHeight: px(16),
    color: theme.text.primary,
    width: px(122),
  },
});

function StepOne({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Backdrop>
      {/* 739:1585 — line-art illustration, bleeds off the left edge */}
      <Image
        source={require('@/assets/images/welcome-illustration.png')}
        style={s.w1Illustration}
        resizeMode="cover"
      />

      {/* 739:1586 */}
      <View style={s.w1TextBlock}>
        <Text style={s.heroPre}>Every little moment,{'\n'}kept as</Text>
        <Text style={s.heroBold}>Moment</Text>
      </View>

      {/* 739:1086 — Figma puts the column at y=-16 (bleeding under the status
          bar); on device it starts just below the inset instead (Justin 2026-07-27) */}
      <View style={[s.w1Column, { top: Math.max(insets.top, px(24)) }]}>
        {W1_CARDS.map((c) => (
          <MomentCard key={c.caption} {...c} />
        ))}
      </View>

      <Cta label="Next →" width={146} onPress={onNext} />
    </Backdrop>
  );
}

// ─── Step 2: "Every moment, woven into a Story" ──────────────────────────────

// 739:1114 — 3-column masonry collage, 280×193, column gap 10 / row gap 11.
const W2_COLLAGE: { photo: ImageSourcePropType; left: number; top: number; w: number; h: number }[] = [
  { photo: require('@/assets/images/welcome-tree.png'), left: 0, top: 0, w: 78, h: 104 },
  { photo: require('@/assets/images/welcome-icecream.png'), left: 88, top: 0, w: 104, h: 78 },
  { photo: require('@/assets/images/welcome-butterfly.png'), left: 202, top: 0, w: 78, h: 78 },
  { photo: require('@/assets/images/welcome-bedtime.png'), left: 0, top: 115, w: 78, h: 78 },
  { photo: require('@/assets/images/welcome-baking.png'), left: 88, top: 89, w: 104, h: 104 },
  { photo: require('@/assets/images/welcome-firststep.png'), left: 202, top: 89, w: 78, h: 104 },
];

function StoryPreviewCard() {
  return (
    <View style={story.card}>
      {/* 739:2022 — month pill + 5-dot page indicator */}
      <View style={story.headerRow}>
        <View style={story.monthBadge}>
          <Text style={story.monthLabel}>July 2026</Text>
        </View>
        <View style={story.dots}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={story.dot} />
          ))}
        </View>
      </View>

      <View style={story.collage}>
        {W2_COLLAGE.map((p, i) => (
          <Image
            key={i}
            source={p.photo}
            style={[
              story.collagePhoto,
              { left: px(p.left), top: px(p.top), width: px(p.w), height: px(p.h) },
            ]}
            resizeMode="cover"
          />
        ))}
      </View>

      <Text style={story.narrative}>
        This month Vincent found his feet, chasing butterflies and tumbling into giggles. Every
        wobble brought him closer to the world waiting for him.{'\n'}...
      </Text>

      <View style={story.footer}>
        <Text style={story.count}>54 moments</Text>
      </View>
    </View>
  );
}

const story = StyleSheet.create({
  // 739:1111
  card: {
    position: 'absolute',
    left: px(40),
    top: px(162),
    width: px(312),
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: px(theme.radius.l),
    padding: px(theme.spacing.l),
    gap: px(theme.spacing.l),
  },
  // 739:1109 / 739:1110 — two stacked "previous story" cards peeking out behind
  ghostBack: {
    position: 'absolute',
    left: px(80),
    top: px(114),
    width: px(234),
    height: px(190),
    backgroundColor: '#d9fae6',
    borderRadius: px(theme.radius.l),
  },
  ghostFront: {
    position: 'absolute',
    left: px(56),
    top: px(138),
    width: px(282),
    height: px(228),
    backgroundColor: '#bfe9d0',
    borderRadius: px(theme.radius.l),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthBadge: {
    backgroundColor: theme.surface.brand,
    borderRadius: theme.radius.full,
    paddingHorizontal: px(theme.spacing.m),
    paddingVertical: px(4),
  },
  monthLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: px(18),
    lineHeight: px(24),
    color: theme.text.onColor,
  },
  dots: {
    flexDirection: 'row',
    gap: px(8),
  },
  dot: {
    width: px(4),
    height: px(4),
    borderRadius: px(2),
    backgroundColor: palette.primary[100], // #d1f5de
  },
  collage: {
    width: px(280),
    height: px(193),
  },
  collagePhoto: {
    position: 'absolute',
    borderRadius: px(theme.radius.m),
    backgroundColor: palette.neutral[200],
  },
  narrative: {
    fontFamily: 'Inter_400Regular',
    fontSize: px(14),
    lineHeight: px(16),
    color: theme.text.primary,
    height: px(88),
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: px(14),
    lineHeight: px(16),
    color: theme.text.secondary,
  },
});

function StepTwo({ onEnter }: { onEnter: () => void }) {
  return (
    <Backdrop>
      {/* 739:1105 — three concentric rings, #41A86F @20%, 10px stroke */}
      <View style={s.rings} pointerEvents="none">
        {[586, 460, 316].map((d) => (
          <View key={d} style={[s.ring, { width: px(d), height: px(d), borderRadius: px(d / 2) }]} />
        ))}
      </View>

      <View style={story.ghostBack} />
      <View style={story.ghostFront} />
      <StoryPreviewCard />

      {/* 739:1133 */}
      <View style={s.w2TextBlock}>
        <Text style={s.heroPre}>Every moment,{'\n'}woven into a</Text>
        <Text style={s.heroBold}>Story</Text>
      </View>

      <Cta label="Enter Nestory →" width={192} onPress={onEnter} />
    </Backdrop>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export function WelcomeScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  const goToStep = (next: number) => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  return (
    <Animated.View style={[s.fill, { opacity }]}>
      {step === 0 ? (
        <StepOne onNext={() => goToStep(1)} />
      ) : (
        <StepTwo onEnter={() => router.push('/onboarding/auth')} />
      )}
    </Animated.View>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fill: { flex: 1 },

  // Hero copy — Manrope Regular 24/32 over Manrope Bold 32/48, both white
  heroPre: {
    fontFamily: 'Manrope_400Regular',
    fontSize: px(24),
    lineHeight: px(32),
    color: theme.text.onColor,
  },
  heroBold: {
    fontFamily: 'Manrope_700Bold',
    fontSize: px(32),
    lineHeight: px(48),
    color: theme.text.onColor,
  },

  // Step 1
  w1Illustration: {
    position: 'absolute',
    left: 0,
    top: px(231),
    width: px(226),
    height: px(542),
  },
  w1TextBlock: {
    position: 'absolute',
    left: px(32),
    top: px(94),
    width: px(165),
  },
  w1Column: {
    position: 'absolute',
    left: px(227),
    width: px(146),
    gap: px(12),
  },

  // Step 2
  rings: {
    position: 'absolute',
    left: px(87),
    top: px(545),
    width: px(586),
    height: px(586),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: px(10),
    borderColor: '#41a86f',
    opacity: 0.2,
  },
  w2TextBlock: {
    position: 'absolute',
    left: px(41),
    top: px(598),
    width: px(165),
  },

  // CTA
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    paddingHorizontal: px(20),
    paddingTop: px(24),
  },
});
