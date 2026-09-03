import { createBox, createText, useTheme } from '@shopify/restyle';
import { useMemo } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type ColorValue,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { darkTheme, fontFamilies, lightTheme, type Theme, type TypographyVariant } from './theme';

export type { Theme, TypographyVariant };
export { fontFamilies, lightTheme, darkTheme };

export type ColorMode = 'light' | 'dark';

export function useColorMode(): ColorMode {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useAppTheme(): Theme {
  return useTheme<Theme>();
}

export const Box = createBox<Theme>();
export const Text = createText<Theme>();

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

// Hook version of the old static `makeStyles`: builds a `StyleSheet` from
// the live restyle theme, memoized per theme instance so it only recomputes
// when the color scheme changes, not on every render.
export function useStyles<T extends NamedStyles>(factory: (theme: Theme) => T): T {
  const theme = useAppTheme();
  // biome-ignore lint: StyleSheet.create's return type is intentionally opaque
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]) as T;
}

export function withAlpha(color: ColorValue, alpha: number): string {
  if (typeof color !== 'string') {
    return String(color);
  }
  return `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

export { hairline } from './shadows';

export const transitionDurations = {
  100: 100,
  150: 150,
  350: 350,
} as const;
