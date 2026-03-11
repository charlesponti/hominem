import { useEffect, type PropsWithChildren } from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { theme } from '~/theme'
import { VOID_EASING_ENTER, VOID_MOTION_ENTER } from '~/theme/motion'

export const FeedbackBlock = ({ error, style, children }: PropsWithChildren<{
  error?: boolean,
  style?: ViewStyle
}>) => {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.98)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
    scale.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
  }, [opacity, scale])

  if (error) {
    return <Animated.View style={[styles.error, { opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>
  }

  return <Animated.View style={[styles.info, { opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  error: {
    gap: 4,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderColor: theme.colors.destructive,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: theme.colors.background,
  },
  info: {
    gap: 4,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
  },
})
