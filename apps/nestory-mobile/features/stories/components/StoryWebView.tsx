import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type { StyleProp, ViewStyle } from 'react-native';

export type StoryWebViewProps = {
  uri:          string;
  style?:       StyleProp<ViewStyle>;
  onLoadStart?: () => void;
  onLoadEnd?:   () => void;
  onError?:     () => void;
  /** The Story page's own ✕ / "Back to Home" and "Share this Story" buttons. */
  onClose?:     () => void;
  onShare?:     () => void;
};

export function StoryWebView({ uri, style, onLoadStart, onLoadEnd, onError, onClose, onShare }: StoryWebViewProps) {
  // The page has no history to go back to in here and no shareable URL of its
  // own, so it posts these two intents up instead (StoryRendererV3.postToApp).
  const onMessage = (e: WebViewMessageEvent) => {
    let type: unknown;
    try { type = JSON.parse(e.nativeEvent.data)?.type; } catch { return; }
    if (type === 'close') onClose?.();
    else if (type === 'share') onShare?.();
  };
  return (
    <WebView
      source={{ uri }}
      style={style}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={onError}
      onMessage={onMessage}
      showsVerticalScrollIndicator={false}
    />
  );
}
