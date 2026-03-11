import { Easing } from 'react-native-reanimated'

// Component enter: 150ms, decelerate — element arrives and settles.
export const VOID_MOTION_ENTER = 150

// Component exit: 120ms, accelerate — element leaves without lingering.
export const VOID_MOTION_EXIT = 120

// Content animations (thinking indicators, loading states): unchanged.
export const VOID_MOTION_DURATION_STANDARD = 120

// Easing curves aligned with web cubic-bezier values.
export const VOID_EASING_ENTER = Easing.out(Easing.cubic)   // decelerate
export const VOID_EASING_EXIT = Easing.in(Easing.cubic)     // accelerate
export const VOID_EASING_STANDARD = Easing.inOut(Easing.ease)

// Translate distance constants (keep small — motion clarifies, not decorates).
export const VOID_ENTER_TRANSLATE_Y = 6   // px, enter lift
export const VOID_EXIT_TRANSLATE_Y = 4    // px, exit settle
