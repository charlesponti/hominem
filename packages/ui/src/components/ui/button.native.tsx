import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fontFamiliesNative, fontSizes, fontWeights, spacing } from '../../tokens';
import type { ButtonBaseProps, ButtonSize, ButtonVariant } from './button.types';

const sizeStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  default: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  lg: {
    minHeight: 48,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  xs: {
    minHeight: 28,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  icon: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 44,
  },
  'icon-xs': {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 28,
  },
  'icon-sm': {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 36,
  },
  'icon-lg': {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 48,
  },
});

const variantStyles = StyleSheet.create<Record<ButtonVariant, ViewStyle>>({
  default: {
    backgroundColor: colors.secondary,
    borderColor: colors['border-default'],
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  destructive: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 1,
  },
  link: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  outline: {
    backgroundColor: colors.background,
    borderColor: colors['border-default'],
    borderWidth: 1,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderColor: colors['border-default'],
    borderWidth: 1,
  },
});

const labelStyles = StyleSheet.create<Record<ButtonVariant, TextStyle>>({
  default: {
    color: colors['text-primary'],
  },
  primary: {
    color: colors['primary-foreground'],
  },
  destructive: {
    color: colors['destructive-foreground'],
  },
  ghost: {
    color: colors['text-primary'],
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  outline: {
    color: colors['text-primary'],
  },
  secondary: {
    color: colors['text-primary'],
  },
});

const baseStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 10,
    columnGap: spacing[2],
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: Math.round(fontSizes.sm * 1.4),
  },
  loader: {
    marginLeft: spacing[1],
  },
});

type NativeButtonProps = PressableProps &
  ButtonBaseProps & {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
  };

function Button({
  children,
  disabled,
  isLoading = false,
  size = 'md',
  style,
  textStyle,
  title,
  variant = 'default',
  ...props
}: NativeButtonProps) {
  const content = children ?? title;
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        baseStyles.button,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !isDisabled ? { opacity: 0.85 } : null,
        isDisabled ? baseStyles.disabled : null,
        style,
      ]}
      {...props}
    >
      {typeof content === 'string' || typeof content === 'number' ? (
        <Text style={[baseStyles.label, labelStyles[variant], textStyle]}>{content}</Text>
      ) : (
        content
      )}
      {isLoading ? (
        <ActivityIndicator
          color={labelStyles[variant].color}
          size="small"
          style={baseStyles.loader}
        />
      ) : null}
    </Pressable>
  );
}

export { Button };
export type { NativeButtonProps as ButtonProps };
