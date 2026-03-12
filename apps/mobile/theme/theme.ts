import {
  colors as tokenColors,
  fontFamiliesNative,
  radiiNative,
  shadowsNative,
  spacing as tokenSpacing,
} from '@hominem/ui/tokens';
import { createTheme, useTheme as useRestyleTheme } from '@shopify/restyle';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

const PRIMARY_FONT = fontFamiliesNative.primary;
const MONO_FONT = fontFamiliesNative.mono;

const theme = createTheme({
  colors: {
    // ── Canonical design system tokens ───────────────────────────────────
    ...tokenColors,
  },

  // Spacing — named keys for Restyle, values from canonical tokens
  spacing: {
    xs_4: tokenSpacing[1],
    sm_8: tokenSpacing[2],
    sm_12: tokenSpacing[3],
    m_16: tokenSpacing[4],
    ml_24: tokenSpacing[5],
    l_32: tokenSpacing[6],
    xl_48: tokenSpacing[7],
    xl_64: tokenSpacing[8],
  },

  // Border radii — named keys for Restyle, values from canonical tokens
  borderRadii: {
    s_3: 3,
    sm_6: radiiNative.sm,
    m_6: radiiNative.sm,
    md_10: radiiNative.md,
    l_12: 12,
    lg_14: radiiNative.lg,
    xl_20: radiiNative.xl,
    xl_24: 24,
  },

  // Typography — Apple HIG aligned scales
  textVariants: {
    extra_large: {
      fontFamily: PRIMARY_FONT,
      fontSize: 64,
      fontWeight: '700',
      lineHeight: 76,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    header: {
      fontFamily: PRIMARY_FONT,
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 43,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    large: {
      fontFamily: PRIMARY_FONT,
      fontSize: 32,
      fontWeight: '600',
      lineHeight: 38,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    cardHeader: {
      fontFamily: PRIMARY_FONT,
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
      letterSpacing: -0.04,
      color: 'foreground',
    },
    bodyLarge: {
      fontFamily: PRIMARY_FONT,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 28,
      letterSpacing: 0,
      color: 'foreground',
    },
    body: {
      fontFamily: PRIMARY_FONT,
      fontSize: 17,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'text-secondary',
    },
    'text-md': {
      fontFamily: PRIMARY_FONT,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'text-secondary',
    },
    title: {
      fontFamily: PRIMARY_FONT,
      fontSize: 18,
      fontWeight: '500',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'foreground',
    },
    caption: {
      fontFamily: PRIMARY_FONT,
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.01,
      color: 'text-tertiary',
    },
    label: {
      fontFamily: PRIMARY_FONT,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0,
      color: 'text-tertiary',
    },
    small: {
      fontFamily: PRIMARY_FONT,
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
      color: 'text-tertiary',
    },
    mono: {
      fontFamily: MONO_FONT,
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
      color: 'text-secondary',
    },
    defaults: {
      fontFamily: PRIMARY_FONT,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: 'text-secondary',
    },
    shadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
  },
});

const Shadows = {
  low: { ...shadowsNative.low, shadowColor: theme.colors.black },
  medium: { ...shadowsNative.medium, shadowColor: theme.colors.black },
  high: { ...shadowsNative.high, shadowColor: theme.colors.black },
  dark: {
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
};

export const useTheme = () => {
  return useRestyleTheme<Theme>();
};

export const makeStyles = <T extends NamedStyles<T> | NamedStyles<unknown>>(
  styles: (theme: Theme) => T,
) => {
  return () => {
    return styles(theme);
  };
};

export type Theme = typeof theme;
export { Shadows };
export default theme;
