import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import { Text, theme } from '~/theme'

function useBounceDot(delay: number) {
  const translateY = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: -4, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 2, duration: 230, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 170, useNativeDriver: true }),
        Animated.delay(1800 - 800 - delay),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [translateY, delay])
  return translateY
}

export function ChatThinkingIndicator() {
  const dot1 = useBounceDot(0)
  const dot2 = useBounceDot(120)
  const dot3 = useBounceDot(240)

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <View style={styles.iconDot} />
      </View>
      <View style={styles.content}>
        <Text variant="small" style={styles.label}>AI Assistant</Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
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
    fontSize: 12,
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
    fontSize: 12,
    marginLeft: 2,
  },
})
