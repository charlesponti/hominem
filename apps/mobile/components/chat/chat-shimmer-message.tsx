import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import { theme } from '~/theme'

function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return opacity
}

export function ChatShimmerMessage() {
  const opacity = usePulse()
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.avatar, { opacity }]} />
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineFull, { opacity }]} />
        <Animated.View style={[styles.line, styles.lineShort, { opacity }]} />
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
