import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'

import { Text, theme } from '~/theme'
import type { IntentSuggestion } from '~/utils/services/intents/use-intent-suggestions'

type IntentPillProps = {
  intent: IntentSuggestion
  delay?: number
  onPress: (intent: IntentSuggestion) => void
}

export const IntentPill = ({ intent, delay = 0, onPress }: IntentPillProps) => {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(16).stiffness(140)}>
      <Pressable onPress={() => onPress(intent)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
        <View style={styles.emojiCircle}>
          <Text variant="title">{intent.emoji ?? '✨'}</Text>
        </View>
        <Text variant="title" color="white">
          {intent.title}
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  emojiCircle: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
})
