import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { theme } from '@/shared/theme';

/**
 * DS Input — Figma `Design System · 02 Atoms · Input` (34:18).
 *
 * Shared: 353 wide (i.e. full width inside 20px page padding), radius/s-6,
 * px 16, 1px border, Body text (Inter Regular 16/20).
 *
 *   SingleLine  h 48, vertically centred
 *   MultiLine   minHeight 88, py 12
 *
 * Border colour is state-driven and easy to get wrong — note that a filled
 * field is `border/strong`, not `border/default`:
 *
 *   Default (empty)  border/default #ededed
 *   Focused          border/brand   #23ab65
 *   withContent      border/strong  #d4d4d4
 *   Disabled         border/disabled #a3a3a3 on surface/disabled
 */
type Props = TextInputProps & { multiline?: boolean };

export const Input = forwardRef<TextInput, Props>(function Input(
  { multiline, style, onFocus, onBlur, editable = true, value, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasContent = !!value;

  const stateStyle = !editable
    ? s.disabled
    : focused
      ? s.focused
      : hasContent
        ? s.withContent
        : s.default;

  return (
    <View style={[s.shell, multiline ? s.multiline : s.singleLine, stateStyle]}>
      <TextInput
        ref={ref}
        multiline={multiline}
        editable={editable}
        value={value}
        placeholderTextColor={theme.text.hint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[s.field, multiline && s.fieldMultiline, style]}
        {...rest}
      />
    </View>
  );
});

const s = StyleSheet.create({
  shell: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: theme.radius.s, // 6
    paddingHorizontal: theme.spacing.l, // 16
  },
  singleLine: { height: 48, justifyContent: 'center' },
  multiline: { minHeight: 88, paddingVertical: theme.spacing.m }, // 12

  default: { backgroundColor: theme.surface.card, borderColor: theme.border.default },
  focused: { backgroundColor: theme.surface.card, borderColor: theme.border.brand },
  withContent: { backgroundColor: theme.surface.card, borderColor: theme.border.strong },
  disabled: { backgroundColor: theme.surface.disabled, borderColor: theme.border.disabled },

  field: {
    ...theme.typography.body, // Inter Regular 16/20
    color: theme.text.primary,
    padding: 0,
  },
  fieldMultiline: { textAlignVertical: 'top' },
});
