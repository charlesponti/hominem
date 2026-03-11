import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'

import { theme } from '~/theme'
import { VoiceSessionModal } from '../media/voice-session-modal'
import MindsherpaIcon from '../ui/icon'

type ChatInputProps = {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (message: string) => void
  isPending?: boolean
}

export const ChatInput = ({ message, onMessageChange, onSendMessage, isPending = false }: ChatInputProps) => {
  const inputRef = useRef<TextInput>(null)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  const handleSend = useCallback(() => {
    if (!message.trim()) return
    onSendMessage(message)
    onMessageChange('')
    inputRef.current?.focus()
  }, [message, onSendMessage, onMessageChange])

  const handleVoiceTranscribed = useCallback(
    (transcription: string) => {
      onSendMessage(transcription)
    },
    [onSendMessage],
  )

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          placeholder="Where should we start?"
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.input}
          editable={!isPending}
          value={message}
          onChangeText={onMessageChange}
          testID="chat-input-message"
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          style={styles.iconButton}
          onPress={() => setIsVoiceModalOpen(true)}
          accessibilityLabel="Open voice input"
          accessibilityHint="Opens a full-screen voice recording panel"
          testID="chat-voice-input-button"
        >
          <MindsherpaIcon name="microphone" size={20} color={theme.colors.white} />
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

      <VoiceSessionModal
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAudioTranscribed={handleVoiceTranscribed}
      />
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
