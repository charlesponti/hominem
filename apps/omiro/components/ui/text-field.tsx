import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fontSizes, makeStyles, radii, themeSpacing, useThemeColors } from '~/components/theme';

const useStyles = makeStyles(() => ({
  field: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSizes.md,
    minHeight: 44,
    paddingHorizontal: themeSpacing.lg,
    paddingVertical: themeSpacing.md,
  },
}));

export const TextField = forwardRef<TextInput, TextInputProps>(function TextField(
  { onBlur, onFocus, style, ...props },
  ref,
) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      ref={ref}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      placeholderTextColor={props.placeholderTextColor ?? themeColors['tertiary']}
      style={[
        styles.field,
        {
          borderColor: focused ? themeColors.primary : themeColors['border-default'],
          color: themeColors['text-primary'],
        },
        style,
      ]}
    />
  );
});
