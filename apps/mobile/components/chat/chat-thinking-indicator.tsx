import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { fontSizes } from '@hominem/ui/tokens'

import { Text, theme } from '~/theme'
import { VOID_EASING_STANDARD } from '~/theme/motion'

// Stagger timing for thinking dots — 3-dot bounce cadence
const DOT_UP_DURATION = 400
const DOT_DOWN_DURATION = 230
const DOT_RETURN_DURATION = 170
const CYCLE_IDLE = 800 // idle period before repeating
const STAGGER_OFFSET = 120 // ms between each dot

function useBounceDot(delayMs: number) {
  const translateY = useSharedValue(0)

  useEffect(() => {
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: DOT_UP_DURATION, easing: VOID_EASING_STANDARD }),
          withTiming(2, { duration: DOT_DOWN_DURATION, easing: VOID_EASING_STANDARD }),
          withTiming(0, { duration: DOT_RETURN_DURATION, easing: VOID_EASING_STANDARD }),
          withTiming(0, { duration: CYCLE_IDLE }),
        ),
        -1,
      ),
    )
  }, [translateY, delayMs])

  return useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))
}

export function ChatThinkingIndicator() {
  const dot1Style = useBounceDot(0)
  const dot2Style = useBounceDot(STAGGER_OFFSET)
  const dot3Style = useBounceDot(STAGGER_OFFSET * 2)

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <View style={styles.iconDot} />
      </View>
      <View style={styles.content}>
        <Text variant="small" style={styles.label}>AI Assistant</Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
          <Text variant="small" style={styles.thinkingText}>Thinking...</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    backgroundColor: `${theme.colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors['border-subtle'],
    padding: 16,
    gap: 8,
  },
  label: {
    color: theme.colors['text-tertiary'],
    fontSize: fontSizes.xs,
    fontWeight: '500',
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.primary,
  },
  thinkingText: {
    color: theme.colors['text-tertiary'],
    fontSize: fontSizes.xs,
    marginLeft: 2,
  },
})
