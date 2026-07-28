import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  type PressableStateCallbackType,
} from 'react-native';

import {
  componentSizes,
  fontSizes,
  fontWeights,
  lineHeights,
  makeStyles,
  radii,
  themeSpacing,
  useThemeColors,
} from '~/components/theme';

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

const COMPACT_HEIGHT = 36;

const useStyles = makeStyles(() => ({
  text: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.bodySm,
  },
  textSm: {
    fontSize: fontSizes.footnote,
    lineHeight: lineHeights.footnote,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  loading: {
    opacity: 0.7,
  },
}));

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
  const themeColors = useThemeColors();
  const styles = useStyles();
  const resolvedStyles = useMemo(() => {
    const baseStyle = {
      // Vertical padding must leave room for the text's line height (not
      // just its font size) or descenders clip against the button edge —
      // sm's shorter box needs tighter padding than md to make room.
      paddingVertical: size === 'sm' ? themeSpacing.sm : themeSpacing.md,
      paddingHorizontal: themeSpacing.lg,
      borderRadius: radii.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      alignSelf: 'stretch' as const,
      height: size === 'sm' ? COMPACT_HEIGHT : componentSizes.xl,
    };

    const variantStyles: Record<ButtonVariant, StyleProp<ViewStyle>> = {
      primary: {
        backgroundColor: themeColors.primary,
      },
      secondary: {
        backgroundColor: themeColors['muted'],
      },
      destructive: {
        backgroundColor: themeColors.destructive,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: themeColors['border-default'],
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    const textColor: Record<ButtonVariant, string> = {
      primary: themeColors['primary-foreground'],
      secondary: themeColors['text-primary'],
      destructive: themeColors['primary-foreground'],
      outline: themeColors['text-primary'],
      ghost: themeColors['text-primary'],
    };

    return {
      container: [baseStyle, variantStyles[variant], disabled && styles.disabled],
      text: textColor[variant],
    };
  }, [disabled, size, variant, themeColors, styles.disabled]);

  const isInteractionDisabled = disabled || loading;

  const pressableStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [
      resolvedStyles.container,
      style,
      loading && styles.loading,
      pressed && !isInteractionDisabled && styles.pressed,
    ],
    [isInteractionDisabled, loading, resolvedStyles.container, style],
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInteractionDisabled}
      style={pressableStyle}
    >
      {loading ? (
        <ActivityIndicator color={resolvedStyles.text} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            size === 'sm' && styles.textSm,
            {
              color: resolvedStyles.text,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
