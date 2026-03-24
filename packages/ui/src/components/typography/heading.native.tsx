import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { colors, fontFamiliesNative, fontSizes, fontWeights } from '../../tokens';
import type { ColorToken } from '../../tokens';
import type { HeadingLevel, HeadingVariant } from './heading.types';

const variantStyles: Record<HeadingVariant, TextStyle> = {
  'display-1': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 48,
    fontWeight: fontWeights.bold,
    lineHeight: 58,
  },
  'display-2': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 36,
    fontWeight: fontWeights.bold,
    lineHeight: 43,
  },
  'heading-1': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 32,
    fontWeight: fontWeights.semibold,
    lineHeight: 38,
  },
  'heading-2': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 24,
    fontWeight: fontWeights.semibold,
    lineHeight: 31,
  },
  'heading-3': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: 28,
  },
  'heading-4': {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: 25,
  },
};

const levelVariantMap: Record<HeadingLevel, HeadingVariant> = {
  1: 'heading-1',
  2: 'heading-2',
  3: 'heading-3',
  4: 'heading-4',
};

interface HeadingProps extends RNTextProps {
  color?: ColorToken | undefined;
  level?: HeadingLevel | undefined;
  style?: StyleProp<TextStyle>;
  variant?: HeadingVariant | undefined;
}

function Heading({ color = 'text-primary', level = 2, style, variant, ...props }: HeadingProps) {
  const resolvedVariant = variant ?? levelVariantMap[level];

  return (
    <RNText
      accessibilityRole="header"
      style={[variantStyles[resolvedVariant], { color: colors[color] }, style]}
      {...props}
    />
  );
}

export { Heading };
export type { HeadingProps };
