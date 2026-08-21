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

export type Theme = {
  mode: ColorMode;
  colors: {
    background: ColorValue;
    card: ColorValue;
    cardForeground: ColorValue;
    popover: ColorValue;
    popoverForeground: ColorValue;
    muted: ColorValue;
    foreground: ColorValue;
    mutedForeground: ColorValue;
    tertiary: ColorValue;
    primary: ColorValue;
    secondary: ColorValue;
    secondaryForeground: ColorValue;
    accent: ColorValue;
    accentForeground: ColorValue;
    destructive: ColorValue;
    success: ColorValue;
    warning: ColorValue;
    primaryForeground: ColorValue;
    destructiveForeground: ColorValue;
    destructiveText: ColorValue;
    border: ColorValue;
    input: ColorValue;
    ring: ColorValue;
    overlayScrim: ColorValue;
    chart: readonly [ColorValue, ColorValue, ColorValue, ColorValue, ColorValue];
  };
  typography: Record<string, TextStyle>;
  radius: { sm: number; md: number; lg: number; xl: number };
};

const lightColors = {
  background: '#fcfcfd',
  card: '#f9f9fb',
  cardForeground: '#1c2024',
  popover: '#f0f0f3',
  popoverForeground: '#1c2024',
  muted: '#f9f9fb',
  foreground: '#1c2024',
  mutedForeground: '#60646c',
  tertiary: '#80838d',
  primary: '#3e63dd',
  secondary: '#f9f9fb',
  secondaryForeground: '#1c2024',
  accent: '#3e63dd',
  accentForeground: '#ffffff',
  destructive: '#ce2c31',
  success: '#30a46c',
  warning: '#ffc53d',
  primaryForeground: '#ffffff',
  destructiveForeground: '#ffffff',
  destructiveText: '#c82c31',
  border: '#cdced6',
  input: '#cdced6',
  ring: '#3e63dd',
  overlayScrim: '#000000',
  chart: ['#3e63dd', '#6e56cf', '#12a594', '#f76b15', '#8b8d98'],
} as const;

const darkColors = {
  background: '#111113',
  card: '#18191b',
  cardForeground: '#edeef0',
  popover: '#212225',
  popoverForeground: '#edeef0',
  muted: '#18191b',
  foreground: '#edeef0',
  mutedForeground: '#b0b4ba',
  tertiary: '#777b84',
  primary: '#3e63dd',
  secondary: '#18191b',
  secondaryForeground: '#edeef0',
  accent: '#3e63dd',
  accentForeground: '#ffffff',
  destructive: '#ce2c31',
  success: '#30a46c',
  warning: '#ffc53d',
  primaryForeground: '#ffffff',
  destructiveForeground: '#ffffff',
  destructiveText: '#ff9592',
  border: '#43484e',
  input: '#43484e',
  ring: '#3e63dd',
  overlayScrim: '#000000',
  chart: ['#3e63dd', '#6e56cf', '#12a594', '#f76b15', '#696e77'],
} as const;

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

export const theme = {
  light: {
    mode: 'light',
    colors: lightColors,
    typography,
    radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  },
  dark: { mode: 'dark', colors: darkColors, typography, radius: { sm: 6, md: 8, lg: 12, xl: 16 } },
} satisfies Record<ColorMode, Theme>;

export function useColorMode(): ColorMode {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return theme[useColorMode()];
}

const colorVariableMap = {
  '--color-background': 'background',
  '--color-card': 'card',
  '--color-card-foreground': 'cardForeground',
  '--color-popover': 'popover',
  '--color-popover-foreground': 'popoverForeground',
  '--color-muted': 'muted',
  '--color-foreground': 'foreground',
  '--color-muted-foreground': 'mutedForeground',
  '--color-tertiary': 'tertiary',
  '--color-primary': 'primary',
  '--color-secondary': 'secondary',
  '--color-secondary-foreground': 'secondaryForeground',
  '--color-accent': 'accent',
  '--color-accent-foreground': 'accentForeground',
  '--color-destructive': 'destructive',
  '--color-success': 'success',
  '--color-warning': 'warning',
  '--color-primary-foreground': 'primaryForeground',
  '--color-destructive-foreground': 'destructiveForeground',
  '--color-destructive-text': 'destructiveText',
  '--color-border': 'border',
  '--color-input': 'input',
  '--color-ring': 'ring',
  '--color-chart-1': 'chart.0',
  '--color-chart-2': 'chart.1',
  '--color-chart-3': 'chart.2',
  '--color-chart-4': 'chart.3',
  '--color-chart-5': 'chart.4',
  '--color-overlay-scrim': 'overlayScrim',
} as const;

function resolveColorVariable(currentTheme: Theme, name: string): string {
  const key = colorVariableMap[name as keyof typeof colorVariableMap];
  if (!key) {
    return currentTheme.colors.foreground as string;
  }

  if (key.startsWith('chart.')) {
    return currentTheme.colors.chart[Number(key.slice(6))] as string;
  }

  return currentTheme.colors[key as keyof Omit<Theme['colors'], 'chart'>] as string;
}

export function useThemeColor(name: string): string;
export function useThemeColor(names: readonly string[]): string[];
export function useThemeColor(input: string | readonly string[]): string | string[] {
  const currentTheme = useTheme();
  return typeof input === 'string'
    ? resolveColorVariable(currentTheme, input)
    : input.map((name) => resolveColorVariable(currentTheme, name));
}

export function withAlpha(color: ColorValue, alpha: number): string {
  if (typeof color !== 'string') return String(color);
  return `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends NamedStyles>(factory: (theme: Theme) => T) {
  return StyleSheet.create(factory(nativeTheme)) as T;
}

const nativeTheme = {
  mode: 'light',
  colors: Object.fromEntries(
    Object.keys(lightColors).map((key) => [
      key,
      Array.isArray(lightColors[key as keyof typeof lightColors])
        ? (lightColors[key as keyof typeof lightColors] as readonly string[]).map((light, index) =>
            dynamicColor(
              light,
              (darkColors[key as keyof typeof darkColors] as readonly string[])[index],
            ),
          )
        : dynamicColor(
            lightColors[key as keyof typeof lightColors] as string,
            darkColors[key as keyof typeof darkColors] as string,
          ),
    ]),
  ) as unknown as Theme['colors'],
  typography,
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
} satisfies Theme;

function dynamicColor(light: string, dark: string): ColorValue {
  return typeof DynamicColorIOS === 'function' ? DynamicColorIOS({ light, dark }) : light;
}

export { nativeShadows } from './shadows';

export const transitionDurations = {
  100: 100,
  150: 150,
  350: 350,
} as const;
