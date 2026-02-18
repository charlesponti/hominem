import { useEffect, type PropsWithChildren } from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { theme } from '~/theme'

export const FeedbackBlock = ({ error, style, children }: PropsWithChildren<{ 
  error?: boolean,
  style?: ViewStyle
}>) => {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 })
  })

  if (error) {
    return <Animated.View style={[styles.error, { opacity }, style]}>{children}</Animated.View>
  }

  return <Animated.View style={[styles.info, { opacity }, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  error: {
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    borderColor: theme.colors.tomato,
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 8,
  },
  info: {
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    backgroundColor: theme.colors.white,
    color: theme.colors.black,
    borderColor: theme.colors.grayLight,
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 8,
  },
})
