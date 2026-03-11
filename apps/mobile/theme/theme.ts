import { createTheme, useTheme as useRestyleTheme } from '@shopify/restyle'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle
}

const PRIMARY_FONT = 'Inter'
const MONO_FONT = 'Geist Mono'

/* ====== UNIFIED DESIGN SYSTEM TOKENS ====== */
/* Colors, typography, and spacing aligned with web design system */

const theme = createTheme({
  colors: {
    /* Background colors - off-black palette with opacity-based elevation */
    background: '#0F1113',           /* App background - deepest */
    muted: 'rgba(255, 255, 255, 0.05)',
    'bg-base': '#0F1113',
    'bg-surface': '#14171A',
    'bg-elevated': '#1A1E22',
    
    /* Text colors - off-white foreground reduces eye fatigue */
    foreground: '#E7EAEE',           /* Main text - 88% brightness */
    'text-primary': '#E7EAEE',
    'text-secondary': '#B3BAC2',     /* Subtext - 70% brightness */
    'text-tertiary': '#7A828A',      /* Metadata - 48% brightness */
    'text-disabled': '#545B62',      /* Disabled - 33% brightness */
    secondaryForeground: '#B3BAC2',
    mutedForeground: '#7A828A',
    
    /* Primary (backward compatibility) */
    primary: '#E7EAEE',
    'fg-primary': '#E7EAEE',
    
    /* Borders & lines - opacity-based for subtle separation */
    border: 'rgba(255, 255, 255, 0.08)',
    'border-default': 'rgba(255, 255, 255, 0.08)',
    'border-subtle': 'rgba(255, 255, 255, 0.04)',
    'border-focus': 'rgba(255, 255, 255, 0.16)',
    
    /* Icons */
    'icon-primary': '#F5F7FA',
    'icon-muted': '#AEB5BD',
    
    /* Semantic status colors */
    success: '#34C759',
    warning: '#FF9500',
    destructive: '#FF3B30',
    red: '#FF3B30',
    redLight: '#FF6B6B',
    
    /* Accent - unified color */
    accent: '#7BD3F7',
    
    /* Emphasis scale utilities - opacity layers for subtle differentiation */
    'emphasis-highest': 'rgba(255, 255, 255, 0.9)',
    'emphasis-high': 'rgba(255, 255, 255, 0.7)',
    'emphasis-medium': 'rgba(255, 255, 255, 0.5)',
    'emphasis-low': 'rgba(255, 255, 255, 0.3)',
    'emphasis-lower': 'rgba(255, 255, 255, 0.2)',
    'emphasis-subtle': 'rgba(255, 255, 255, 0.15)',
    
    /* Glass morphism */
    'glass-background': 'rgba(255, 255, 255, 0.04)',
    
    /* Legacy color aliases (for migration) */
    black: '#0F1113',
    white: '#FFFFFF',
    backgroundColor: '#0F1113',
    darkBg: '#0F1113',
    darkSurface: '#14171A',
    darkCard: '#14171A',
    glow: 'rgba(255, 255, 255, 0.1)',
    
    /* Emphasis aliases */
    blue: 'rgba(255, 255, 255, 0.05)',
    blueLight: 'rgba(255, 255, 255, 0.05)',
    blueDark: 'rgba(255, 255, 255, 0.4)',
    brown: 'rgba(255, 255, 255, 0.4)',
    darkGray: 'rgba(255, 255, 255, 0.7)',
    gray: 'rgba(255, 255, 255, 0.4)',
    grayMedium: 'rgba(255, 255, 255, 0.1)',
    grayDark: 'rgba(255, 255, 255, 0.7)',
    grayLight: 'rgba(255, 255, 255, 0.05)',
    green: '#34C759',
    greenLight: '#50E991',
    lime: '#FFFFFF',
    orange: '#FF9500',
    pink: 'rgba(255, 255, 255, 0.7)',
    purple: 'rgba(255, 255, 255, 0.7)',
    sky: 'rgba(255, 255, 255, 0.7)',
    tomato: '#FF3B30',
    yellow: '#FFD60A',
    quaternary: 'rgba(255, 255, 255, 0.4)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.05)',
  },
  
  /* Spacing - 8px primary grid + 4px secondary grid */
  spacing: {
    'xs_4': 4,        /* 4px */
    's_8': 8,         /* 8px primary grid */
    'sm_12': 12,      /* 12px */
    'm_16': 16,       /* 16px (2x grid) */
    'ml_24': 24,      /* 24px (3x grid) */
    'l_32': 32,       /* 32px (4x grid) */
    'xl_48': 48,      /* 48px (6x grid) */
    'xl_64': 64,      /* 64px (8x grid) */
  },
  
  /* Border radius - soft rounded corners */
  borderRadii: {
    's_3': 3,         /* Legacy */
    'sm_6': 6,        /* Small */
    'm_6': 6,
    'md_10': 10,      /* Medium */
    'l_12': 12,       /* Large */
    'lg_14': 14,
    'xl_20': 20,      /* Extra large */
    'xl_24': 24,      /* Legacy */
  },
  
  /* Typography - Apple HIG aligned scales */
  textVariants: {
    /* Display scales */
    'extra_large': {
      fontFamily: PRIMARY_FONT,
      fontSize: 64,
      fontWeight: '700',
      lineHeight: 76,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    
    /* Heading scales */
    'header': {
      fontFamily: PRIMARY_FONT,
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 43,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    'large': {
      fontFamily: PRIMARY_FONT,
      fontSize: 32,
      fontWeight: '600',
      lineHeight: 38,
      letterSpacing: -0.05,
      color: 'foreground',
    },
    'cardHeader': {
      fontFamily: PRIMARY_FONT,
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
      letterSpacing: -0.04,
      color: 'foreground',
    },
    
    /* Body styles - minimum 17px per design system */
    'bodyLarge': {
      fontFamily: PRIMARY_FONT,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 28,
      letterSpacing: 0,
      color: 'foreground',
    },
    'body': {
      fontFamily: PRIMARY_FONT,
      fontSize: 17,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'secondaryForeground',
    },
    'text-md': {
      fontFamily: PRIMARY_FONT,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'secondaryForeground',
    },
    
    /* Subheading scales */
    'title': {
      fontFamily: PRIMARY_FONT,
      fontSize: 18,
      fontWeight: '500',
      lineHeight: 24,
      letterSpacing: 0,
      color: 'foreground',
    },
    
    /* Caption/small text */
    'caption': {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.01,
      color: 'mutedForeground',
      fontFamily: PRIMARY_FONT,
    },
    'label': {
      fontFamily: PRIMARY_FONT,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0,
      color: 'mutedForeground',
    },
    'small': {
      fontFamily: PRIMARY_FONT,
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
      color: 'mutedForeground',
    },
    
    /* Monospace (code) */
    'mono': {
      fontFamily: MONO_FONT,
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
      color: 'secondaryForeground',
    },
    
    /* Default text variant */
    'defaults': {
      fontFamily: PRIMARY_FONT,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: 'secondaryForeground',
    },
    
    /* Shadow variant (for elevation effect) */
    'shadow': {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
  },
})

/* ====== ELEVATION SHADOWS ====== */
const Shadows = {
  low: {
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  medium: {
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  high: {
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 60,
  },
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
export { Shadows }
export default theme
