import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fontSizes, makeStyles, radii, themeSpacing, useThemeColors } from '~/components/theme';

/**
 * The Input primitive (Primitives §2 of the design constitution): a bordered
 * box, always — the one visual signal that a region of the screen accepts
 * typing. Focus and error states swap the border color; nothing else about
 * the shape changes.
 */
interface InputProps extends TextInputProps {
  error?: boolean;
}

const useStyles = makeStyles(() => ({
  input: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSizes.md,
    minHeight: 44,
    paddingHorizontal: themeSpacing.lg,
    paddingVertical: themeSpacing.md,
  },
}));

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { style, error = false, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const styles = useStyles();
  const themeColors = useThemeColors();

  const borderColor = error
    ? themeColors.destructive
    : focused
      ? themeColors.primary
      : themeColors['border-default'];

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={themeColors['tertiary']}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[styles.input, { borderColor, color: themeColors['text-primary'] }, style]}
      {...props}
    />
  );
});
