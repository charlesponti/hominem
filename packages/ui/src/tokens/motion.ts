/**
 * Motion tokens — durations and translate distances.
 *
 * Durations are in milliseconds. Must match animations.css and
 * apps/mobile/theme/motion.ts (which imports from here).
 *
 * CSS easing strings are web-only. Mobile uses react-native-reanimated
 * Easing.* functions which cannot be expressed as strings — the mobile
 * motion.ts keeps those local and imports only the numeric constants here.
 */

export const durations = {
  /** Element arrives and settles (decelerate). */
  enter: 150,
  /** Element leaves without lingering (accelerate). */
  exit: 120,
  /** Content animations: loading states, thinking indicators. */
  standard: 120,
  /** Loop / breezy animations. */
  breezy: 1800,
  spin: 1200,
} as const

export const translateDistances = {
  /** Enter lift (px). */
  enterY: 6,
  /** Exit settle (px). */
  exitY: 4,
  enterX: 6,
  exitX: 4,
} as const

/** CSS cubic-bezier strings — web only. */
export const easingWeb = {
  enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const
