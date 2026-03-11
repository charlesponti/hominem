/**
 * Border radius tokens.
 *
 * Must match --radius-* in packages/ui/src/styles/globals.css.
 *
 * `radii` includes the squircular icon radius as a CSS percentage string —
 * valid on web only. Use `radiiNative` on React Native (percentage strings
 * are not supported by the RN layout engine).
 */

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  /** Squircular icon shape. Web only — use radiiNative.icon on RN. */
  icon: '22%',
} as const

/** React Native-safe radii (no percentage strings). */
export const radiiNative = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  /** Numeric approximation of the squircular icon shape. */
  icon: 20,
} as const

export type RadiusToken = keyof typeof radii
