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

import { makeStyles, useThemeColor } from '~/components/theme';

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
    useThemeColor([
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

  const variantStyles = useMemo<
    Record<ButtonVariant, { backgroundColor?: string; borderWidth?: number; borderColor?: string }>
  >(
    () => ({
      primary: { backgroundColor: colorTokens.primary },
      secondary: { backgroundColor: colorTokens.muted },
      destructive: { backgroundColor: colorTokens.destructive },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colorTokens.border,
      },
      ghost: { backgroundColor: 'transparent' },
    }),
    [colorTokens],
  );

  const textColor = useMemo<Record<ButtonVariant, string>>(
    () => ({
      primary: colorTokens['primary-foreground'],
      secondary: colorTokens.foreground,
      destructive: colorTokens['primary-foreground'],
      outline: colorTokens.foreground,
      ghost: colorTokens.foreground,
    }),
    [colorTokens],
  );

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
      style={({ pressed }) => [
        styles.button,
        size === 'sm' ? styles.smallButton : styles.mediumButton,
        ...pressableStyle({ pressed }),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text style={[size === 'sm' ? styles.smallText : styles.mediumText, resolvedTextStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = makeStyles((theme) => ({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: theme.radius.md,
  },
  smallButton: { paddingVertical: 8, paddingHorizontal: 16, height: 36 },
  mediumButton: { paddingVertical: 12, paddingHorizontal: 16, height: 44 },
  smallText: { ...theme.typography.footnote, fontWeight: '600' },
  mediumText: { ...theme.typography.body, fontWeight: '600', lineHeight: 20 },
}));
