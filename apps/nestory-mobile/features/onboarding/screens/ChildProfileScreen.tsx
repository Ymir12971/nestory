import React, { useState, useEffect } from 'react';
import {
  Image,
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RemixIcon from 'react-native-remix-icon';
import type { ChildCreate, ChildGender } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useCreateChild, uploadPhoto } from '@/api';
import { HeightInput, useHeightState } from '@/shared/components/HeightInput';
import { WheelColumn } from '@/shared/components/WheelColumn';
import { useGoBack } from '@/shared/hooks/useGoBack';

// 2026-07 redesign (O-Child basic info → O-Child more Details → O-Relationship):
//   step 0 basic    — avatar + name + birthday, ALL required; Continue → confirm sheet
//   step 1 details  — gender/height/weight, all optional (Continue or Skip)
//   step 2 relation — first child only; ?another=1 skips it (defaults to parent,
//                     Justin 2026-07-15: don't re-ask for additional children)
// Save → /onboarding/children (children list), which owns the Add-Another loop.

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

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [btnStyles.wrap, pressed && !disabled && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {disabled ? (
        <View style={[btnStyles.gradient, btnStyles.disabled]}>
          <Text style={btnStyles.labelDisabled}>{label}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={[palette.primary[500], palette.primary[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={btnStyles.gradient}
        >
          <Text style={btnStyles.label}>{label}</Text>
        </LinearGradient>
      )}
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
  disabled: { backgroundColor: theme.border.default },
  label: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
  labelDisabled: { ...theme.typography.buttonLabelM, color: theme.text.hint },
});

// ─── Selectable tag (gender / relationship) ──────────────────────────────────

function SelectTag({
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

// O-Relationship options (Figma 751:1396). "Other..." activates a free-text input.
const RELATIONSHIPS = [
  'Mom', 'Dad', 'Grandma', 'Grandpa', 'Auntie', 'Uncle', 'Prefer not to say', 'Other...',
] as const;
type Relationship = (typeof RELATIONSHIPS)[number] | null;

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ChildProfileScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const pickPhoto = usePhotoPicker();
  const createChild = useCreateChild();
  // ?another=1 → adding an additional child from the children list:
  // relationship step is skipped (defaults to the first child's answer).
  const { another } = useLocalSearchParams<{ another?: string }>();
  const isAnother = another === '1';
  const [step, setStep] = useState<Step>(0);

  const [name, setName] = useState('');
  const [avatarPhoto, setAvatarPhoto] = useState<PickedPhoto | null>(null);

  // Birthday defaults to today (annotation: 缺省显示当天日期); picker capped at today.
  const today = new Date();
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [dayIdx, setDayIdx] = useState(today.getDate() - 1);
  const [yearIdx, setYearIdx] = useState(YEARS.indexOf(String(THIS_YEAR)));
  const [birthdayTouched, setBirthdayTouched] = useState(false);
  const [birthdaySheetVisible, setBirthdaySheetVisible] = useState(false);

  const [gender, setGender] = useState<Gender>(null);
  const heightState = useHeightState();
  const [weight, setWeight] = useState('');
  const [weightSystem, setWeightSystem] = useState<UnitSystem>('metric');

  const [relationship, setRelationship] = useState<Relationship>(null);
  const [customRelationship, setCustomRelationship] = useState('');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [birthdayConfirmVisible, setBirthdayConfirmVisible] = useState(false);

  const onBack = () => {
    if (step === 0) goBack();
    else setStep((s) => (s - 1) as Step);
  };

  const formattedBirthday = `${MONTHS[monthIdx]} ${DAYS[dayIdx]}, ${YEARS[yearIdx]}`;

  const selectedBirthday = () =>
    new Date(Number(YEARS[yearIdx]), monthIdx, Number(DAYS[dayIdx] ?? '1'));

  // Basic step gate: avatar + name + birthday all required (annotation: 三项必填).
  const basicComplete = !!avatarPhoto && name.trim().length > 0 && birthdayTouched;

  // Relationship gate: a non-Other pick, or Other with non-empty custom text.
  const relationshipComplete =
    relationship !== null &&
    (relationship !== 'Other...' || customRelationship.trim().length > 0);

  const buildBody = (avatarUrl?: string): ChildCreate => {
    const month = String(monthIdx + 1).padStart(2, '0');
    const day   = (DAYS[dayIdx] ?? '1').padStart(2, '0');
    const year  = YEARS[yearIdx];

    const weightNum = parseFloat(weight);

    // NOTE: relationship (who the user is to the child) has no backend column
    // yet — captured in UI, not persisted. See WorkPlan §6 backend follow-ups.
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

  const saveAndGoChildren = async () => {
    if (createChild.isPending) return;
    setSaveError(null);
    try {
      const avatarUrl = avatarPhoto
        ? (await uploadPhoto(avatarPhoto, 'avatars')).fileUrl
        : undefined;
      await createChild.mutateAsync(buildBody(avatarUrl));
      router.replace('/onboarding/children');
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save profile. Please try again.');
    }
  };

  /** Leaving the details step: relationship next for the first child, else save. */
  const advanceFromDetails = () => {
    if (isAnother) void saveAndGoChildren();
    else setStep(2);
  };

  const onContinue = () => {
    if (step === 0) {
      if (!basicComplete) return;
      if (selectedBirthday() > new Date()) {
        setSaveError('Birthday cannot be in the future.');
        return;
      }
      setSaveError(null);
      setBirthdayConfirmVisible(true);
    } else if (step === 1) {
      advanceFromDetails();
    } else {
      if (!relationshipComplete) return;
      void saveAndGoChildren();
    }
  };

  const ctaDisabled =
    (step === 0 && !basicComplete) ||
    (step === 2 && !relationshipComplete);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar onBack={onBack} filled={step + 1} />

      {/* ── Step 0: Basic info — photo + name + birthday ─────────────────── */}
      {step === 0 && (
        <View style={styles.body}>
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>Tell us about your little one</Text>
            <Text style={styles.subheading}>
              This helps us track milestones and create more appropriate and personal stories.
            </Text>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Birthday</Text>
            <Pressable style={styles.birthdayField} onPress={() => setBirthdaySheetVisible(true)}>
              <Text style={birthdayTouched ? styles.birthdayValue : styles.birthdayPlaceholder}>
                {birthdayTouched ? formattedBirthday : 'e.g. July 15, 2026'}
              </Text>
              <Text style={styles.birthdaySelect}>Select</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step 1: Details (all optional) ───────────────────────────────── */}
      {step === 1 && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>
              A few more details help create better stories
            </Text>
            <Text style={styles.subheading}>All optional — share what feels right</Text>
          </View>

          <View style={styles.detailFields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.tagRow}>
                {(['Girl', 'Boy', 'Prefer not to say'] as const).map((g) => (
                  <SelectTag
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
          </View>
        </ScrollView>
      )}

      {/* ── Step 2: Relationship (first child only) ──────────────────────── */}
      {step === 2 && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>Who are you to your little one?</Text>
            <Text style={styles.subheading}>
              We'll use this to make every Story feel more personal.
            </Text>
          </View>

          <View style={styles.tagRow}>
            {RELATIONSHIPS.map((r) => (
              <SelectTag
                key={r}
                label={r}
                selected={relationship === r}
                onPress={() => setRelationship(r)}
              />
            ))}
          </View>

          {/* Custom input: enabled only while "Other..." is selected; switching
              back to a preset disables it but keeps the text (annotation). */}
          <TextInput
            style={[
              styles.textInput,
              relationship !== 'Other...' && styles.textInputDisabled,
            ]}
            value={customRelationship}
            onChangeText={setCustomRelationship}
            placeholder="Tell us who you are"
            placeholderTextColor={theme.text.hint}
            editable={relationship === 'Other...'}
          />
        </ScrollView>
      )}

      {/* Steps 1/2 use a ScrollView (flex:1); step 0 uses a static body, so add
          a flex spacer to push the CTA to the bottom. */}
      {step === 0 && <View style={styles.spacer} />}

      {/* CTA ──────────────────────────────────────────────────────────────── */}
      <View style={styles.cta}>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <PrimaryButton
          label={createChild.isPending ? 'Saving…' : 'Continue'}
          onPress={onContinue}
          disabled={ctaDisabled}
        />
        {step === 1 && (
          <Pressable
            style={styles.skipBtn}
            onPress={() => {
              // Skip = discard this page's inputs entirely (annotation: 全部当空内容).
              setGender(null);
              heightState.setCm('');
              setWeight('');
              advanceFromDetails();
            }}
          >
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Birthday picker sheet */}
      <Modal
        visible={birthdaySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBirthdaySheetVisible(false)}
      >
        <Pressable style={styles.confirmScrim} onPress={() => setBirthdaySheetVisible(false)} />
        <View style={styles.confirmSheet}>
          <View style={styles.confirmHandle} />
          <View style={styles.datePicker}>
            <WheelColumn items={MONTHS} selectedIndex={monthIdx} onChange={setMonthIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={DAYS} selectedIndex={dayIdx} onChange={setDayIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={YEARS} selectedIndex={yearIdx} onChange={setYearIdx} />
          </View>
          <PrimaryButton
            label="Done"
            onPress={() => {
              setBirthdayTouched(true);
              setBirthdaySheetVisible(false);
            }}
          />
        </View>
      </Modal>

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
              setStep(1);
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
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.s,
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
  textInputDisabled: {
    backgroundColor: theme.surface.default,
    color: theme.text.hint,
  },

  birthdayField: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    backgroundColor: theme.surface.card,
    paddingHorizontal: theme.spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  birthdayValue: { ...theme.typography.body, color: theme.text.primary },
  birthdayPlaceholder: { ...theme.typography.body, color: theme.text.hint },
  birthdaySelect: { ...theme.typography.buttonLabelM, color: theme.text.brand },

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

  // Bottom sheets (birthday picker + confirm)
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
