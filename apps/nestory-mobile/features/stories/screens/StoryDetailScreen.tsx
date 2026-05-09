import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import WebView from 'react-native-webview';
import { theme, palette } from '@/shared/theme';
import { config } from '@/shared/config';
import { useStory } from '@/api';
import { useGoBack } from '@/shared/hooks/useGoBack';

// TODO: wire auth token injection so nestory-web can authenticate the WebView request

const HERO_H = 420;

function parseMonthKey(monthKey: string): { navTitle: string; heroTitle: string } {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  return {
    navTitle: `Story of ${monthName} ${year}`,
    heroTitle: `${monthName} ${year}`,
  };
}

export function StoryDetailScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyQ = useStory(id ?? null);

  const [webviewState, setWebviewState] = useState<'loading' | 'loaded' | 'error'>('loading');

  const webUrl = `${config.webBaseUrl}/story/${id}`;

  const meta       = storyQ.data?.document.meta;
  const monthKey   = storyQ.data?.monthKey;
  const navTitle   = monthKey ? parseMonthKey(monthKey).navTitle : 'Story';
  const heroTitle  = meta?.title ?? '';
  const heroSubtitle = storyQ.data?.document.shareMeta.ogDescription ?? '';
  const coverImageUrl = meta?.coverImageUrl ?? null;

  const handleShare = async () => {
    // TODO: call POST /shares to get shareUrl + ogTitle, then use Share.share()
    try {
      await Share.share({ url: webUrl, title: heroTitle || 'Story' });
    } catch {
      // user dismissed — no-op
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <View style={[styles.hero, { height: HERO_H }]}>
        {coverImageUrl ? (
          <ImageBackground
            source={{ uri: coverImageUrl }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroBg]} />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={{ height: insets.top }} />
        <View style={styles.navBar}>
          <Pressable hitSlop={8} onPress={goBack}>
            <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.onColor} />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>{navTitle}</Text>
          <View style={styles.navSpacer} />
        </View>

        {(heroTitle || heroSubtitle) && (
          <View style={styles.titleGroup}>
            {heroTitle ? <Text style={styles.heroTitle}>{heroTitle}</Text> : null}
            {heroSubtitle ? <Text style={styles.heroSubtitle}>{heroSubtitle}</Text> : null}
          </View>
        )}
      </View>

      {/* ── WebView body ─────────────────────────────────────── */}
      <View style={styles.webviewWrap}>
        <WebView
          source={{ uri: webUrl }}
          style={styles.webview}
          onLoadStart={() => setWebviewState('loading')}
          onLoadEnd={() => setWebviewState('loaded')}
          onError={() => setWebviewState('error')}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading overlay — hero stays, body shows skeleton (S-02 Story Detail · Loading) */}
        {webviewState === 'loading' && (
          <View style={styles.webviewOverlay}>
            <ActivityIndicator size="large" color={theme.surface.brand} />
            <Text style={styles.loadingCaption}>Loading your Story…</Text>
          </View>
        )}

        {/* Error overlay — S-02 Story Detail · Load Failed */}
        {webviewState === 'error' && (
          <View style={styles.webviewOverlay}>
            <RemixIcon name="error-warning-line" size={40} color={theme.text.secondary} />
            <Text style={styles.errorTitle}>Couldn't load this Story</Text>
            <Text style={styles.errorCaption}>
              Check your connection and pull down to retry.
            </Text>
            {/* Toast · Story Load Failed should fire here — TODO once Toast component is implemented */}
          </View>
        )}
      </View>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + theme.spacing.m }]}>
        <Pressable
          style={({ pressed }) => [styles.shareButtonWrap, pressed && { opacity: 0.85 }]}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonLabel}>Share this story</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // Hero
  hero: {
    overflow: 'hidden',
  },
  heroBg: {
    backgroundColor: '#6b8c4d', // Figma placeholder; replace with cover image
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
    height: 56,
  },
  navTitle: {
    ...theme.typography.h2,
    color: theme.text.onColor,
  },
  navSpacer: { width: 24 },
  titleGroup: {
    position: 'absolute',
    top: 260,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.text.onColor,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.text.onColor,
  },

  // WebView
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },
  webviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  errorTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
    textAlign: 'center',
  },
  errorCaption: {
    ...theme.typography.caption,
    color: theme.text.secondary,
    textAlign: 'center',
  },

  // CTA
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
  },
  shareButtonWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  shareButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
