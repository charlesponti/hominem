import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'

import { useApiClient } from '@hominem/hono-client/react'
import { Text, theme } from '~/theme'
import { useStartChat } from '~/utils/services/chat/use-chat-messages-new'

/**
 * CaptureBar — inline quick-capture input mounted at the top of HomeView (focus).
 *
 * "Think through it" seeds a new sherpa session with the typed text.
 * "SAVE" persists the text as a note directly (no session required).
 */
export const CaptureBar = () => {
  const router = useRouter()
  const client = useApiClient()
  const [text, setText] = useState('')

  const { mutate: startChat, isPending: isStarting } = useStartChat({
    userMessage: text,
    _sherpaMessage: 'Let\'s think through it.',
    onSuccess: () => {
      setText('')
      router.push('/(protected)/(tabs)/sherpa' as RelativePathString)
    },
  })

  const saveNote = useMutation({
    mutationFn: () => {
      const trimmed = text.trim()
      return client.notes.create({
        content: trimmed,
        title: trimmed.slice(0, 64) || undefined,
      })
    },
    onSuccess: () => {
      setText('')
    },
  })

  const handleThinkThroughIt = useCallback(() => {
    if (!text.trim()) return
    startChat()
  }, [text, startChat])

  const handleSave = useCallback(() => {
    if (!text.trim()) return
    saveNote.mutate()
  }, [text, saveNote])

  const hasInput = text.trim().length > 0
  const isBusy = isStarting || saveNote.isPending

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="What's on your mind?"
        placeholderTextColor={theme.colors['text-tertiary']}
        style={styles.input}
        value={text}
        onChangeText={setText}
        multiline
        returnKeyType="default"
        accessibilityLabel="Capture your thought"
        testID="capture-bar-input"
      />
      {hasInput && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleThinkThroughIt}
            disabled={isBusy}
            accessibilityLabel="Think through it — open as chat"
            testID="capture-bar-think"
          >
            <Text variant="label" color="background">
              THINK THROUGH IT
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={handleSave}
            disabled={isBusy}
            accessibilityLabel="Save as note"
            testID="capture-bar-save"
          >
            <Text variant="label" color="foreground">
              {saveNote.isPending ? 'SAVING…' : 'SAVE'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    padding: 12,
    gap: 10,
  },
  input: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontFamily: 'Geist Mono',
    minHeight: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
  },
  primaryAction: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  secondaryAction: {
    backgroundColor: theme.colors.muted,
  },
})
