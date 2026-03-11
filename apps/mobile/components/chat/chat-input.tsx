import * as ImagePicker from 'expo-image-picker'
import { useCallback, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { theme } from '~/theme'
import { VoiceSessionModal } from '../media/voice-session-modal'
import MindsherpaIcon from '../ui/icon'

const MAX_MESSAGE_LENGTH = 10_000

const DEFAULT_SUGGESTIONS = [
  'Help me expand this note',
  'Create an outline from this',
  'Summarize the key points',
  'Rewrite in a different style',
]

type ChatInputProps = {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (message: string) => void
  isPending?: boolean
  suggestions?: string[]
}

export const ChatInput = ({
  message,
  onMessageChange,
  onSendMessage,
  isPending = false,
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatInputProps) => {
  const inputRef = useRef<TextInput>(null)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([])

  const characterCount = message.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const canSend = message.trim().length > 0 && !isPending && !isOverLimit
  const showSuggestions = message.length === 0 && !isPending && suggestions.length > 0

  const formatAttachmentContext = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) return ''
    return assets
      .map((a) => {
        const name = a.fileName ?? a.uri.split('/').pop() ?? 'image'
        return `Attachment: ${name} (${a.type ?? 'image'})`
      })
      .join('\n')
  }, [])

  const handleSend = useCallback(() => {
    if (!canSend) return
    const attachmentContext = formatAttachmentContext(attachments)
    const fullMessage = attachmentContext
      ? `${message.trim()}\n\nAttached files:\n${attachmentContext}`
      : message.trim()
    onSendMessage(fullMessage)
    onMessageChange('')
    setAttachments([])
    inputRef.current?.focus()
  }, [canSend, message, attachments, formatAttachmentContext, onSendMessage, onMessageChange])

  const handleVoiceTranscribed = useCallback(
    (transcription: string) => {
      onSendMessage(transcription)
    },
    [onSendMessage],
  )

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets])
    }
  }, [])

  const handleRemoveAttachment = useCallback((uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri))
  }, [])

  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      onMessageChange(suggestion)
      inputRef.current?.focus()
    },
    [onMessageChange],
  )

  return (
    <View style={styles.container}>
      {/* Suggestion chips */}
      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionTap(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={suggestion}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentsScroll}
          contentContainerStyle={styles.attachmentsContent}
        >
          {attachments.map((asset) => {
            const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image'
            return (
              <View key={asset.uri} style={styles.attachmentChip}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable
                  onPress={() => handleRemoveAttachment(asset.uri)}
                  style={styles.removeAttachment}
                  accessibilityLabel={`Remove ${name}`}
                >
                  <Text style={styles.removeAttachmentText}>×</Text>
                </Pressable>
              </View>
            )
          })}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          placeholder="Where should we start?"
          placeholderTextColor={theme.colors['text-tertiary']}
          style={[styles.input, isOverLimit && styles.inputError]}
          editable={!isPending}
          value={message}
          onChangeText={onMessageChange}
          testID="chat-input-message"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <Pressable
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={isPending}
          accessibilityLabel="Attach image"
          testID="chat-attach-button"
        >
          <MindsherpaIcon name="paperclip" size={18} color={theme.colors['text-tertiary']} />
        </Pressable>
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
          style={[styles.iconButton, styles.sendButton, !canSend ? styles.disabled : null]}
          disabled={!canSend}
          onPress={handleSend}
          accessibilityLabel="Send message"
          testID="chat-send-message-button"
        >
          <MindsherpaIcon name="arrow-up" size={20} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Character counter / over-limit warning */}
      <View style={styles.footer}>
        {isOverLimit ? (
          <Text style={styles.overLimitText}>Message too long</Text>
        ) : null}
        <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
          {characterCount}/{MAX_MESSAGE_LENGTH}
        </Text>
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
    borderTopColor: theme.colors['border-default'],
    backgroundColor: theme.colors.background,
    gap: 8,
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestionsContent: {
    gap: 8,
    paddingRight: 4,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    backgroundColor: theme.colors.muted,
  },
  suggestionText: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontFamily: 'Geist Mono',
  },
  attachmentsScroll: {
    flexGrow: 0,
  },
  attachmentsContent: {
    gap: 8,
    paddingRight: 4,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    backgroundColor: theme.colors.muted,
    maxWidth: 160,
    gap: 6,
  },
  attachmentName: {
    color: theme.colors.foreground,
    fontSize: 11,
    fontFamily: 'Geist Mono',
    flex: 1,
  },
  removeAttachment: {
    paddingHorizontal: 2,
  },
  removeAttachmentText: {
    color: theme.colors['text-tertiary'],
    fontSize: 16,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 14,
    fontFamily: 'Geist Mono',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: 8,
    maxHeight: 120,
  },
  inputError: {
    borderColor: theme.colors.destructive,
  },
  iconButton: {
    height: 40,
    width: 40,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Geist Mono',
    color: theme.colors['text-tertiary'],
  },
  charCountError: {
    color: theme.colors.destructive,
  },
  overLimitText: {
    fontSize: 11,
    fontFamily: 'Geist Mono',
    color: theme.colors.destructive,
    flex: 1,
  },
})
