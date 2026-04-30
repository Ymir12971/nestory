import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/shared/theme';

export function SignInScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <Text style={styles.heart}>♥</Text>
          <Text style={styles.brandName}>Nestory</Text>
        </View>

        <View style={styles.headlineGroup}>
          <Text style={styles.headline}>Welcome to Nestory</Text>
          <Text style={styles.subtitle}>
            Sign in to start capturing your little one's story
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <Pressable
            style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
            onPress={() => {
              // TODO: features/auth/api/authApi.ts → signInWithApple
            }}
          >
            <Text style={styles.appleIcon}>{''}</Text>
            <Text style={styles.socialButtonLabel}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
            onPress={() => {
              // TODO: features/auth/api/authApi.ts → signInWithGoogle
            }}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.socialButtonLabel}>Continue with Google</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms of Service</Text>
          {' and '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.brand,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    marginTop: theme.spacing.xxl * 2,
  },
  heart: {
    fontSize: 28,
    color: theme.text.onColor,
    lineHeight: 38,
  },
  brandName: {
    ...theme.typography.h1,
    color: theme.text.onColor,
  },
  headlineGroup: {
    gap: theme.spacing.m,
    alignItems: 'center',
    marginTop: -theme.spacing.xxl * 2,
  },
  headline: {
    ...theme.typography.h1,
    color: theme.text.onColor,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.text.onColor,
    opacity: 0.85,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  buttonGroup: {
    gap: theme.spacing.m,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.m,
    backgroundColor: theme.surface.card,
    height: 52,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.l,
  },
  socialButtonPressed: {
    opacity: 0.85,
  },
  socialButtonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.primary,
  },
  appleIcon: {
    fontSize: 20,
    color: theme.text.primary,
    lineHeight: 22,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 22,
  },
  footer: {
    ...theme.typography.caption,
    color: theme.text.onColor,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
});
