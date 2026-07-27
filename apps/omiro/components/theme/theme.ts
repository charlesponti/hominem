import { useThemeColors } from '@ponti-studios/ui/native';

import {
  colorThemes,
  radii,
  spacing as tokenSpacing,
  type ColorTheme,
} from '~/components/theme/tokens';

import { fontFamiliesNative, fontSizes, fontWeights, lineHeights } from './typography';

export const themeSpacing = {
  sm: tokenSpacing[2],
  md: tokenSpacing[3],
  lg: tokenSpacing[4],
  xl: tokenSpacing[6],
} as const;

const borderRadii = {
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  icon: radii.md,
} as const;

export const componentSizes = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 44,
  icon: 20,
} as const;

export const typography = {
  families: fontFamiliesNative,
  sizes: fontSizes,
  weights: fontWeights,
  lineHeights,
} as const;

export const createTheme = (colors: ColorTheme) =>
  ({
    colors,
    spacing: themeSpacing,
    borderRadii,
    componentSizes,
    typography,
  }) as const;

export type Theme = ReturnType<typeof createTheme>;

export const theme = createTheme(colorThemes.dark);

export { useThemeColors };

export function useTheme() {
  return createTheme(useThemeColors());
}
