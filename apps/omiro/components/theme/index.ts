import { createTheme } from '@shopify/restyle';
import {
  DynamicColorIOS,
  StyleSheet,
  useColorScheme,
  type ColorValue,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type ColorMode = 'light' | 'dark';

export const fontFamilies = {
  sans: 'Geist',
  mono: 'Geist Mono',
  pixel: 'Geist Pixel Square',
} as const;

/**
 * Full shadcn (zinc) color theme, converted from the canonical oklch values
 * to hex (React Native does not parse oklch). `accent` is neutral per shadcn;
 * the extra tokens omiro needs (success/warning/tertiary/destructiveText/
 * overlayScrim) keep the same zinc family.
 */
export const palette = {
  light: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    popover: '#FFFFFF',
    popoverForeground: '#0A0A0A',
    muted: '#F5F5F5',
    foreground: '#0A0A0A',
    mutedForeground: '#737373',
    tertiary: '#A1A1A1',
    primary: '#171717',
    secondary: '#F5F5F5',
    secondaryForeground: '#171717',
    accent: '#F5F5F5',
    accentForeground: '#171717',
    destructive: '#E7000B',
    success: '#10B981',
    warning: '#F59E0B',
    primaryForeground: '#FAFAFA',
    destructiveForeground: '#FAFAFA',
    destructiveText: '#DC2626',
    border: '#E5E5E5',
    input: '#E5E5E5',
    ring: '#A1A1A1',
    overlayScrim: '#000000',
    chart1: '#F54900',
    chart2: '#009689',
    chart3: '#104E64',
    chart4: '#FFB900',
    chart5: '#FE9A00',
  },
  dark: {
    background: '#0A0A0A',
    card: '#171717',
    cardForeground: '#FAFAFA',
    popover: '#262626',
    popoverForeground: '#FAFAFA',
    muted: '#262626',
    foreground: '#FAFAFA',
    mutedForeground: '#A1A1A1',
    tertiary: '#898989',
    primary: '#E5E5E5',
    secondary: '#262626',
    secondaryForeground: '#FAFAFA',
    accent: '#262626',
    accentForeground: '#FAFAFA',
    destructive: '#FF6467',
    success: '#34D399',
    warning: '#FBBF24',
    primaryForeground: '#171717',
    destructiveForeground: '#171717',
    destructiveText: '#F87171',
    border: '#FFFFFF1A',
    input: '#FFFFFF26',
    ring: '#737373',
    overlayScrim: '#000000',
    chart1: '#1447E6',
    chart2: '#00BC7D',
    chart3: '#FE9A00',
    chart4: '#AD46FF',
    chart5: '#FF2056',
  },
} as const;

export type ColorName = keyof typeof palette.light;

const typography = {
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
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
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

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;

// Appearance-aware color values: iOS resolves these natively so static styles
// switch light/dark without re-rendering. Use `palette[useColorMode()]` when a
// hex string is required (color math such as interpolateColor).
const appearanceColors = Object.fromEntries(
  (Object.keys(palette.light) as ColorName[]).map((name) => [
    name,
    DynamicColorIOS({ light: palette.light[name], dark: palette.dark[name] }),
  ]),
) as Record<ColorName, ColorValue>;

const themeObject = {
  colors: appearanceColors,
  spacing: {
    0.5: 2,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    12: 48,
    16: 64,
  },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
  breakpoints: { phone: 0, tablet: 768 },
  textVariants: typography,
  typography,
};

export const theme = createTheme(themeObject as never) as typeof themeObject;

export type Theme = typeof theme;

export function useColorMode(): ColorMode {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useThemeColor(name: string): ColorValue;
export function useThemeColor(names: readonly string[]): ColorValue[];
export function useThemeColor(input: string | readonly string[]): ColorValue | ColorValue[] {
  const colors = palette[useColorMode()];
  const resolve = (name: string) => {
    const token = name
      .replace(/^--color-/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return colors[token as ColorName] ?? colors.foreground;
  };
  return typeof input === 'string' ? resolve(input) : input.map(resolve);
}

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends NamedStyles>(factory: (value: Theme) => T): T {
  return StyleSheet.create(factory(theme)) as T;
}

/** Append an alpha hex to an opaque hexadecimal color. */
export function withAlpha(color: string, alpha: number): string {
  return `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

export const transitionDurations = {
  100: 100,
  150: 150,
  350: 350,
} as const;

export { nativeShadows } from './shadows';
