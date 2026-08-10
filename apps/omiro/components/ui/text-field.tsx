import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface TextFieldProps extends TextInputProps {
  hasError?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { style, hasError = false, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [border, ring, destructive, foreground, mutedForeground] = useCSSVariable([
    '--color-border',
    '--color-ring',
    '--color-destructive',
    '--color-foreground',
    '--color-muted-foreground',
  ]) as string[];

  const borderColor = hasError ? destructive : focused ? ring : border;

  const focusStyle = useAnimatedStyle(
    () => ({
      borderColor,
      borderWidth: withTiming(focused || hasError ? 1.5 : 1, { duration: 150 }),
    }),
    [borderColor, focused, hasError],
  );

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
      placeholderTextColor={props.placeholderTextColor ?? mutedForeground}
      className="rounded-md text-lg"
      style={[
        {
          // minHeight (not height) so real font metrics can exceed the 24pt
          // line-height number without the box clipping descenders.
          minHeight: 50,
          paddingHorizontal: 16,
          borderCurve: 'continuous',
          color: foreground,
        },
        focusStyle,
        style,
      ]}
    />
  );
});
