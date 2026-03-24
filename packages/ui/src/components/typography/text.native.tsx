import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { colors, fontFamiliesNative, fontSizes, fontWeights } from '../../tokens';
import type { ColorToken } from '../../tokens';
import type { TextVariant } from './text.types';

interface TextProps extends RNTextProps {
  color?: ColorToken | undefined;
  muted?: boolean | undefined;
  style?: StyleProp<TextStyle>;
  variant?: TextVariant | undefined;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  'body-1': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.lg * 1.6),
  },
  'body-2': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.md * 1.5),
  },
  'body-3': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.sm * 1.5),
  },
  'body-4': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.xs * 1.4),
  },
};

function Text({ color, muted = false, style, variant = 'body-2', ...props }: TextProps) {
  const resolvedColor = color
    ? colors[color]
    : muted
      ? colors['text-tertiary']
      : colors['text-primary'];

  return <RNText style={[variantStyles[variant], { color: resolvedColor }, style]} {...props} />;
}

export { Text };
export type { TextProps };
