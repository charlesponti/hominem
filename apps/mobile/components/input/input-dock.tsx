import { useRouter, useSegments } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text, theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { useAuth } from '~/utils/auth-provider'
import { useStartChat } from '~/utils/services/chat'
import MindsherpaIcon from '../ui/icon'
import { useInputContext } from './input-context'

type InputDockProps = {
  seedPrompt?: string
}

export const InputDock = ({ seedPrompt }: InputDockProps) => {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const insets = useSafeAreaInsets()
  const { message, setMessage, isRecording, setIsRecording, setMode } = useInputContext()
  const translateY = useSharedValue(0)
  const expanded = useSharedValue(1)

  const { mutate: startChat, isPending } = useStartChat({
    userMessage: message || seedPrompt || '',
    _sherpaMessage: 'Jumping in now.',
    onSuccess: () => {
      setMessage('')
      router.push('/(protected)/(tabs)/sherpa' as RelativePathString)
    },
  })

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          translateY.value = event.translationY
        })
        .onEnd(() => {
          const shouldCollapse = translateY.value > 40
          expanded.value = shouldCollapse ? 0 : 1
          translateY.value = withTiming(0, { duration: VOID_MOTION_DURATION_STANDARD })
        }),
    [expanded, translateY]
  )

  const animatedContainer = useAnimatedStyle(() => {
    const collapse = expanded.value
    const height = interpolate(collapse, [0, 1], [56, 108], Extrapolation.CLAMP)
    const radius = interpolate(collapse, [0, 1], [20, 28], Extrapolation.CLAMP)
    const translate = interpolate(collapse, [0, 1], [12, 0], Extrapolation.CLAMP)
    return {
      height,
      borderRadius: radius,
      transform: [{ translateY: translate + translateY.value * 0.25 }],
    }
  })

  const handleVoicePress = useCallback(() => {
    setIsRecording(!isRecording)
    setMode('voice')
  }, [isRecording, setIsRecording, setMode])

  const handleTextModePress = useCallback(() => {
    setMode('text')
  }, [setMode])

  const handleInputFocus = useCallback(() => {
    expanded.value = withTiming(1, { duration: VOID_MOTION_DURATION_STANDARD })
  }, [expanded])

  const onSend = useCallback(() => {
    if (!message && !seedPrompt) return
    startChat()
  }, [message, seedPrompt, startChat])

  const toggleExpanded = useCallback(() => {
    expanded.value = withTiming(expanded.value === 1 ? 0 : 1, {
      duration: VOID_MOTION_DURATION_STANDARD,
    })
  }, [expanded])

  const isInDrawer = segments[0] === '(protected)'
  if (!isSignedIn || !isInDrawer) return null

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.container,
          animatedContainer,
          {
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <Pressable style={styles.bar} onPress={toggleExpanded} accessibilityLabel="Expand input">
          <View style={styles.grabber} />
          <Text variant="label" color="white">
            ASK SHERPA
          </Text>
        </Pressable>

        <View style={styles.inputRow}>
          <Pressable
            style={styles.iconButton}
            onPress={handleTextModePress}
            accessibilityLabel="Add attachment"
          >
            <MindsherpaIcon name="circle-plus" size={22} color={theme.colors.white} />
          </Pressable>
          <TextInput
            placeholder="Where should we start?"
            placeholderTextColor={theme.colors['text-tertiary']}
            style={styles.input}
            editable={!isPending && !isRecording}
            value={message}
            onChangeText={setMessage}
            testID="input-message"
            onFocus={handleInputFocus}
          />
          <Pressable
            style={styles.iconButton}
            onPress={handleVoicePress}
            accessibilityLabel="Voice input"
            testID="voice-input-button"
          >
            <MindsherpaIcon name="microphone" size={22} color={theme.colors.white} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.sendButton, isPending ? styles.disabled : null]}
            disabled={isPending}
            onPress={onSend}
            accessibilityLabel="Send"
            testID="send-message-button"
          >
            <MindsherpaIcon name="arrow-up" size={20} color={theme.colors.foreground} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    width: '94%',
    alignSelf: 'center',
    position: 'absolute',
    left: '3%',
    right: '3%',
    bottom: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors['border-default'],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 14,
    fontFamily: 'Geist Mono',
    paddingVertical: 10,
  },
  iconButton: {
    height: 42,
    width: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
  },
  sendButton: {
    backgroundColor: theme.colors.muted,
  },
  disabled: {
    opacity: 0.5,
  },
})
