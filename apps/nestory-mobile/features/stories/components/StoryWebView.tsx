import WebView from 'react-native-webview';
import type { StyleProp, ViewStyle } from 'react-native';

export type StoryWebViewProps = {
  uri:          string;
  style?:       StyleProp<ViewStyle>;
  onLoadStart?: () => void;
  onLoadEnd?:   () => void;
  onError?:     () => void;
};

export function StoryWebView({ uri, style, onLoadStart, onLoadEnd, onError }: StoryWebViewProps) {
  return (
    <WebView
      source={{ uri }}
      style={style}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={onError}
      showsVerticalScrollIndicator={false}
    />
  );
}
