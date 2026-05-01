import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

export function SignInScreen() {
  const router = useRouter();
  return (
    <LinearGradient
      colors={[palette.primary[600], palette.primary[400]]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top white card: photo + logo */}
        <View style={styles.card}>
          <Image
            source={require('@/assets/images/family-trip-1.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <Image
            source={require('@/assets/images/nestory-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.headline}>Welcome to Nestory</Text>
          <Text style={styles.subtitle}>
            Sign in to start capturing your little one's story
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
            onPress={() => {
              // TODO: features/auth/api/authApi.ts → signInWithApple
            }}
          >
            <RemixIcon name="apple-fill" size={22} color={theme.text.brand} />
            <Text style={styles.socialButtonLabel}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
            onPress={() => {
              // TODO: features/auth/api/authApi.ts → signInWithGoogle
            }}
          >
            <RemixIcon name="google-fill" size={20} color={theme.text.brand} />
            <Text style={styles.socialButtonLabel}>Continue with Google</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
          <Text style={styles.footerText}>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/onboarding/terms')}
            >
              Terms of Service
            </Text>
            {' and '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/onboarding/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: theme.surface.default,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.l,
    gap: theme.spacing.l,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 400 / 236,
    borderRadius: theme.radius.m,
  },
  logo: {
    width: 149,
    height: 49,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 50,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.onBrandSubtle,
    textAlign: 'center',
  },
  buttonGroup: {
    paddingTop: theme.spacing.xxl,
    gap: theme.spacing.m,
    alignItems: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.surface.default,
    height: 52,
    width: 290,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border.brand,
  },
  pressed: {
    opacity: 0.85,
  },
  socialButtonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.xs,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.text.onBrandSubtle,
    textAlign: 'center',
  },
  footerLink: {
    fontFamily: 'Manrope_600SemiBold',
    color: theme.text.onBrandEmphasis,
  },
});
