import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import Reanimated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Text, theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { useMobileAudioRecorder } from '../media/use-mobile-audio-recorder'
import { MobileVoiceInput } from '../media/mobile-voice-input'
import MindsherpaIcon from '../ui/icon'

type ChatInputProps = {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (message: string) => void
  isPending?: boolean
}

export const ChatInput = ({ message, onMessageChange, onSendMessage, isPending = false }: ChatInputProps) => {
  const inputRef = useRef<TextInput>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)

  // Voice recording with auto-transcription
  const { startRecording, stopRecording, isRecording } = useMobileAudioRecorder({
    autoTranscribe: true,
    onAudioTranscribed: (transcription) => {
      // Auto-send transcribed message in chat
      onSendMessage(transcription)
      setIsVoiceMode(false)
    },
    onError: () => {
      setIsVoiceMode(false)
    },
  })

  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
      return
    }

    await startRecording()
  }, [isRecording, startRecording, stopRecording])

  const handleSend = useCallback(() => {
    if (!message.trim()) return
    onSendMessage(message)
    onMessageChange('')
    inputRef.current?.focus()
  }, [message, onSendMessage, onMessageChange])

  const backgroundColor = useSharedValue(0)
  const voiceButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      [theme.colors.muted, theme.colors.destructive]
    ),
  }))

  // Update color when recording state changes
  if (isRecording && backgroundColor.value !== 1) {
    backgroundColor.value = withTiming(1, { duration: VOID_MOTION_DURATION_STANDARD })
  } else if (!isRecording && backgroundColor.value !== 0) {
    backgroundColor.value = withTiming(0, { duration: VOID_MOTION_DURATION_STANDARD })
  }

  return (
    <View style={styles.container}>
      {isVoiceMode ? (
        <MobileVoiceInput
          onRecordingStateChange={setIsVoiceMode}
          autoTranscribe={true}
          onAudioTranscribed={(transcription) => {
            onSendMessage(transcription)
          }}
        />
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            placeholder="Where should we start?"
            placeholderTextColor={theme.colors.mutedForeground}
            style={styles.input}
            editable={!isPending && !isRecording}
            value={message}
            onChangeText={onMessageChange}
            testID="chat-input-message"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.iconButton, voiceButtonStyle]}
            onPress={() => {
              void handleVoiceToggle()
            }}
            accessibilityLabel="Voice input"
            testID="chat-voice-input-button"
          >
            <MindsherpaIcon
              name="microphone"
              size={20}
              color={isRecording ? theme.colors.foreground : theme.colors.white}
            />
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.sendButton, isPending || !message.trim() ? styles.disabled : null]}
            disabled={isPending || !message.trim()}
            onPress={handleSend}
            accessibilityLabel="Send message"
            testID="chat-send-message-button"
          >
            <MindsherpaIcon name="arrow-up" size={20} color={theme.colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
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
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    backgroundColor: theme.colors.muted,
  },
  disabled: {
    opacity: 0.5,
  },
})
