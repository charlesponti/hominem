import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { Text, theme } from '~/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const BottomSheet = ({ isOpen, toggleSheet }: { isOpen: boolean; toggleSheet: () => void }) => {
  const offset = useSharedValue(30)
  const opacity = useSharedValue(0)

  useEffect(() => {
    offset.value = withTiming(isOpen ? 0 : 30, { duration: VOID_MOTION_DURATION_STANDARD })
    opacity.value = withTiming(isOpen ? 1 : 0, { duration: VOID_MOTION_DURATION_STANDARD })
  }, [isOpen, offset, opacity])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }))

  if (!isOpen) return null

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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    height: 420,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 24,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
  },
})
