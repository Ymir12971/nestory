import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { termlyViewerUrl, type TermlyPolicy } from '@nestory/legal';
import { NavBar } from '@/shared/components/NavBar';
import { theme } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';

const TERMLY_ORIGIN = 'https://app.termly.io';

/**
 * Terms and Privacy share one screen: the app's NavBar over the Termly-hosted
 * document. The copy lives in Termly, so an update there shows up here without
 * a release.
 */
export function LegalScreen({ policy }: { policy: TermlyPolicy }) {
  const goBack = useGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <NavBar title={policy.title} onBack={goBack} />

      <WebView
        source={{ uri: termlyViewerUrl(policy) }}
        style={styles.web}
        showsVerticalScrollIndicator={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.overlay}>
            <ActivityIndicator color={theme.text.brand} />
          </View>
        )}
        renderError={() => (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>
              Couldn't load this page. Check your connection, then go back and open it again.
            </Text>
          </View>
        )}
        // Termly's page — including in-document anchors like its table of
        // contents — stays in the WebView. A link out of it (the support
        // mailto:, a third party's site) opens in the system handler instead:
        // a WebView can't follow mailto: at all and would show an error page.
        onShouldStartLoadWithRequest={(req) => {
          if (!req.isTopFrame || req.url.startsWith(TERMLY_ORIGIN) || req.url === 'about:blank') {
            return true;
          }
          void Linking.openURL(req.url).catch(() => {});
          return false;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  web: { flex: 1, backgroundColor: theme.surface.default },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.surface.default,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.text.secondary,
    textAlign: 'center',
  },
});
