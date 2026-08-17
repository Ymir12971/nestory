import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Child, ChildGender, ChildPatch } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { Button } from '@/shared/components/Button';
import { NavBar } from '@/shared/components/NavBar';
import { useChild, useSubscription, useUpdateChild, uploadPhoto } from '@/api';
import { HeightInput, useHeightState } from '@/shared/components/HeightInput';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { decimalOnly, WEIGHT_MAX } from '@/shared/lib/numericInput';

type UnitSystem = 'metric' | 'imperial';

const GENDERS: { key: ChildGender; label: string }[] = [
  { key: 'girl',              label: 'Girl'              },
  { key: 'boy',               label: 'Boy'               },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function formatBirthDate(birthDate: string): string {
  return new Date(birthDate).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

// ---------- Unit input ----------

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
    <View style={styles.unitRow}>
      <TextInput
        style={styles.unitInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        returnKeyType="done"
      />
      <Pressable style={styles.unitPill} onPress={onToggle}>
        <Text style={styles.unitPillLabel}>{system === 'metric' ? metricUnit : imperialUnit}</Text>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
    </View>
  );
}

// ---------- Wrapper ----------

export function ChildProfileEditScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const childQ = useChild(id ?? null);
  const subQ = useSubscription();
  const isPremium =
    subQ.data?.subscriptionStatus === 'premium_active' ||
    subQ.data?.subscriptionStatus === 'trial_active';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar title="Edit Profile" onBack={goBack} />

      {/* ST-Child Profile Edit(free) 770:2557 — persistent warning Notify */}
      {!isPremium && subQ.data && (
        <View style={styles.freeNoticeWrap}>
          <View style={styles.freeNotice}>
            <RemixIcon name="error-warning-line" size={16} color={theme.text.warning} />
            <Text style={styles.freeNoticeText}>
              Free plan supports one active profile.{'\n'}
              You can add and edit, but switching requires Premium.
            </Text>
          </View>
        </View>
      )}

      {childQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.brand} />
        </View>
      ) : childQ.isError || !childQ.data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load profile.</Text>
          <Pressable onPress={() => childQ.refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        // key forces fresh state when navigating between siblings
        <EditForm key={childQ.data.id} child={childQ.data} />
      )}
    </SafeAreaView>
  );
}

// ---------- Form (mounted only after child loads) ----------

