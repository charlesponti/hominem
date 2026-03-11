import { Easing } from 'react-native-reanimated'
import { durations, translateDistances } from '@hominem/ui/tokens'

// Re-export canonical durations under the existing names so call sites need
// no changes. Numeric values are guaranteed to match the web animation system.
export const VOID_MOTION_ENTER = durations.enter
export const VOID_MOTION_EXIT = durations.exit
export const VOID_MOTION_DURATION_STANDARD = durations.standard

// CSS easing is web-only (see packages/ui/src/tokens/motion.ts easingWeb).
// Mobile easing uses react-native-reanimated Easing functions kept here.
export const VOID_EASING_ENTER = Easing.out(Easing.cubic)   // decelerate
export const VOID_EASING_EXIT = Easing.in(Easing.cubic)     // accelerate
export const VOID_EASING_STANDARD = Easing.inOut(Easing.ease)

export const VOID_ENTER_TRANSLATE_Y = translateDistances.enterY
export const VOID_EXIT_TRANSLATE_Y = translateDistances.exitY
