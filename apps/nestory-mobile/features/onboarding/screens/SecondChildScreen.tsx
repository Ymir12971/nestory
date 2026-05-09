import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import { useGoBack } from '@/shared/hooks/useGoBack';

function ProgressBar() {
  return (
    <View style={pbStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={[pbStyles.seg, i < 3 ? pbStyles.active : pbStyles.inactive]} />
      ))}
    </View>
  );
}
const pbStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, height: 4 },
  seg: { flex: 1, borderRadius: theme.radius.full },
  active: { backgroundColor: theme.surface.brand },
  inactive: { backgroundColor: theme.border.default },
});

export function SecondChildScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const pickPhoto = usePhotoPicker();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');

  const next = () => router.push('/onboarding/permissions');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View>
        <View style={styles.navRow}>
          <Pressable hitSlop={8} onPress={goBack}>
            <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
          </Pressable>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.progressWrap}>
          <ProgressBar />
        </View>
      </View>

      {/* Warning notify */}
      <View style={styles.notifyWrap}>
        <View style={styles.notify}>
          <RemixIcon name="error-warning-line" size={16} color={theme.text.warning} />
          <Text style={styles.notifyText}>
            Free plan supports one active profile. You can add more now, but switching requires Premium.
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Heading */}
        <View style={styles.headingGroup}>
          <Text style={styles.heading}>Tell us about another little one</Text>
          <Text style={styles.subheading}>Optional: add a photo and name for this child.</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>✓ 1 child added</Text>
          </View>
        </View>

        {/* Photo area */}
        <Pressable
          style={styles.photoArea}
          onPress={async () => {
            const picked = await pickPhoto();
            const first = picked[0];
            if (first) setAvatarUri(first.uri);
          }}
        >
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <RemixIcon name="camera-line" size={40} color={theme.text.brand} />
            )}
          </View>
          <Text style={styles.tapLabel}>Tap to add a photo</Text>
        </Pressable>

        {/* Name input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma"
            placeholderTextColor={theme.text.hint}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.spacer} />

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.85 }]}
          onPress={next}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnLabel}>Continue</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.skipBtn} onPress={next}>
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },

  navRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  progressWrap: { paddingHorizontal: theme.spacing.xxl },

  notifyWrap: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
  },
  notify: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: theme.surface.warningSubtle,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.s,
  },
  notifyText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.warning,
  },

  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.l,
    gap: theme.spacing.xxl,
  },

  headingGroup: { gap: 6 },
  heading: { ...theme.typography.h1, color: theme.text.primary },
  subheading: { ...theme.typography.body, color: theme.text.secondary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surface.successSubtle,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
  },
  badgeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: theme.text.success,
  },

  photoArea: { alignItems: 'center', gap: 12, paddingTop: theme.spacing.m },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: theme.surface.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 128, height: 128, borderRadius: 64 },
  tapLabel: {
    ...theme.typography.body,
    color: theme.text.brand,
    fontFamily: 'Manrope_500Medium',
  },

  fieldGroup: { gap: 6 },
  fieldLabel: { ...theme.typography.h4, color: theme.text.primary },
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

  spacer: { flex: 1 },

  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    paddingTop: theme.spacing.m,
    gap: 4,
    alignItems: 'center',
  },
  btnWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnLabel: { ...theme.typography.buttonLabelM, color: theme.text.onColor },
  skipBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.brand,
  },
});
