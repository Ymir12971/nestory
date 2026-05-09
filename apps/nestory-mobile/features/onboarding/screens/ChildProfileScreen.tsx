import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Image,
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import RemixIcon from 'react-native-remix-icon';
import type { ChildCreate, ChildGender } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useCreateChild, uploadPhoto } from '@/api';
import { HeightInput, useHeightState } from '@/shared/components/HeightInput';
import { useGoBack } from '@/shared/hooks/useGoBack';

// ─── Progress bar (5 segments, N filled) ─────────────────────────────────────

function ProgressBar({ filled }: { filled: number }) {
  return (
    <View style={pbStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[pbStyles.segment, i < filled ? pbStyles.active : pbStyles.inactive]}
        />
      ))}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, height: 4 },
  segment: { flex: 1, borderRadius: theme.radius.full },
  active: { backgroundColor: theme.surface.brand },
  inactive: { backgroundColor: theme.border.default },
});

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar({ onBack, filled }: { onBack: () => void; filled: number }) {
  return (
    <View>
      <View style={nbStyles.row}>
        <Pressable onPress={onBack} hitSlop={8}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        {/* Right slot intentionally empty for onboarding per Figma */}
        <View style={nbStyles.placeholder} />
      </View>
      <View style={nbStyles.progressWrap}>
        <ProgressBar filled={filled} />
      </View>
    </View>
  );
}

const nbStyles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  placeholder: { width: 24 },
  progressWrap: { paddingHorizontal: theme.spacing.xxl },
});

