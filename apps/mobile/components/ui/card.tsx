import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { borderStyle } from '~/theme/styles'

export const Card = ({ children }: { children: React.ReactNode }) => {
  const opacity = useSharedValue(0)

  const opacityStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  useEffect(() => {
    opacity.value = withTiming(1, { duration: VOID_MOTION_DURATION_STANDARD })
  }, [opacity])

  return (
    <Animated.View style={[opacityStyle, borderStyle.border, styles.container]}>
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.muted,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderRadius: 8,
  },
})
