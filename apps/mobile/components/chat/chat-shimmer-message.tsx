import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'

// 5x standard duration per direction (~600ms) for a slow, calm loading pulse
const SHIMMER_DURATION = VOID_MOTION_DURATION_STANDARD * 5

function usePulse() {
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SHIMMER_DURATION }),
        withTiming(0.4, { duration: SHIMMER_DURATION }),
      ),
      -1,
    )
  }, [opacity])

  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

export function ChatShimmerMessage() {
  const animatedStyle = usePulse()
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.avatar, animatedStyle]} />
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineFull, animatedStyle]} />
        <Animated.View style={[styles.line, styles.lineShort, animatedStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.muted,
    flexShrink: 0,
  },
  lines: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  line: {
    height: 16,
    borderRadius: 4,
    backgroundColor: theme.colors.muted,
  },
  lineFull: {
    width: '100%',
  },
  lineShort: {
    width: '66%',
  },
})
