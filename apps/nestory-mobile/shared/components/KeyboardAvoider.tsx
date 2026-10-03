import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Keeps its children above the soft keyboard by padding its own bottom.
 *
 * iOS is a plain KeyboardAvoidingView. Android can't use one: it takes the
 * keyboard's top edge from the event's `screenY`, which RN reads off the
 * window's visible frame (ReactRootView.checkForKeyboardEvents). Where the
 * system enforces edge-to-edge (Android 16, targetSdk 36) that frame no longer
 * shrinks for the keyboard, so `screenY` sits at the nav bar and the view pads
 * by the nav bar's height only — inputs and footers stay covered.
 *
 * The event's `height` comes straight from the IME inset and is right either
 * way, so the keyboard's top is derived from that, and the padding is however
 * far this view reaches below it.
 */
export function KeyboardAvoider({ style, children }: Props) {
  if (Platform.OS !== 'android') {
    return (
      <KeyboardAvoidingView style={style} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <AndroidKeyboardAvoider style={style}>{children}</AndroidKeyboardAvoider>;
}

function AndroidKeyboardAvoider({ style, children }: Props) {
  const ref = useRef<View>(null);
  const [padding, setPadding] = useState(0);
  const insets = useSafeAreaInsets();
  const navBarInset = useRef(insets.bottom);
  navBarInset.current = insets.bottom;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      // `height` excludes the nav bar the keyboard sits on top of.
      const keyboardTop =
        Dimensions.get('screen').height - navBarInset.current - e.endCoordinates.height;
      // pageY, not measureInWindow: the latter is offset by the status bar.
      ref.current?.measure((_x, _y, _w, h, _pageX, pageY) => {
        setPadding(Math.max(0, pageY + h - keyboardTop));
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setPadding(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View ref={ref} collapsable={false} style={[style, { paddingBottom: padding }]}>
      {children}
    </View>
  );
}
