import { useThemeColors } from '@ponti-studios/ui/native';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { type ColorToken } from '~/components/theme/tokens';

export const fontFamiliesNative = {
  primary: 'System',
  mono: 'Menlo',
} as const;

export const fontSizes = {
  micro: 10,
  caption2: 11,
  caption1: 12,
  footnote: 13,
  xs: 12,
  sm: 14,
  subhead: 15,
  md: 16,
  body: 17,
  lg: 18,
  xl: 20,
  headline: 17,
  title2: 22,
  title1: 28,
  display: 28,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeights = {
  tight: 14,
  caption: 16,
  footnote: 18,
  bodySm: 20,
  readable: 21,
  body: 22,
  bodyLg: 24,
  title2: 28,
  title1: 34,
  display: 44,
} as const;

export type AppleTextVariant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption1'
  | 'caption2'
  | 'mono';

/**
 * Editorial variants — for screen-level hierarchy.
 *
 * `display`  — dominant headline; large, tight tracking, bold. Use for screen
 *              titles and primary editorial statements.
 * `overline` — supporting label rendered uppercase with wide tracking. Use for
 *              section descriptors, bylines, and contextual captions.
 */
export type EditorialTextVariant = 'display' | 'overline';

export type TextVariant = AppleTextVariant | EditorialTextVariant;

interface TextProps extends RNTextProps {
  color?: ColorToken | undefined;
  muted?: boolean | undefined;
  style?: StyleProp<TextStyle>;
  variant?: TextVariant | undefined;
}

const variantStyles = {
  largeTitle: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 34,
    fontWeight: fontWeights.bold,
    lineHeight: 41,
    letterSpacing: -0.6,
  },
  title1: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 28,
    fontWeight: fontWeights.bold,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  title2: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 22,
    fontWeight: fontWeights.semibold,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.headline,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.body,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.bodyLg,
    letterSpacing: 0,
  },
  callout: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    letterSpacing: -0.1,
  },
  subhead: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.subhead,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.bodySm,
    letterSpacing: 0,
  },
  footnote: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.footnote,
    letterSpacing: 0,
  },
  caption1: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.caption1,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.caption,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.caption2,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: 0.2,
  },
  mono: {
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.caption1,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.caption,
    letterSpacing: 0,
  },
  display: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: -1.2,
    lineHeight: lineHeights.display,
  },
  overline: {
    fontFamily: fontFamiliesNative.primary,
    fontSize: 11,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.8,
    lineHeight: lineHeights.caption,
    textTransform: 'uppercase' as const,
  },
} satisfies Record<string, TextStyle>;

function Text({ color, muted = false, style, variant = 'body', ...props }: TextProps) {
  const colors = useThemeColors();
  const resolvedColor = color ? colors[color] : muted ? colors['tertiary'] : colors['text-primary'];

  return <RNText style={[variantStyles[variant], { color: resolvedColor }, style]} {...props} />;
}

export { Text };
export type { TextProps };
