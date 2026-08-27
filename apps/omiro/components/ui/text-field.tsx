import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { fontFamilies, useAppTheme, useStyles } from '~/components/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface TextFieldProps extends TextInputProps {
  focusBorder?: boolean;
  hasError?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { style, focusBorder = true, hasError = false, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const { colors } = useAppTheme();
  const styles = useStyles((theme) => ({
    input: {
      minHeight: 50,
      paddingHorizontal: 16,
      borderCurve: 'continuous',
      borderRadius: 6,
      fontFamily: fontFamilies.sans,
      fontSize: 18,
      color: theme.colors.foreground,
    } satisfies TextStyle & ViewStyle,
  }));

  const focusStyle = useAnimatedStyle(() => {
    if (!focusBorder) {
      return { borderColor: 'transparent', borderWidth: 0 };
    }

    return {
      borderColor: hasError ? colors.destructive : focused ? colors.ring : colors.border,
      borderWidth: withTiming(focused || hasError ? 1.5 : 1, { duration: 150 }),
    };
  });

  return (
    <AnimatedTextInput
      {...props}
      ref={ref}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      placeholderTextColor={props.placeholderTextColor ?? colors.mutedForeground}
      style={[styles.input, focusStyle, style]}
    />
  );
});
