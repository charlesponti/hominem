import { createTheme } from '@shopify/restyle';
import type { TextStyle } from 'react-native';

export const fontFamilies = {
  sans: 'Geist',
  mono: 'Geist Mono',
  pixel: 'Geist Pixel Square',
} as const;

const lightColors = {
  background: '#ffffff',
  card: '#ffffff',
  cardForeground: '#09090b',
  popover: '#ffffff',
  popoverForeground: '#09090b',
  muted: '#f4f4f5',
  foreground: '#09090b',
  mutedForeground: '#71717a',
  tertiary: '#71717a',
  primary: '#18181b',
  secondary: '#f4f4f5',
  secondaryForeground: '#18181b',
  accent: '#f4f4f5',
  accentForeground: '#18181b',
  destructive: '#ef4444',
  success: '#059669',
  warning: '#f59e0b',
  primaryForeground: '#fafafa',
  destructiveForeground: '#fafafa',
  border: '#e4e4e7',
  input: '#e4e4e7',
  ring: '#18181b',
  overlayScrim: '#000000',
  chart1: '#e76e50',
  chart2: '#2a9d8f',
  chart3: '#274754',
  chart4: '#e8c468',
  chart5: '#f4a462',
} as const;

const darkColors = {
  background: '#09090b',
  card: '#09090b',
  cardForeground: '#fafafa',
  popover: '#09090b',
  popoverForeground: '#fafafa',
  muted: '#27272a',
  foreground: '#fafafa',
  mutedForeground: '#a1a1aa',
  tertiary: '#a1a1aa',
  primary: '#fafafa',
  secondary: '#27272a',
  secondaryForeground: '#fafafa',
  accent: '#27272a',
  accentForeground: '#fafafa',
  destructive: '#7f1d1d',
  success: '#10b981',
  warning: '#fbbf24',
  primaryForeground: '#18181b',
  destructiveForeground: '#fafafa',
  border: '#27272a',
  input: '#27272a',
  ring: '#d4d4d8',
  overlayScrim: '#000000',
  chart1: '#2662d9',
  chart2: '#2eb88a',
  chart3: '#e88c30',
  chart4: '#af57db',
  chart5: '#e23670',
} as const;

const spacing = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
} as const;

const borderRadii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

const shadows = {
  none: [
    {
      color: 'transparent',
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 0,
      inset: false,
    },
  ],
  sm: [
    { color: '#0000001a', offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, inset: false },
  ],
  md: [
    { color: '#00000024', offsetX: 0, offsetY: 3, blurRadius: 6, spreadDistance: 0, inset: false },
  ],
} as const;

const baseTextVariant: TextStyle = {
  fontFamily: fontFamilies.sans,
  fontSize: 17,
  lineHeight: 24,
  fontWeight: '400',
  letterSpacing: 0,
};

const textVariants = {
  defaults: baseTextVariant,
  display: {
    fontFamily: fontFamilies.sans,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  largeTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  title1: {
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title2: {
    fontFamily: fontFamilies.sans,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  body: baseTextVariant,
  callout: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  subhead: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
  },
  footnote: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption1: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  overline: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0,
  },
} satisfies Record<string, TextStyle>;

export const lightTheme = createTheme({
  colors: lightColors,
  spacing,
  borderRadii,
  textVariants,
  shadows,
});

export const darkTheme = {
  ...lightTheme,
  colors: darkColors,
};

export type Theme = typeof lightTheme;
export type TypographyVariant = keyof typeof textVariants;
