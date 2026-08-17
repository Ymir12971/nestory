import React, { useState, useEffect } from 'react';
import {
  Image,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RemixIcon from 'react-native-remix-icon';
import type { ChildCreate, ChildGender } from '@nestory/types';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { Tag } from '@/shared/components/Tag';
import { theme, palette } from '@/shared/theme';
import { useCreateChild, uploadPhoto } from '@/api';
import { HeightInput, useHeightState } from '@/shared/components/HeightInput';
import { WheelColumn } from '@/shared/components/WheelColumn';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { decimalOnly, WEIGHT_MAX } from '@/shared/lib/numericInput';

// 2026-07 redesign (O-Child basic info → O-Child more Details → O-Relationship):
//   step 0 basic    — avatar + name + birthday, ALL required; Continue → confirm sheet
//   step 1 details  — gender/height/weight, all optional (Continue or Skip)
//   step 2 relation — first child only; ?another=1 skips it (defaults to parent,
//                     Justin 2026-07-15: don't re-ask for additional children)
// Save → /onboarding/children (children list), which owns the Add-Another loop.

// NavBar / progress bar, the CTA button and the gender-relationship tags all
// come from the shared DS components now — the local copies drifted (5 progress
// segments instead of 3, 24px nav padding instead of 20, a disabled CTA that
// kept its 2px ring and used text/hint for the label).

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
        {/* 193:1382 — the unit label sits in a fixed 32-wide slot so cm↔ft and
            kg↔lbs don't shift the chevron */}
        <View style={unitStyles.unitSlot}>
          <Text style={unitStyles.unitLabel}>{system === 'metric' ? metricUnit : imperialUnit}</Text>
        </View>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
    </View>
  );
}

const unitStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.s, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0, // 750:2499 min-w-px — see HeightInput
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
  unitSlot: {
    width: 32,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
  // `from=settings` marks the Settings entry points (Settings page "+Add child"
  // and the Child Profile list CTA) so we return there instead of continuing
  // the onboarding chain.
  const { another, from } = useLocalSearchParams<{ another?: string; from?: string }>();
  const isAnother = another === '1';
  const fromSettings = from === 'settings';
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

    // Relationship: preset label, or the custom text for "Other...".
    // "Prefer not to say" and the ?another=1 loop send nothing.
    const relationshipValue =
      relationship === 'Other...' ? customRelationship.trim()
      : relationship === 'Prefer not to say' || relationship === null ? ''
      : relationship;

    return {
      name:      name.trim(),
      birthDate: `${year}-${month}-${day}`,
      ...(gender ? { gender: GENDER_TO_API[gender] } : {}),
      ...(relationshipValue ? { relationship: relationshipValue } : {}),
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
      // Entered from Settings → go back there. Without this the user lands on
      // the onboarding children list and gets walked through permissions and
      // plan again, with no way back to Settings.
      router.replace(fromSettings ? '/settings/profiles' : '/onboarding/children');
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
      {/* All three child-profile screens sit on segment 1 of 3 in the design
          (739:1157 / 739:1258 / 816:3347 all fill only the first bar) — the
          segments track the onboarding phase, not the step within this form. */}
      <NavBar onBack={onBack} progress={{ total: 3, active: 1 }} />

      {/* ── Step 0: Basic info — photo + name + birthday ─────────────────── */}
      {step === 0 && (
        <>
          <View style={styles.titleBlock}>
            <Text style={styles.heading}>Tell us about your little one</Text>
            <Text style={styles.subheading}>
              This helps us track milestones and create more appropriate and personal stories.
            </Text>
          </View>

          <View style={styles.body}>
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
              {/* 739:1164 — 40px camera glyph centred in the ring, not a corner badge */}
              {!avatarPhoto && (
                <View style={styles.cameraGlyph}>
                  <RemixIcon name="camera-line" size={40} color={palette.primary[500]} />
                </View>
              )}
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
        </>
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
            <View style={styles.fieldGroupDetails}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.tagRow}>
                {(['Girl', 'Boy', 'Prefer not to say'] as const).map((g) => (
                  <Tag
                    key={g}
                    label={g}
                    status={gender === g ? 'selected' : 'unselected'}
                    style={styles.tagRoomy}
                    labelStyle={styles.tagRoomyLabel}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.fieldGroupDetails}>
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

            <View style={styles.fieldGroupDetails}>
              <Text style={styles.fieldLabel}>Weight</Text>
              <UnitInput
                value={weight}
                onChangeText={(v) =>
                  setWeight(decimalOnly(v, 2, weightSystem === 'metric' ? WEIGHT_MAX.kg : WEIGHT_MAX.lb))
                }
                metricUnit="kg"
                imperialUnit="lb"
                system={weightSystem}
                onToggle={() =>
                  setWeightSystem((u) => {
                    // The toggle changes the unit, not the number (unlike
                    // height, which converts) — so re-check the value against
                    // the new ceiling, or 200 lb would survive as 200 kg.
                    const next = u === 'metric' ? 'imperial' : 'metric';
                    setWeight((w) =>
                      decimalOnly(w, 2, next === 'metric' ? WEIGHT_MAX.kg : WEIGHT_MAX.lb),
                    );
                    return next;
                  })
                }
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

          {/* 752:1569 — the six kinship tags wrap; "Prefer not to say" sits on
              its own row; "Other..." shares a row with its free-text input. */}
          <View style={styles.relationshipGroup}>
            <View style={styles.tagRow}>
              {RELATIONSHIPS.slice(0, 6).map((r) => (
                <Tag
                  key={r}
                  label={r}
                  status={relationship === r ? 'selected' : 'unselected'}
                  style={styles.tagRoomy}
                  labelStyle={styles.tagRoomyLabel}
                  onPress={() => setRelationship(r)}
                />
              ))}
            </View>

            <View style={styles.tagRow}>
              <Tag
                label="Prefer not to say"
                status={relationship === 'Prefer not to say' ? 'selected' : 'unselected'}
                style={styles.tagRoomy}
                labelStyle={styles.tagRoomyLabel}
                onPress={() => setRelationship('Prefer not to say')}
              />
            </View>

            <View style={styles.otherRow}>
              <Tag
                label="Other..."
                status={relationship === 'Other...' ? 'selected' : 'unselected'}
                style={styles.tagRoomy}
                labelStyle={styles.tagRoomyLabel}
                onPress={() => setRelationship('Other...')}
              />
              {/* Enabled only while "Other..." is selected; switching back to a
                  preset disables it but keeps the text (annotation). */}
              <TextInput
                style={[
                  styles.textInput,
                  styles.otherInput,
                  relationship !== 'Other...' && styles.textInputDisabled,
                ]}
                value={customRelationship}
                onChangeText={setCustomRelationship}
                placeholder="e.g. Nana"
                placeholderTextColor={theme.text.hint}
                editable={relationship === 'Other...'}
              />
            </View>
          </View>
        </ScrollView>
      )}

      {/* Steps 1/2 use a ScrollView (flex:1); step 0 uses a static body, so add
          a flex spacer to push the CTA to the bottom. */}
      {step === 0 && <View style={styles.spacer} />}

      {/* CTA ──────────────────────────────────────────────────────────────── */}
      {/* Basic info pads the CTA block 16 from the body; the later two use 12 */}
      <View style={[styles.cta, step !== 0 && styles.ctaTight]}>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <Button
          label={createChild.isPending ? 'Saving…' : 'Continue'}
          onPress={onContinue}
          disabled={ctaDisabled}
        />
        {step === 1 && (
          <Pressable
            style={styles.skipBtn}
            onPress={() => {
              // Skip = discard this page's inputs entirely (annotation: 全部当空内容).
              // reset() clears cm/ft/inches together — clearing just the field
              // on screen left a value behind whenever the user had toggled units.
              setGender(null);
              heightState.reset();
              setWeight('');
              setWeightSystem('metric');
              advanceFromDetails();
            }}
          >
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Birthday picker sheet */}
      <BottomSheet
        visible={birthdaySheetVisible}
        onRequestClose={() => setBirthdaySheetVisible(false)}
      >
        <View style={sheetSection.body}>
          <View style={styles.datePicker}>
            <WheelColumn items={MONTHS} selectedIndex={monthIdx} onChange={setMonthIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={DAYS} selectedIndex={dayIdx} onChange={setDayIdx} />
            <View style={styles.colDivider} />
            <WheelColumn items={YEARS} selectedIndex={yearIdx} onChange={setYearIdx} />
          </View>
        </View>
        <View style={sheetSection.cta}>
          <Button
            label="Done"
            onPress={() => {
              setBirthdayTouched(true);
              setBirthdaySheetVisible(false);
            }}
          />
        </View>
      </BottomSheet>

      {/* Birthday confirm sheet (739:1224) */}
      <BottomSheet
        visible={birthdayConfirmVisible}
        onRequestClose={() => setBirthdayConfirmVisible(false)}
      >
        <View style={sheetSection.title}>
          <Text style={styles.confirmDate}>{formattedBirthday}</Text>
        </View>
        <View style={sheetSection.body}>
          <Text style={styles.confirmBody}>
            Please confirm the birthday.{'\n'}
            {'\n'}
            Once saved, this date cannot be changed. Please double-check before continuing.
          </Text>
        </View>
        <View style={sheetSection.cta}>
          <Button
            label="Confirm"
            onPress={() => {
              setBirthdayConfirmVisible(false);
              setStep(1);
            }}
          />
          <Button
            label="Back to edit"
            type="text"
            style={styles.textBtn44}
            onPress={() => setBirthdayConfirmVisible(false)}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  // title 752:1760 / body 739:1158 — both px 20 / py 16; the body's own children
  // are 24 apart, so title-to-body reads as 32.
  titleBlock: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    gap: 6,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.xxl,
  },
  scrollBody: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
    paddingBottom: 120,
    // title pb 16 + body pt 16 between the heading block and the fields
    gap: 32,
  },

  // More Details / Relationship set the heading-to-subtitle gap at 12 (basic
  // info uses 6).
  headingGroup: { gap: 12 },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },

  // photoArea 739:1162 — py 24, gap 12
  photoArea: {
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.xxl,
  },
  avatarWrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1,
    borderColor: palette.primary[200], // #a6ecbf ring (739:1163)
  },
  cameraGlyph: { position: 'absolute' },
  photoLabel: {
    // DS Button Type=Text label
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  fieldGroup: { gap: 6, width: '100%' },
  fieldGroupDetails: { gap: theme.spacing.s, width: '100%' }, // 750:2450 uses 8
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
    // 752:1566 — disabled Input is surface/disabled with a border/disabled edge
    backgroundColor: theme.surface.disabled,
    borderColor: theme.border.disabled,
    color: theme.text.hint,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.l, // 16
  },
  otherInput: { flex: 1 },

  birthdayField: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.strong, // 748:2435 uses border/strong, not default
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

  detailFields: { gap: 32 }, // 750:2449
  relationshipGroup: { gap: theme.spacing.l }, // 751:1455
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.l }, // 16
  // Both onboarding screens instance a roomier tag than the DS default:
  // px 16 / py 8 with a Body label instead of px 12 / py 6 + Tag&Badge.
  tagRoomy: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
  },
  tagRoomyLabel: { ...theme.typography.body },

  spacer: { flex: 1, minHeight: 1 },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    paddingTop: theme.spacing.l,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  ctaTight: { paddingTop: 12 },
  skipBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  errorText: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },

  // Bottom-sheet content (shell comes from shared/components/BottomSheet)
  confirmDate: {
    ...theme.typography.h1,
    color: theme.text.primary,
  },
  confirmBody: {
    ...theme.typography.body, // Inter Regular 16/20, text/primary — not secondary
    color: theme.text.primary,
  },
  // The design instances the DS Text button at 44 tall in sheets (775:2325)
  textBtn44: { height: 44 },
});
