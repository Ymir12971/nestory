import { useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, theme } from '@/shared/theme';

const SCREEN_W = Dimensions.get('window').width;
const GREEN = palette.primary[500]; // #23ab65

// ─── Memory Card (Welcome-1 right column) ────────────────────────────────────

function MemoryCard({ caption, tag }: { caption: string; tag?: string }) {
  return (
    <View style={card.wrap}>
      <Image
        source={require('@/assets/images/family-trip-1.png')}
        style={card.photo}
        resizeMode="cover"
      />
      {tag && (
        <View style={card.tag}>
          <Text style={card.tagLabel}>{tag}</Text>
        </View>
      )}
      <Text style={card.caption}>{caption}</Text>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface.card,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: 82,
    borderRadius: 8,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary[50],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: palette.primary[200],
  },
  tagLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    color: palette.primary[700],
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: theme.text.primary,
  },
});

// ─── Step 1: "Every little moment, kept as Memory" ───────────────────────────

function StepOne({ onNext }: { onNext: () => void }) {
  return (
    <SafeAreaView style={[s.fill, { backgroundColor: GREEN }]} edges={['top', 'bottom']}>
      <View style={s.w1Body}>
        {/* Left: illustration + text */}
        <View style={s.w1Left}>
          {/*
           * TODO: Replace this placeholder with the white line-art SVG illustration
           * (children silhouettes: baseball, reading, crawling) from the designer.
           * Target asset: assets/images/welcome-illustration.svg (or .png)
           */}
          <View style={s.illustrationPlaceholder} />
          <View style={s.w1TextBlock}>
            <Text style={s.w1Pre}>Every little moment,{'\n'}kept as</Text>
            <Text style={s.w1Hero}>Memory</Text>
          </View>
        </View>

        {/* Right: 3 stacked memory cards */}
        <View style={s.w1Right}>
          <MemoryCard caption="Fell asleep mid-laugh during bedtime stories." />
          <MemoryCard
            caption="Took his first wobbly steps across the room today."
            tag="First Step"
          />
          <MemoryCard caption="Caught a tiny butterfly in the park — wouldn't let go." />
        </View>
      </View>

      <View style={s.btnRow}>
        <Pressable
          style={({ pressed }) => [s.outlineBtn, pressed && s.pressed]}
          onPress={onNext}
        >
          <Text style={s.outlineBtnLabel}>Next →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2: "Every memory, woven into a Story" ──────────────────────────────

const CARD_W = SCREEN_W - 48;
const GRID_PHOTO_W = (CARD_W - 32 - 8) / 3; // card padding 16×2, two gaps of 4

function StoryPreviewCard() {
  return (
    <View style={story.card}>
      <View style={story.monthBadge}>
        <Text style={story.monthLabel}>March 2026</Text>
      </View>
      <View style={story.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Image
            key={i}
            source={require('@/assets/images/family-trip-1.png')}
            style={story.gridPhoto}
            resizeMode="cover"
          />
        ))}
      </View>
      <Text style={story.narrative} numberOfLines={4}>
        This month Vincent found his feet, chasing butterflies and tumbling into giggles. Every
        wobble brought him closer to the world waiting for him.
      </Text>
      <Text style={story.count}>54 memories</Text>
    </View>
  );
}

const story = StyleSheet.create({
  card: {
    backgroundColor: theme.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    width: CARD_W,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  monthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary[500],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.onColor,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridPhoto: {
    width: GRID_PHOTO_W,
    height: 80,
    borderRadius: 6,
  },
  narrative: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: theme.text.secondary,
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: theme.text.hint,
  },
});

function StepTwo({ onEnter }: { onEnter: () => void }) {
  return (
    <SafeAreaView style={[s.fill, { backgroundColor: GREEN }]} edges={['top', 'bottom']}>
      <View style={s.w2Body}>
        <StoryPreviewCard />
        <View style={s.w2TextBlock}>
          <Text style={s.w2Pre}>Every memory,{'\n'}woven into a</Text>
          <Text style={s.w2Hero}>Story</Text>
        </View>
      </View>

      <View style={s.btnRow}>
        <Pressable
          style={({ pressed }) => [s.outlineBtn, pressed && s.pressed]}
          onPress={onEnter}
        >
          <Text style={s.outlineBtnLabel}>Enter Nestory →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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

  // Step 1
  w1Body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  w1Left: {
    flex: 5,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  illustrationPlaceholder: {
    flex: 1,
    // White-outline children illustration from designer goes here.
    // Suggested component: <Image source={require('@/assets/images/welcome-illustration.png')} />
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 16,
  },
  w1TextBlock: {
    gap: 0,
  },
  w1Pre: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.primary[100],
  },
  w1Hero: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 34,
    lineHeight: 42,
    color: theme.text.onColor,
  },
  w1Right: {
    flex: 4,
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
  },

  // Step 2
  w2Body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  w2TextBlock: {
    alignItems: 'center',
    gap: 0,
  },
  w2Pre: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    lineHeight: 28,
    color: palette.primary[100],
    textAlign: 'center',
  },
  w2Hero: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 44,
    lineHeight: 52,
    color: theme.text.onColor,
    textAlign: 'center',
  },

  // Shared button
  btnRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  outlineBtn: {
    height: 52,
    width: '100%',
    maxWidth: 353,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  outlineBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  pressed: { opacity: 0.75 },
});
