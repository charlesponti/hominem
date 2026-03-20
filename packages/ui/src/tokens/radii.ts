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
  sm: 8,
  md: 8,
  lg: 8,
  xl: 8,
  full: '9999px',
  /** Squircular icon shape. Web only — use radiiNative.icon on RN. */
  icon: '22%',
} as const;

/** React Native-safe radii (no percentage strings). */
export const radiiNative = {
  sm: 8,
  md: 8,
  lg: 8,
  xl: 8,
  full: 9999,
  /** Numeric approximation of the squircular icon shape. */
  icon: 20,
} as const;

export type RadiusToken = keyof typeof radii;