function EditForm({ child }: { child: Child }) {
  const router = useRouter();
  const goBack = useGoBack();
  const updateChild = useUpdateChild(child.id);
  const pickPhoto = usePhotoPicker();

  const [avatarPhoto, setAvatarPhoto] = useState<PickedPhoto | null>(null);
  const [name,    setName]    = useState(child.name);
  const [gender,  setGender]  = useState<ChildGender | null>(child.gender);

  const heightState = useHeightState({
    initialValue: child.heightValue ?? null,
    initialUnit:  child.heightUnit  ?? null,
  });

  const [weight,  setWeight]  = useState(child.weightValue?.toString() ?? '');
  const [weightSystem, setWeightSystem] = useState<UnitSystem>(
    child.weightUnit === 'lb' ? 'imperial' : 'metric',
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (updateChild.isPending) return;
    if (!name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }
    setSaveError(null);

    const weightNum = parseFloat(weight);

    try {
      const avatarUrl = avatarPhoto
        ? (await uploadPhoto(avatarPhoto, 'avatars')).fileUrl
        : undefined;

      const body: ChildPatch = {
        name: name.trim(),
        ...(gender ? { gender } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(heightState.resolve() ?? {}),
        ...(Number.isFinite(weightNum) && weightNum > 0
          ? { weightValue: weightNum, weightUnit: weightSystem === 'metric' ? 'kg' : 'lb' }
          : {}),
      };

      await updateChild.mutateAsync(body);
      goBack();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save changes.');
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo area */}
        <View style={styles.photoArea}>
          <View style={styles.avatarCircle}>
            {avatarPhoto ? (
              <Image source={{ uri: avatarPhoto.uri }} style={styles.avatarImage} />
            ) : child.avatarUrl ? (
              <Image source={{ uri: child.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <RemixIcon name="user-5-line" size={60} color={theme.text.onColor} />
            )}
          </View>
          <Pressable onPress={async () => {
            const picked = await pickPhoto();
            const first = picked[0]; if (first) setAvatarPhoto(first);
          }}>
            <Text style={styles.tapToChange}>Tap to change</Text>
          </Pressable>
        </View>

        {/* Name input */}
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.text.hint}
          autoCapitalize="words"
        />

        {/* DOB (read-only) + contact note */}
        <View style={styles.dobGroup}>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{formatBirthDate(child.birthDate)}</Text>
          </View>
          <View style={styles.dobNote}>
            <RemixIcon name="information-line" size={16} color={theme.text.secondary} />
            <Text style={styles.dobNoteText}>
              {'To update date of birth, please '}
              <Text
                style={styles.dobNoteLink}
                onPress={() => Linking.openURL('mailto:support@nestory.app')}
              >
                contact us
              </Text>
              {'.'}
            </Text>
          </View>
        </View>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.tagRow}>
            {GENDERS.map(g => (
              <Pressable
                key={g.key}
                style={[styles.tag, gender === g.key ? styles.tagSelected : styles.tagUnselected]}
                onPress={() => setGender(g.key)}
              >
                <Text style={[styles.tagLabel, gender === g.key ? styles.tagLabelSelected : styles.tagLabelUnselected]}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Height */}
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

        {/* Weight */}
        <View style={styles.fieldGroup}>
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
                // Toggling changes the unit, not the number (height converts,
                // weight does not) — re-check against the new ceiling.
                const next = u === 'metric' ? 'imperial' : 'metric';
                setWeight((w) =>
                  decimalOnly(w, 2, next === 'metric' ? WEIGHT_MAX.kg : WEIGHT_MAX.lb),
                );
                return next;
              })
            }
          />
        </View>
      </ScrollView>

      {/* cta 769:2522 — px20 / pt12, DS Primary */}
      <View style={styles.cta}>
        {saveError && <Text style={styles.errorInline}>{saveError}</Text>}
        <Button
          label={updateChild.isPending ? 'Saving…' : 'Save Changes'}
          disabled={updateChild.isPending}
          onPress={handleSave}
        />
      </View>
    </>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  // Notify 770:2557 — warning colours (not info), 1px border/warning, h64
  freeNoticeWrap: { paddingHorizontal: theme.spacing.xl },
  freeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    height: 64,
    backgroundColor: theme.surface.warningSubtle,
    borderWidth: 1,
    borderColor: theme.border.warning,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
  },
  freeNoticeText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.text.warning,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  retryText: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.l,
  },

  // Photo area
  photoArea: { alignItems: 'center' },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: theme.surface.brand,
    borderWidth: 1,
    borderColor: theme.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  tapToChange: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
    marginTop: 4,
  },

  // Inputs
  input: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    height: 48,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  inputDisabled: {
    backgroundColor: theme.surface.disabled,
    borderColor: theme.border.default,
  },
  inputDisabledText: {
    ...theme.typography.body,
    color: theme.text.hint,
    lineHeight: 48,
  },

  dobGroup: { gap: theme.spacing.s },
  dobNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  dobNoteText: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    flex: 1,
  },
  dobNoteLink: { color: theme.text.brand },

  // Gender tags
  fieldGroup: { gap: theme.spacing.s },
  fieldLabel: { ...theme.typography.h4, color: theme.text.primary },
  tagRow: { flexDirection: 'row', gap: theme.spacing.s, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  tagSelected: {
    backgroundColor: theme.surface.brand,
  },
  tagUnselected: {
    backgroundColor: theme.surface.brandSubtle,
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  tagLabel: { ...theme.typography.tagBadge },
  tagLabelSelected:   { color: theme.text.onColor  },
  tagLabelUnselected: { color: theme.text.primary   },

  // Unit row
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  unitInput: {
    flex: 1,
    backgroundColor: theme.surface.default,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    height: 48,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface.brandSubtle,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  unitPillLabel: {
    ...theme.typography.h2,
    color: theme.text.brand,
  },

  // CTA
  cta: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.text.error,
    textAlign: 'center',
  },
  saveBtnWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  saveBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
