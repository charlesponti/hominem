import React from 'react'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'

export const FadeIn = ({ children }: { children: React.ReactNode }) => {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.98)

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: VOID_MOTION_DURATION_STANDARD })
    scale.value = withTiming(1, { duration: VOID_MOTION_DURATION_STANDARD })
  }, [opacity, scale])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }
  })

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}
