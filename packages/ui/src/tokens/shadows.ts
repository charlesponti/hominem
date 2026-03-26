/**
 * Shadow tokens — Warm Terminal elevation system.
 *
 * Light mode: warm-tinted, extremely subtle shadows.
 * Dark mode: deeper shadows, but borders carry more structural weight.
 *
 * `shadowsWeb` values must match --shadow-* in globals.css.
 * `shadowsNative` are React Native shadow object equivalents.
 */

export const shadowsWeb = {
  low: '0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.02)',
  medium: '0 4px 16px rgba(28, 25, 23, 0.06), 0 2px 4px rgba(28, 25, 23, 0.03)',
  high: '0 12px 40px rgba(28, 25, 23, 0.08), 0 4px 12px rgba(28, 25, 23, 0.04)',
} as const;

export const shadowsWebDark = {
  low: '0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)',
  medium: '0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.15)',
  high: '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)',
} as const;

/** React Native shadow objects. Pass these into StyleSheet styles. */
export const shadowsNative = {
  low: {
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  medium: {
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  high: {
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
  },
} as const;
