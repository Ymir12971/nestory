import { useRef, useState } from 'react';
import { Animated, Dimensions, Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, theme } from '@/shared/theme';

const SCREEN_W = Dimensions.get('window').width;

// Welcome-2 Story 预览网格(6 张,顺序照 Figma 739:1104)
const GRID_PHOTOS: ImageSourcePropType[] = [
  require('@/assets/images/welcome-tree.png'),
  require('@/assets/images/welcome-icecream.png'),
  require('@/assets/images/welcome-butterfly.png'),
  require('@/assets/images/welcome-bedtime.png'),
  require('@/assets/images/welcome-baking.png'),
  require('@/assets/images/welcome-firststep.png'),
];
const GREEN = palette.primary[500]; // #23ab65
// 设计稿背景为斜向绿渐变(左上浅 → 右下深)
const GRADIENT = [palette.primary[400], palette.primary[500], palette.primary[600]] as const;

// ─── Moment Card (Welcome-1 right column) ────────────────────────────────────

function MomentCard({
  caption,
  tag,
  photo,
}: {
  caption: string;
  tag?: string;
  photo: ImageSourcePropType;
}) {
  return (
    <View style={card.wrap}>
      <Image source={photo} style={[card.photo, tag && card.photoTall]} resizeMode="cover" />
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
    // Figma:无 tag 卡 120×120,带 tag 的 First Step 卡 120×160(见下 photoTall)
    height: 108,
    borderRadius: 8,
  },
  photoTall: {
    height: 144,
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

// ─── Step 1: "Every little moment, kept as Moment" ───────────────────────────

function StepOne({ onNext }: { onNext: () => void }) {
  return (
    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill}>
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.w1Body}>
        {/* Left: 文字在上、插画在下(Figma 739:1586 @32,94 / 739:1585 @0,231) */}
        <View style={s.w1Left}>
          <View style={s.w1TextBlock}>
            {/* 文案照 Figma 原文,仅术语 Memory→Moment(Justin 2026-07-27) */}
            <Text style={s.w1Pre}>Every little moment,{'\n'}kept as</Text>
            <Text style={s.w1Hero}>Moment</Text>
          </View>
          <Image
            source={require('@/assets/images/welcome-illustration.png')}
            style={s.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Right: 3 stacked moment cards */}
        <View style={s.w1Right}>
          <MomentCard
            caption="Fell asleep mid-laugh during bedtime stories."
            photo={require('@/assets/images/welcome-bedtime.png')}
          />
          <MomentCard
            caption="Took his first wobbly steps across the room today."
            tag="First Step"
            photo={require('@/assets/images/welcome-firststep.png')}
          />
          <MomentCard
            caption="Caught a tiny butterfly in the park — wouldn't let go."
            photo={require('@/assets/images/welcome-butterfly.png')}
          />
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
    </LinearGradient>
  );
}

// ─── Step 2: "Every moment, woven into a Story" ──────────────────────────────

const CARD_W = SCREEN_W - 48;
const GRID_PHOTO_W = (CARD_W - 32 - 8) / 3; // card padding 16×2, two gaps of 4

function StoryPreviewCard() {
  return (
    <View style={story.card}>
      {/* 卡头:月份胶囊 + 5 点指示器(Figma Frame 71 / Frame 72) */}
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
      <View style={story.grid}>
        {GRID_PHOTOS.map((src, i) => (
          <Image key={i} source={src} style={story.gridPhoto} resizeMode="cover" />
        ))}
      </View>
      <Text style={story.narrative} numberOfLines={4}>
        This month Vincent found his feet, chasing butterflies and tumbling into giggles. Every
        wobble brought him closer to the world waiting for him.
      </Text>
      <Text style={story.count}>54 moments</Text>
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
  stackWrap: {
    alignItems: 'center',
    paddingTop: 24,          // 给叠影卡留出上方空间
  },
  ghost: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
  },
  ghostFront: { top: 8,  width: CARD_W - 30, height: 60 },
  ghostBack:  { top: 0,  width: CARD_W - 78, height: 60, backgroundColor: 'rgba(255,255,255,0.28)' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary[200],
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
    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill}>
      <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <View style={s.w2Body}>
        {/* 叠影卡(Figma Rectangle 111141367 / …366):主卡后方两层 */}
        <View style={story.stackWrap}>
          <View style={[story.ghost, story.ghostBack]} />
          <View style={[story.ghost, story.ghostFront]} />
          <StoryPreviewCard />
        </View>
        <View style={s.w2TextBlock}>
          <Text style={s.w2Pre}>Every moment,{'\n'}woven into a</Text>
          <Text style={s.w2Hero}>Story</Text>
        </View>
      </View>

      <View style={s.btnRow}>
        <Pressable
          style={({ pressed }) => [s.outlineBtn, s.outlineBtnWide, pressed && s.pressed]}
          onPress={onEnter}
        >
          <Text style={s.outlineBtnLabel}>Enter Nestory →</Text>
        </Pressable>
      </View>
      </SafeAreaView>
    </LinearGradient>
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
  // Figma 393 宽:左栏 0..227、右栏 227..373(146 宽),故 flex 227:146
  w1Body: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 0,
    paddingRight: 20,
    gap: 0,
  },
  w1Left: {
    flex: 227,
    paddingLeft: 32,      // 文字 @x=32
    paddingTop: 35,       // 文字 @y=94 − status bar 59
  },
  // 白描孩子剪影(739:1585,226×542 @0,231):文字下方,左侧出血
  illustration: {
    flex: 1,
    width: '100%',
    marginLeft: -32,      // 抵消 paddingLeft,插画从屏幕最左开始
    marginTop: 12,
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
    flex: 146,
    gap: 12,              // Figma 卡间距 12
    // 稿中首卡贴顶出血,实机会被状态栏/电池行压住,故下移让开(Justin 2026-07-27)
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Step 2
  // Figma: 卡 312x409 @40,162;文案左对齐 @x=41
  w2Body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 28,
  },
  w2TextBlock: {
    alignItems: 'flex-start',
    gap: 0,
  },
  w2Pre: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    lineHeight: 28,
    color: palette.primary[100],
  },
  w2Hero: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 44,
    lineHeight: 52,
    color: theme.text.onColor,
  },

  // Shared button
  // Figma: Button 146×52 @x=227(与右侧卡片列同宽同起点),不是通栏
  btnRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  outlineBtn: {
    height: 52,
    width: 146,        // Welcome-1: Figma Button 146x52
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  outlineBtnWide: { width: 192 },   // Welcome-2: Figma Button 192x52
  outlineBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  pressed: { opacity: 0.75 },
});
