/**
 * Shadow tokens.
 *
 * `shadowsWeb` values must match --shadow-* in globals.css.
 * `shadowsNative` are React Native shadow object equivalents.
 */

export const shadowsWeb = {
  low: '0 2px 8px rgba(0, 0, 0, 0.35)',
  medium: '0 8px 24px rgba(0, 0, 0, 0.45)',
  high: '0 20px 60px rgba(0, 0, 0, 0.55)',
} as const

/** React Native shadow objects. Pass these into StyleSheet styles. */
export const shadowsNative = {
  low: {
    shadowColor: '#0f1113',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  medium: {
    shadowColor: '#0f1113',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  high: {
    shadowColor: '#0f1113',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 60,
  },
} as const
