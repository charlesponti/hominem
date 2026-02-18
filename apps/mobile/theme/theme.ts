import { createTheme, useTheme as useRestyleTheme } from '@shopify/restyle'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle
}

const SANS_SERIF_FONT = 'Plus Jakarta Sans'

const theme = createTheme({
  colors: {
    backgroundColor: '#F9FAFB',
    black: 'rgba(0, 0, 0, 1.00)',
    blue: 'rgba(217, 231, 255, 1.00)',
    blueLight: 'rgba(240, 248, 255, 1.00)',
    blueDark: '#344054',
    brown: '#A52A2A',
    darkGray: '#38434D',
    gray: '#808080',
    grayMedium: '#edeef1',
    grayDark: 'rgba(83, 93, 115, 1.00)',
    grayLight: 'rgba(239, 241, 245, 1.00)',
    green: '#008000',
    greenLight: '#00FF00',
    lime: '#00FF00',
    orange: '#FFA500',
    pink: '#FF00FF',
    primary: 'rgba(40, 49, 67, 1.00)',
    purple: '#6366F1',
    red: 'rgba(255, 99, 132, 1.00)',
    redLight: '#FF4500',
    sky: '#87CEEB',
    tomato: 'rgba(245, 99, 69, 1.00)',
    white: '#fff',
    yellow: 'rgba(255, 206, 84, 1.00)',
    quaternary: '#9097a6',
    secondary: '#344054',
    tertiary: '#F2F4F7',
    'fg-primary': 'rgba(16, 24, 40, 1)',
    // Dark palette additions for input-forward experience
    darkBg: '#0a0c10',
    darkSurface: 'rgba(22,22,24,0.95)',
    darkCard: 'rgba(33,35,40,0.9)',
    glow: 'rgba(120, 121, 255, 0.2)',
    accent: '#7dd0ff',
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
      fontFamily: SANS_SERIF_FONT,
      fontSize: 64,
    },
    header: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 42,
    },
    large: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 32,
    },
    caption: {
      fontSize: 12,
      fontWeight: 500,
      color: 'quaternary',
    },
    cardHeader: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 28,
      fontWeight: 600,
    },
    'text-md': {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 20,
    },
    title: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 20,
    },
    label: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 16,
    },
    body: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 16,
      color: 'quaternary',
    },
    bodyLarge: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 18,
      fontWeight: 'semibold',
    },
    small: {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 12,
    },
    defaults: {
      fontFamily: SANS_SERIF_FONT,
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
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 1,
  },
}

// Motion presets for Reanimated springs
export const Motion = {
  softSpring: { damping: 18, stiffness: 180 },
  snappy: { damping: 14, stiffness: 240 },
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