// ─── Primary CTA button ───────────────────────────────────────────────────────

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [btnStyles.wrap, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={[palette.primary[500], palette.primary[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={btnStyles.gradient}
      >
        <Text style={btnStyles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const btnStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  gradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  label: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
});

// ─── Drum-roll wheel column ───────────────────────────────────────────────────

const ITEM_H = 44;
const VISIBLE = 5;

function WheelColumn({
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
    <View style={wheelStyles.col}>
      <ScrollView
        ref={ref}
        style={wheelStyles.scroll}
        contentContainerStyle={wheelStyles.content}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          return (
            <View key={item} style={wheelStyles.item}>
              <Text
                style={
                  dist === 0
                    ? wheelStyles.selected
                    : dist === 1
                    ? wheelStyles.adjacent
                    : wheelStyles.outer
                }
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Selection indicator — two lines framing the middle row */}
      <View pointerEvents="none" style={wheelStyles.selectionBand} />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
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

// ─── Gender tag ───────────────────────────────────────────────────────────────

function GenderTag({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[tagStyles.base, selected ? tagStyles.selected : tagStyles.unselected]}
    >
      <Text style={[tagStyles.label, selected ? tagStyles.labelSelected : tagStyles.labelUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const tagStyles = StyleSheet.create({
  base: { paddingHorizontal: theme.spacing.m, paddingVertical: 6, borderRadius: theme.radius.full },
  selected: { backgroundColor: theme.surface.brand },
  unselected: {
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  label: { ...theme.typography.tagBadge },
  labelSelected: { color: theme.text.onColor },
  labelUnselected: { color: theme.text.primary },
});

// ─── Unit input row ───────────────────────────────────────────────────────────

type UnitSystem = 'metric' | 'imperial';

function UnitInput({
  value,
  onChangeText,
  metricUnit,
  imperialUnit,
  system,
  onToggle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  metricUnit: string;
  imperialUnit: string;
  system: UnitSystem;
  onToggle: () => void;
}) {
  return (
    <View style={unitStyles.row}>
      <TextInput
        style={unitStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={theme.text.hint}
      />
      <Pressable onPress={onToggle} style={unitStyles.pill}>
        <Text style={unitStyles.unitLabel}>{system === 'metric' ? metricUnit : imperialUnit}</Text>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
    </View>
  );
}

const unitStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.s, alignItems: 'center' },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.surface.brandSubtle,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  unitLabel: { ...theme.typography.h2, color: theme.text.brand },
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(THIS_YEAR - 9 + i));

type Step = 0 | 1 | 2;
type Gender = 'Girl' | 'Boy' | 'Prefer not to say' | null;

const GENDER_TO_API: Record<NonNullable<Gender>, ChildGender> = {
  Girl:                  'girl',
  Boy:                   'boy',
  'Prefer not to say':   'prefer_not_to_say',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ChildProfileScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const pickPhoto = usePhotoPicker();
  const createChild = useCreateChild();
  const [step, setStep] = useState<Step>(0);

  const [name, setName] = useState('');
  const [avatarPhoto, setAvatarPhoto] = useState<PickedPhoto | null>(null);

  const [monthIdx, setMonthIdx] = useState(2);
  const [dayIdx, setDayIdx] = useState(14);
  const [yearIdx, setYearIdx] = useState(Math.max(0, YEARS.indexOf(String(THIS_YEAR - 1))));

  const [gender, setGender] = useState<Gender>(null);
  const heightState = useHeightState();
  const [weight, setWeight] = useState('');
  const [weightSystem, setWeightSystem] = useState<UnitSystem>('metric');
  const [saveError, setSaveError] = useState<string | null>(null);

  const onBack = () => {
    if (step === 0) goBack();
    else setStep((s) => (s - 1) as Step);
  };

  const [birthdayConfirmVisible, setBirthdayConfirmVisible] = useState(false);

  const formattedBirthday = `${MONTHS[monthIdx]} ${DAYS[dayIdx]}, ${YEARS[yearIdx]}`;

  const buildBody = (avatarUrl?: string): ChildCreate => {
    const month = String(monthIdx + 1).padStart(2, '0');
    const day   = (DAYS[dayIdx] ?? '1').padStart(2, '0');
    const year  = YEARS[yearIdx];

    const weightNum = parseFloat(weight);

    return {
      name:      name.trim(),
      birthDate: `${year}-${month}-${day}`,
      ...(gender ? { gender: GENDER_TO_API[gender] } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(heightState.resolve() ?? {}),
      ...(Number.isFinite(weightNum) && weightNum > 0
        ? { weightValue: weightNum, weightUnit: weightSystem === 'metric' ? 'kg' : 'lb' }
        : {}),
    };
  };

  const saveAndGo = async (next: '/onboarding/permissions' | '/onboarding/second-child') => {
    if (createChild.isPending) return;
    setSaveError(null);
    try {
      const avatarUrl = avatarPhoto
        ? (await uploadPhoto(avatarPhoto, 'avatars')).fileUrl
        : undefined;
      await createChild.mutateAsync(buildBody(avatarUrl));
      router.push(next);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save profile. Please try again.');
    }
  };

  const onContinue = () => {
    if (step === 0) {
      if (!name.trim()) {
        setSaveError('Please enter a name to continue.');
        return;
      }
      setSaveError(null);
      setStep(1);
    } else if (step === 1) {
      setBirthdayConfirmVisible(true);
    } else {
      void saveAndGo('/onboarding/permissions');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar onBack={onBack} filled={step + 1} />

      {/* ── Step 0: Name + Photo ─────────────────────────────────────────── */}
      {step === 0 && (
        <View style={styles.body}>
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>Tell me about your little one</Text>
            <Text style={styles.subheading}>Let's start with a photo and a name</Text>
          </View>

          <View style={styles.photoArea}>
            <Pressable
              style={styles.avatarWrap}
              onPress={async () => {
                const picked = await pickPhoto();
                const first = picked[0]; if (first) setAvatarPhoto(first);
              }}
            >
              {avatarPhoto ? (
                <Image source={{ uri: avatarPhoto.uri }} style={styles.photoCircle} />
              ) : (
                <View style={styles.photoCircle} />
              )}
              <View style={styles.cameraBadge}>
                <RemixIcon name="camera-line" size={20} color={theme.text.onColor} />
              </View>
            </Pressable>
            <Text style={styles.photoLabel}>Tap to add a photo</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emma"
              placeholderTextColor={theme.text.hint}
            />
          </View>
        </View>
      )}

      {/* ── Step 1: Birthday ─────────────────────────────────────────────── */}
      {step === 1 && (
        <View style={styles.body}>
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>
              {name
                ? `When did ${name} come into your world?`
                : 'When did they come into your world?'}
            </Text>
            <Text style={styles.subheading}>
              This helps me track milestones and create age-appropriate stories
            </Text>
          </View>

          <View style={styles.datePicker}>
            <WheelColumn items={MONTHS} selectedIndex={monthIdx} onChange={setMonthIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={DAYS} selectedIndex={dayIdx} onChange={setDayIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={YEARS} selectedIndex={yearIdx} onChange={setYearIdx} />
          </View>
        </View>
      )}

      {/* ── Step 2: Details ──────────────────────────────────────────────── */}
      {step === 2 && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>
              A few more details help me create better stories
            </Text>
            <Text style={styles.subheading}>All optional — share what feels right</Text>
          </View>

          <View style={styles.detailFields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.tagRow}>
                {(['Girl', 'Boy', 'Prefer not to say'] as const).map((g) => (
                  <GenderTag
                    key={g}
                    label={g}
                    selected={gender === g}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Height</Text>
              <HeightInput
                system={heightState.system}
                cm={heightState.cm}
                ft={heightState.ft}
                inches={heightState.inches}
                onChangeCm={heightState.setCm}
                onChangeFt={heightState.setFt}
                onChangeInches={heightState.setInches}
                onToggle={heightState.toggle}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <UnitInput
                value={weight}
                onChangeText={setWeight}
                metricUnit="kg"
                imperialUnit="lb"
                system={weightSystem}
                onToggle={() => setWeightSystem((u) => (u === 'metric' ? 'imperial' : 'metric'))}
              />
            </View>

            <Pressable
              style={styles.addChildBtn}
              onPress={() => void saveAndGo('/onboarding/second-child')}
            >
              <Text style={styles.addChildLabel}>Add Another Child</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Step 2 uses a ScrollView (flex:1); steps 0/1 use a static body, so add
          a flex spacer to push the CTA to the bottom. */}
      {step !== 2 && <View style={styles.spacer} />}

      {/* CTA ──────────────────────────────────────────────────────────────── */}
      <View style={styles.cta}>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <PrimaryButton
          label={createChild.isPending && step === 2 ? 'Saving…' : 'Continue'}
          onPress={onContinue}
        />
        {step === 2 && (
          <Pressable
            style={styles.skipBtn}
            onPress={() => void saveAndGo('/onboarding/permissions')}
          >
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Birthday confirm sheet */}
      <Modal
        visible={birthdayConfirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBirthdayConfirmVisible(false)}
      >
        <Pressable style={styles.confirmScrim} onPress={() => setBirthdayConfirmVisible(false)} />
        <View style={styles.confirmSheet}>
          <View style={styles.confirmHandle} />
          <Text style={styles.confirmDate}>{formattedBirthday}</Text>
          <Text style={styles.confirmTitle}>Please confirm the birthday.</Text>
          <Text style={styles.confirmBody}>
            Once saved, this date cannot be changed.{'\n'}Please double-check before continuing.
          </Text>
          <PrimaryButton
            label="Confirm"
            onPress={() => {
              setBirthdayConfirmVisible(false);
              setStep(2);
            }}
          />
          <Pressable
            style={styles.backToEditBtn}
            onPress={() => setBirthdayConfirmVisible(false)}
          >
            <Text style={styles.backToEditLabel}>Back to edit</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    gap: theme.spacing.xxl,
  },
  scrollBody: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: 120,
    gap: theme.spacing.xxl,
  },

  headingGroup: { gap: 6 },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  photoArea: {
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.l,
  },
  avatarWrap: {
    width: 128,
    height: 128,
  },
  photoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: theme.surface.brandSubtle,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: theme.text.brand,
  },

  fieldGroup: { gap: theme.spacing.s, width: '100%' },
  fieldLabel: { ...theme.typography.h4, color: theme.text.primary },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  datePicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    paddingVertical: theme.spacing.l,
    overflow: 'hidden',
  },
  colDivider: { width: 1, backgroundColor: theme.border.default },

  detailFields: { gap: theme.spacing.xl },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s },

  addChildBtn: { alignItems: 'center', paddingVertical: theme.spacing.m },
  addChildLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },

  spacer: { flex: 1, minHeight: 1 },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    paddingTop: theme.spacing.l,
    gap: theme.spacing.xs,
  },
  skipBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  errorText: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },

  // Birthday confirm sheet
  confirmScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  confirmSheet: {
    backgroundColor: theme.surface.default,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.m,
  },
  confirmHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  confirmDate: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  confirmTitle: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  confirmBody: {
    ...theme.typography.body,
    color: theme.text.secondary,
    lineHeight: 22,
  },
  backToEditBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToEditLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
});
