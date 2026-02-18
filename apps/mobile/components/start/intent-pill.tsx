import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated'

import { Text, theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import type { IntentSuggestion } from '~/utils/services/intents/use-intent-suggestions'

type IntentPillProps = {
  intent: IntentSuggestion
  delay?: number
  onPress: (intent: IntentSuggestion) => void
}

export const IntentPill = ({ intent, delay = 0, onPress }: IntentPillProps) => {
  return (
    <Animated.View
      entering={FadeIn.duration(VOID_MOTION_DURATION_STANDARD).delay(delay)}
      exiting={FadeOut.duration(VOID_MOTION_DURATION_STANDARD)}
      layout={Layout.duration(VOID_MOTION_DURATION_STANDARD)}
    >
      <Pressable onPress={() => onPress(intent)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
        <View style={styles.emojiCircle}>
          <Text variant="title">{intent.emoji ?? '+'}</Text>
        </View>
        <Text variant="title" color="foreground">
          {intent.title.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.muted,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  emojiCircle: {
    height: 36,
    width: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.muted,
  },
})
