import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { dismissToast, useToastState, type ToastType } from './toast';

const VARIANTS = {
  success: { icon: 'check-line',           background: '#16a34a' }, // green-600
  error:   { icon: 'error-warning-line',   background: '#dc2626' }, // red-600
  warning: { icon: 'alert-line',           background: '#d97706' }, // amber-600
  info:    { icon: 'information-line',     background: '#2563eb' }, // blue-600
} as const;

/**
 * Renders the singleton toast. Animates a slide+fade in/out whenever the store
 * value changes. Tap to dismiss; otherwise it auto-dismisses on the store timer.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toast  = useToastState();
  const opacity     = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0,   duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -24, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [toast?.id, opacity, translateY]);

  if (!toast) return null;
  const v = VARIANTS[toast.type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable onPress={dismissToast} style={[styles.toast, { backgroundColor: v.background }]}>
        <RemixIcon name={v.icon} size={18} color="#fff" />
        <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  message: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
