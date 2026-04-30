import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Hero */}
      <LinearGradient
        colors={['#14171c', '#47291a', '#d98c38']}
        locations={[0, 0.55, 1]}
        style={styles.hero}
      >
        <View style={styles.ellipse} />
      </LinearGradient>

      {/* Brand */}
      <View style={styles.brand}>
        <Image source={require('@/assets/images/nestory-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Every little moment becomes a story</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.headline}>
          {'Your baby is growing every day.\nLet\'s make sure you remember it all.'}
        </Text>
        <View style={styles.thumbs}>
          <View style={[styles.thumb, { backgroundColor: '#f2d1cc' }]} />
          <View style={[styles.thumb, { backgroundColor: '#b2d9eb' }]} />
          <View style={[styles.thumb, { backgroundColor: '#fae0b8' }]} />
        </View>
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.buttonWrap, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/onboarding/auth')}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Get Started</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  hero: {
    flex: 1,
    overflow: 'hidden',
  },
  ellipse: {
    position: 'absolute',
    left: 126,
    top: 140,
    width: 140,
    height: 160,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  brand: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
  },
  logo: {
    width: 141,
    height: 45,
  },
  tagline: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },
  body: {
    alignItems: 'center',
    gap: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
  },
  headline: {
    ...theme.typography.h2,
    color: theme.text.primary,
    textAlign: 'center',
  },
  thumbs: {
    flexDirection: 'row',
    gap: theme.spacing.m,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: theme.radius.m,
  },
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.safeBtm,
    paddingTop: theme.spacing.xxl,
  },
  buttonWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.surface.brandSubtle,
  },
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
