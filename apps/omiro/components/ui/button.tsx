import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
  type PressableStateCallbackType,
} from 'react-native';
import { useCSSVariable } from 'uniwind';

/**
 * shadcn's variant taxonomy (default/secondary/destructive/outline/ghost),
 * translated to the design constitution's tokens. `outline` is the one
 * variant with a border — the constitution's documented exception for a
 * control that needs to read as tappable without a solid fill.
 */
type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
  testID?: string;
}

const PRESSED_OPACITY = 0.7;
const LOADING_OPACITY = 0.7;
const DISABLED_OPACITY = 0.5;

const sizeClasses: Record<'sm' | 'md', { container: string; text: string }> = {
  sm: {
    container: 'py-2 px-4 h-9',
    text: 'text-footnote font-semibold',
  },
  md: {
    container: 'py-3 px-4 h-11',
    text: 'text-base font-semibold leading-5',
  },
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  size = 'md',
  style,
  variant = 'primary',
  testID,
}: ButtonProps) {
  const [primary, primaryForeground, muted, destructive, borderDefault, textPrimary] =
    useCSSVariable([
      '--color-primary',
      '--color-primary-foreground',
      '--color-muted',
      '--color-destructive',
      '--color-border',
      '--color-foreground',
    ]) as string[];

  const colorTokens = useMemo(
    () => ({
      primary,
      'primary-foreground': primaryForeground,
      muted,
      destructive,
      border: borderDefault,
      foreground: textPrimary,
    }),
    [primary, primaryForeground, muted, destructive, borderDefault, textPrimary],
  );

  const variantStyles: Record<
    ButtonVariant,
    { backgroundColor?: string; borderWidth?: number; borderColor?: string }
  > = {
    primary: {
      backgroundColor: colorTokens.primary,
    },
    secondary: {
      backgroundColor: colorTokens['muted'],
    },
    destructive: {
      backgroundColor: colorTokens.destructive,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorTokens['border'],
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colorTokens['primary-foreground'],
    secondary: colorTokens['foreground'],
    destructive: colorTokens['primary-foreground'],
    outline: colorTokens['foreground'],
    ghost: colorTokens['foreground'],
  };

  const resolvedContainerStyle = useMemo(
    () => ({
      ...variantStyles[variant],
      ...(disabled ? { opacity: DISABLED_OPACITY } : {}),
    }),
    [variant, variantStyles, disabled],
  );

  const resolvedTextStyle = useMemo(
    () => ({
      color: textColor[variant],
      opacity: disabled ? 0.5 : 1,
    }),
    [variant, textColor, disabled],
  );

  const isInteractionDisabled = disabled || loading;

  const pressableStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [
      resolvedContainerStyle,
      style,
      loading && { opacity: LOADING_OPACITY },
      pressed && !isInteractionDisabled && { opacity: PRESSED_OPACITY },
    ],
    [isInteractionDisabled, loading, resolvedContainerStyle, style],
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInteractionDisabled}
      className={`items-center justify-center self-stretch rounded-md ${sizeClasses[size].container}`}
      style={pressableStyle}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text className={sizeClasses[size].text} style={resolvedTextStyle}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
