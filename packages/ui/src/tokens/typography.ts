/**
 * Typography tokens.
 *
 * Font size and weight values must match --font-* in globals.css.
 *
 * Font families diverge intentionally between platforms:
 * - Web loads Geist via Google Fonts (COMMON_FONT_LINKS)
 * - Mobile loads Inter via expo-font
 * Both platforms share Geist Mono for monospace.
 */

/** Web font family stacks (full CSS strings). */
export const fontFamilies = {
  primary: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', 'Menlo', monospace",
} as const

/** React Native font family names (short names only, as loaded by expo-font). */
export const fontFamiliesNative = {
  primary: 'Inter',
  mono: 'Geist Mono',
} as const

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  display: 28,
} as const

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const

export const letterSpacing = {
  tight: -0.05,
  normal: 0,
  relaxed: 0.01,
} as const

export type FontSizeToken = keyof typeof fontSizes
export type FontWeightToken = keyof typeof fontWeights
