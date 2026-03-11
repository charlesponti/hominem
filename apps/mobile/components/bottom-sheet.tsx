import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import {
  VOID_EASING_ENTER,
  VOID_EASING_EXIT,
  VOID_ENTER_TRANSLATE_Y,
  VOID_EXIT_TRANSLATE_Y,
  VOID_MOTION_ENTER,
  VOID_MOTION_EXIT,
} from '~/theme/motion'
import { Text, theme } from '~/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const BottomSheet = ({ isOpen, toggleSheet }: { isOpen: boolean; toggleSheet: () => void }) => {
  const [isVisible, setIsVisible] = useState(isOpen)
  const offset = useSharedValue<number>(VOID_ENTER_TRANSLATE_Y)
  const opacity = useSharedValue<number>(0)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      offset.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
      opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER })
    } else {
      offset.value = withTiming(VOID_EXIT_TRANSLATE_Y, { duration: VOID_MOTION_EXIT, easing: VOID_EASING_EXIT })
      opacity.value = withTiming(0, { duration: VOID_MOTION_EXIT, easing: VOID_EASING_EXIT })
      const timer = setTimeout(() => setIsVisible(false), VOID_MOTION_EXIT)
      return () => clearTimeout(timer)
    }
  }, [isOpen, offset, opacity])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }))

  if (!isVisible) return null

  return (
    <View style={styles.root}>
      <AnimatedPressable onPress={toggleSheet} style={[styles.backdrop, { opacity }]} />
      <Animated.View style={[styles.container, containerStyle]}>
        <Text variant="title" color="foreground">
          BOTTOM SHEET
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.black,
    opacity: 0.8,
  },
  container: {
    height: 420,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingTop: 24,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
  },
})
