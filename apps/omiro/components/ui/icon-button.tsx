import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import type {
  ColorValue,
  GestureResponderEvent,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { componentSizes, makeStyles, radii, themeSpacing, useThemeColors } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

import AppIcon from './icon';

export type IconButtonVariant = 'ghost' | 'surface' | 'primary';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'onPress' | 'style'> {
  accessibilityLabel: string;
  icon: SFSymbol;
  iconSize?: number;
  variant?: IconButtonVariant;
  circular?: boolean;
  tintColor?: ColorValue;
  disabledOpacity?: number;
  pressedOpacity?: number;
  isAnimating?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  accessibilityLabel,
  accessibilityRole = 'button',
  circular = false,
  disabled = false,
  disabledOpacity = 0.35,
  hitSlop = themeSpacing.sm,
  icon,
  iconSize = 20,
  isAnimating = false,
  onPress,
  pressedOpacity = 0.65,
  style,
  tintColor,
  variant = 'ghost',
  ...rest
}: IconButtonProps) {
  const themeColors = useThemeColors();
  const styles = useStyles();
  const prefersReducedMotion = useReducedMotion();

  const pressScale = useSharedValue(1);
  const pressScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const rotation = useDerivedValue(() => {
    if (!isAnimating || prefersReducedMotion) {
      return withTiming(0, { duration: 120 });
    }

    return withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [isAnimating, prefersReducedMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const resolvedTintColor =
    tintColor ??
    (disabled
      ? themeColors['tertiary']
      : variant === 'primary'
        ? themeColors['background']
        : variant === 'ghost'
          ? themeColors['text-primary']
          : themeColors['text-primary']);

  return (
    <Animated.View style={pressScaleStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        disabled={disabled}
        hitSlop={hitSlop}
        onPress={onPress}
        onPressIn={() => {
          if (!prefersReducedMotion) {
            pressScale.value = withTiming(0.94, { duration: 100 });
          }
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 150 });
        }}
        style={({ pressed }) => [
          styles.button,
          { height: componentSizes.xl, width: componentSizes.xl },
          variant === 'surface' ? styles.surface : null,
          variant === 'primary' ? styles.primary : null,
          circular ? { borderRadius: radii.full } : null,
          style,
          disabled ? { opacity: disabledOpacity } : pressed ? { opacity: pressedOpacity } : null,
        ]}
        {...rest}
      >
        <Animated.View style={iconStyle}>
          <AppIcon name={icon} size={iconSize} tintColor={resolvedTintColor} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: theme.colors['card'],
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
  },
  primary: {
    backgroundColor: theme.colors['text-primary'],
  },
}));
