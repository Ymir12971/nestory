import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { theme, palette } from '@/shared/theme';
import { config } from '@/shared/config';
import { useStory, getAuthToken, useCreateShare } from '@/api';
import { showToast } from '@/features/ui/toast';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { StoryWebView } from '../components/StoryWebView';

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  const date = new Date(year, month - 1, 1);
  return `Story of ${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
}

export function StoryDetailScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyQ = useStory(id ?? null);

  const [webviewState, setWebviewState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const createShare = useCreateShare();
  const [sharing, setSharing] = useState(false);
  // Resolve the auth token once and inject it as ?t=… so the web page can
  // authenticate against the API server-side. We resolve it asynchronously
  // because Supabase's getSession is a promise; the WebView stays in
  // `loading` until the URL is ready.
  const [webUrl, setWebUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAuthToken().then((tok) => {
      if (cancelled || !id) return;
      setWebUrl(`${config.webBaseUrl}/story/${id}?t=${encodeURIComponent(tok)}`);
    }).catch(() => {
      if (!cancelled) setWebviewState('error');
    });
    return () => { cancelled = true; };
  }, [id]);

  const monthKey  = storyQ.data?.monthKey;
  const navTitle  = monthKey ? formatMonth(monthKey) : 'Story';
  // Used only as a fallback share title — the rendered cover/title come from
  // the WebView (StoryRenderer.tsx) so we no longer paint them natively.
  const docTitle  = storyQ.data?.document.meta.title ?? '';

  const handleShare = async () => {
    if (!id || sharing) return;
    setSharing(true);
    try {
      // POST /shares is idempotent — reuses an existing active token if any.
      // We build the URL with our own webBaseUrl so it works regardless of
      // the backend's NESTORY_WEB_URL env.
      const share = await createShare.mutateAsync({ storyId: id });
      const url   = `${config.webBaseUrl}/share/${share.token}`;
      const title = share.og.title || docTitle || 'Nestory Story';
      await Share.share({
        title,
        url,
        // Android only honours `message`; iOS uses url+title. Include both.
        message: `${title}\n${url}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't share this story: ${msg}` });
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── NavBar (cover + title rendered by the WebView itself) ──── */}
      <View style={{ height: insets.top, backgroundColor: theme.surface.default }} />
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>{navTitle}</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* ── WebView body ─────────────────────────────────────── */}
      <View style={styles.webviewWrap}>
        {webUrl ? (
          <StoryWebView
            uri={webUrl}
            style={styles.webview}
            onLoadStart={() => setWebviewState('loading')}
            onLoadEnd={() => setWebviewState('loaded')}
            onError={() => {
              setWebviewState('error');
              showToast({ type: 'error', message: "Couldn't load this Story. Pull down to retry." });
            }}
          />
        ) : null}

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
          </View>
        )}
      </View>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + theme.spacing.m }]}>
        <Pressable
          style={({ pressed }) => [styles.shareButtonWrap, (pressed || sharing) && { opacity: 0.85 }]}
          onPress={handleShare}
          disabled={sharing}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonLabel}>
              {sharing ? 'Preparing link…' : 'Share this story'}
            </Text>
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

  // NavBar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
    height: 56,
    backgroundColor: theme.surface.default,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.default,
  },
  navTitle: {
    ...theme.typography.h2,
    color: theme.text.primary,
  },
  navSpacer: { width: 24 },

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
