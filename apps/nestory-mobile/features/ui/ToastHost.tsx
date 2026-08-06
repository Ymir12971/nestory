import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { palette, theme } from '@/shared/theme';
import { dismissToast, useToastState, type ToastType } from './toast';

// DS Toast — Figma `Molecule · Toast` (329:48). A 276-wide card centred on the
// screen: 48px glyph above a centred Body line, on a *-subtle fill with the
// matching border. The designer's annotation pins position and duration:
// dead centre, two seconds, identical for every state.
//
// `info` isn't drawn in the DS (Success / Warning / Error only); it reuses the
// same recipe with the info-* tokens that Notify already uses.
const VARIANTS: Record<
  ToastType,
  { icon: string; background: string; border: string; color: string }
> = {
  success: {
    icon: 'checkbox-circle-line',
    background: theme.surface.successSubtle,
    border: theme.border.success,
    color: theme.text.success,
  },
  warning: {
    icon: 'error-warning-line',
    background: theme.surface.warningSubtle,
    border: theme.border.warning,
    color: theme.text.warning,
  },
  error: {
    icon: 'spam-3-line',
    background: theme.surface.errorSubtle,
    border: theme.border.error,
    color: theme.text.error,
  },
  info: {
    icon: 'information-line',
    background: theme.surface.infoSubtle,
    border: theme.border.info,
    color: theme.text.info,
  },
};

/**
 * Renders the singleton toast: a centred card that fades in and out. Tap to
 * dismiss; otherwise the store timer takes it away.
 */
export function ToastHost() {
  const toast = useToastState();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const show = !!toast;
    Animated.parallel([
      Animated.timing(opacity, { toValue: show ? 1 : 0, duration: 160, useNativeDriver: true }),
      Animated.timing(scale, { toValue: show ? 1 : 0.96, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [toast?.id, opacity, scale]);

  if (!toast) return null;
  const v = VARIANTS[toast.type];

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Pressable
          onPress={dismissToast}
          style={[styles.toast, { backgroundColor: v.background, borderColor: v.border }]}
        >
          <RemixIcon name={v.icon as any} size={48} color={v.color} />
          <Text style={[styles.message, { color: v.color }]}>{toast.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 12,
  },
  toast: {
    width: 276,
    maxWidth: 300,
    padding: theme.spacing.xxl, // 24
    borderRadius: theme.radius.m, // 10
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.l, // 16
    // Not in the frame, but a centred overlay needs lift off the page content
    shadowColor: palette.neutral.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  message: {
    ...theme.typography.body, // Inter Regular 16/20
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
