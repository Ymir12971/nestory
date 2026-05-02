import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme, palette } from '@/shared/theme';

// ---------- Types ----------

type Gender = 'girl' | 'boy' | 'prefer_not_to_say';

// ---------- Mock data — replace with GET /children/:id ----------

const MOCK_PROFILE = {
  id: 'child-1',
  name: 'Emma',
  dob: 'Mar 15, 2025',
  gender: 'girl' as Gender,
  heightCm: '75',
  weightKg: '20',
};

// ---------- Unit input ----------

function UnitInput({
  value,
  unit,
  onChangeText,
}: {
  value: string;
  unit: string;
  onChangeText: (v: string) => void;
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
      <Pressable
        style={styles.unitPill}
        onPress={() => { /* TODO: unit toggle cm↔in or kg↔lb */ }}
      >
        <Text style={styles.unitPillLabel}>{unit}</Text>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
    </View>
  );
}

// ---------- Screen ----------

export function ChildProfileEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pickPhoto = usePhotoPicker();

  // In production: fetch from GET /children/:id
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name,    setName]    = useState(MOCK_PROFILE.name);
  const [gender,  setGender]  = useState<Gender>(MOCK_PROFILE.gender);
  const [height,  setHeight]  = useState(MOCK_PROFILE.heightCm);
  const [weight,  setWeight]  = useState(MOCK_PROFILE.weightKg);

  const GENDERS: { key: Gender; label: string }[] = [
    { key: 'girl',             label: 'Girl'            },
    { key: 'boy',              label: 'Boy'             },
    { key: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Edit Profile</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo area */}
        <View style={styles.photoArea}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <RemixIcon name="user-5-line" size={60} color={theme.text.onColor} />
            )}
          </View>
          <Pressable onPress={async () => {
            const picked = await pickPhoto();
            const first = picked[0]; if (first) setAvatarUri(first.uri);
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
            <Text style={styles.inputDisabledText}>{MOCK_PROFILE.dob}</Text>
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
          <UnitInput value={height} unit="cm" onChangeText={setHeight} />
        </View>

        {/* Weight */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Weight</Text>
          <UnitInput value={weight} unit="kg" onChangeText={setWeight} />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.saveBtnWrap, pressed && { opacity: 0.85 }]}
          onPress={() => { /* TODO: PATCH /children/:id then router.back() */ }}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnLabel}>Save Changes</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle:  { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

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
