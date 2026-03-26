/**
 * Border radius tokens — tighter, more precise scale.
 *
 * Must match --radius-* in packages/ui/src/styles/globals.css.
 *
 * `radii` includes the squircular icon radius as a CSS percentage string —
 * valid on web only. Use `radiiNative` on React Native (percentage strings
 * are not supported by the RN layout engine).
 */

export const radii = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: '9999px',
  /** Squircular icon shape. Web only — use radiiNative.icon on RN. */
  icon: '22%',
} as const;

/** React Native-safe radii (no percentage strings). */
export const radiiNative = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  /** Numeric approximation of the squircular icon shape. */
  icon: 20,
} as const;

export type RadiusToken = keyof typeof radii;
