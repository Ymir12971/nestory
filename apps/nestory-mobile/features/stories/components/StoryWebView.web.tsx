import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export type StoryWebViewProps = {
  uri:          string;
  style?:       StyleProp<ViewStyle>;
  onLoadStart?: () => void;
  onLoadEnd?:   () => void;
  onError?:     () => void;
};

export function StoryWebView({ uri, style, onLoadEnd, onError }: StoryWebViewProps) {
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <iframe
        src={uri}
        title="story"
        onLoad={onLoadEnd}
        onError={onError}
        style={{
          position: 'absolute',
          inset:    0,
          border:   0,
          width:    '100%',
          height:   '100%',
        }}
      />
    </View>
  );
}
