import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { colors, durations, fontSizes, radiiNative, spacing } from '../../tokens'
import { Text } from '../typography/text.native'

const DOT_UP_DURATION = durations.enter
const DOT_DOWN_DURATION = durations.exit
const DOT_RETURN_DURATION = durations.standard
const CYCLE_IDLE = durations.standard * 6
const STAGGER_OFFSET = durations.enter

function useBounceDot(delayMs: number) {
  const translateY = useSharedValue(0)

  useAnimatedReaction(
    () => translateY.value,
    (_current: number, prev: number | null) => {
      'worklet'
      if (prev === null) {
        translateY.value = withDelay(
          delayMs,
          withRepeat(
            withSequence(
              withTiming(-4, { duration: DOT_UP_DURATION }),
              withTiming(2, { duration: DOT_DOWN_DURATION }),
              withTiming(0, { duration: DOT_RETURN_DURATION }),
              withTiming(0, { duration: CYCLE_IDLE }),
            ),
            -1,
          ),
        )
      }
    },
  )

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
}

interface ChatThinkingIndicatorProps {
  appName: string
}

export function ChatThinkingIndicator({ appName }: ChatThinkingIndicatorProps) {
  const dot1Style = useBounceDot(0)
  const dot2Style = useBounceDot(STAGGER_OFFSET)
  const dot3Style = useBounceDot(STAGGER_OFFSET * 2)

  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text color="text-tertiary" style={styles.label}>
          {appName}
        </Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
          <Text color="text-tertiary" style={styles.thinkingText}>
            Thinking...
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[2],
    width: '100%',
  },
  dot: {
    backgroundColor: colors.foreground,
    borderRadius: radiiNative.md,
    height: 8,
    opacity: 0.65,
    width: 8,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '500',
    marginBottom: spacing[1],
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  thinkingText: {
    fontSize: fontSizes.xs,
    marginLeft: spacing[1],
  },
})
