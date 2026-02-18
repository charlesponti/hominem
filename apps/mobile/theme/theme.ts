import { createTheme, useTheme as useRestyleTheme } from '@shopify/restyle'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle
}

const MONO_FONT = 'Geist Mono'

const theme = createTheme({
  colors: {
    background: '#000000',
    muted: 'rgba(255, 255, 255, 0.05)',
    foreground: '#FFFFFF',
    secondaryForeground: 'rgba(255, 255, 255, 0.7)',
    mutedForeground: 'rgba(255, 255, 255, 0.4)',
    primary: '#FFFFFF',
    destructive: '#FF0000',
    border: 'rgba(255, 255, 255, 0.1)',
    // Compatibility aliases (mapped to VOID palette while migrating component callsites).
    backgroundColor: '#000000',
    black: '#000000',
    blue: 'rgba(255, 255, 255, 0.05)',
    blueLight: 'rgba(255, 255, 255, 0.05)',
    blueDark: 'rgba(255, 255, 255, 0.4)',
    brown: 'rgba(255, 255, 255, 0.4)',
    darkGray: 'rgba(255, 255, 255, 0.7)',
    gray: 'rgba(255, 255, 255, 0.4)',
    grayMedium: 'rgba(255, 255, 255, 0.1)',
    grayDark: 'rgba(255, 255, 255, 0.7)',
    grayLight: 'rgba(255, 255, 255, 0.05)',
    green: '#FFFFFF',
    greenLight: 'rgba(255, 255, 255, 0.05)',
    lime: '#FFFFFF',
    orange: 'rgba(255, 255, 255, 0.7)',
    pink: 'rgba(255, 255, 255, 0.7)',
    purple: 'rgba(255, 255, 255, 0.7)',
    red: '#FF0000',
    redLight: '#FF0000',
    sky: 'rgba(255, 255, 255, 0.7)',
    tomato: '#FF0000',
    white: '#FFFFFF',
    yellow: 'rgba(255, 255, 255, 0.7)',
    quaternary: 'rgba(255, 255, 255, 0.4)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.05)',
    'fg-primary': '#FFFFFF',
    darkBg: '#000000',
    darkSurface: 'rgba(255, 255, 255, 0.05)',
    darkCard: 'rgba(255, 255, 255, 0.05)',
    glow: 'rgba(255, 255, 255, 0.1)',
    accent: '#FFFFFF',
  },
  spacing: {
    xs_4: 4,
    s_8: 8,
    sm_12: 12,
    m_16: 16,
    ml_24: 24,
    l_32: 32,
    xl_64: 64,
  },
  borderRadii: {
    s_3: 3,
    m_6: 6,
    l_12: 12,
    xl_24: 24,
  },
  textVariants: {
    extra_large: {
      fontFamily: MONO_FONT,
      fontSize: 64,
      color: 'foreground',
    },
    header: {
      fontFamily: MONO_FONT,
      fontSize: 36,
      textTransform: 'uppercase',
      letterSpacing: -0.6,
      color: 'foreground',
    },
    large: {
      fontFamily: MONO_FONT,
      fontSize: 32,
      textTransform: 'uppercase',
      color: 'foreground',
    },
    caption: {
      fontSize: 12,
      fontWeight: 500,
      color: 'mutedForeground',
      fontFamily: MONO_FONT,
    },
    cardHeader: {
      fontFamily: MONO_FONT,
      fontSize: 24,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: -0.4,
      color: 'foreground',
    },
    'text-md': {
      fontFamily: MONO_FONT,
      fontSize: 16,
      color: 'secondaryForeground',
    },
    title: {
      fontFamily: MONO_FONT,
      fontSize: 18,
      textTransform: 'uppercase',
      color: 'foreground',
    },
    label: {
      fontFamily: MONO_FONT,
      fontSize: 14,
      color: 'mutedForeground',
    },
    body: {
      fontFamily: MONO_FONT,
      fontSize: 14,
      lineHeight: 20,
      color: 'secondaryForeground',
    },
    bodyLarge: {
      fontFamily: MONO_FONT,
      fontSize: 16,
      fontWeight: 'semibold',
      color: 'foreground',
    },
    small: {
      fontFamily: MONO_FONT,
      fontSize: 12,
      color: 'mutedForeground',
    },
    defaults: {
      fontFamily: MONO_FONT,
      color: 'secondaryForeground',
    },
    shadow: {
      shadowColor: 'black',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 2,
    },
  },
})

export const Shadows = {
  dark: {
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
}

export const useTheme = () => {
  return useRestyleTheme<Theme>()
}

export const makeStyles = <T extends NamedStyles<T> | NamedStyles<unknown>>(
  styles: (theme: Theme) => T
) => {
  return () => {
    return styles(theme)
  }
}

export type Theme = typeof theme
export default theme
