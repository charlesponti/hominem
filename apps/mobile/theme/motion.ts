import { Easing } from 'react-native-reanimated'

export const VOID_MOTION_DURATION_FAST = 80
export const VOID_MOTION_DURATION_STANDARD = 120

export const VOID_MOTION_EASING = Easing.out(Easing.quad)

export const VOID_MOTION_OPACITY_SCALE_ENTER = {
  from: { opacity: 0, transform: [{ scale: 0.98 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
}
