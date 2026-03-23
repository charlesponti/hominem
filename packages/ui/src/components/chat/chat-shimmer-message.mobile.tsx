import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { colors, durations, radiiNative, spacing } from '../../tokens'

const SHIMMER_DURATION = durations.standard * 5

function usePulse() {
  const opacity = useSharedValue(0.4)

  useAnimatedReaction(
    () => opacity.value,
    (_current: number, prev: number | null) => {
      'worklet'
      if (prev === null) {
        opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: SHIMMER_DURATION }),
            withTiming(0.4, { duration: SHIMMER_DURATION }),
          ),
          -1,
        )
      }
    },
  )

  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

interface ChatShimmerMessageProps {
  variant?: 'assistant' | 'user'
}

export function ChatShimmerMessage({ variant = 'assistant' }: ChatShimmerMessageProps) {
  const animatedStyle = usePulse()

  if (variant === 'user') {
    return (
      <View style={[styles.row, styles.userRow]}>
        <Animated.View style={[styles.userBubble, animatedStyle]} />
      </View>
    )
  }

  return (
    <View style={styles.row}>
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineFull, animatedStyle]} />
        <Animated.View style={[styles.line, styles.lineShort, animatedStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors['bg-surface'],
    borderRadius: radiiNative.md,
    height: 16,
  },
  lineFull: {
    width: '100%',
  },
  lineShort: {
    width: '66%',
  },
  lines: {
    flex: 1,
    gap: spacing[2],
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    width: '100%',
  },
  userBubble: {
    backgroundColor: colors['bg-surface'],
    borderRadius: radiiNative.md,
    height: 56,
    maxWidth: 420,
    width: '78%',
  },
  userRow: {
    alignItems: 'flex-end',
  },
})
