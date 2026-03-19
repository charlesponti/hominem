import * as ImagePicker from 'expo-image-picker'
import { useApiClient } from '@hominem/hono-client/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AppIcon from '../ui/icon'
import { useMobileWorkspace } from '../workspace/mobile-workspace-context'
import { appendPickedAssetsToDraft, applyVoiceTranscriptToDraft, removeAttachmentFromDraft } from './mobile-hyper-form-actions'
import { deriveMobileHyperFormPresentation } from './mobile-hyper-form-config'
import { useInputContext } from './input-context'
import { VoiceSessionModal } from '../media/voice-session-modal'
import { theme } from '~/theme'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import {
  createChatInboxRefreshSnapshot,
  invalidateInboxQueries,
  upsertInboxSessionActivity,
} from '~/utils/services/inbox/inbox-refresh'
import { useCreateFocusItem } from '~/utils/services/notes/use-create-focus-item'
import { chatKeys } from '~/utils/services/notes/query-keys'

export const MobileHyperForm = () => {
  const client = useApiClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { mutateAsync: createFocusItem } = useCreateFocusItem()
  const { activeContext } = useMobileWorkspace()
  const insets = useSafeAreaInsets()
  const {
    attachments,
    isRecording,
    message,
    mode,
    submitAction,
    setAttachments,
    setIsRecording,
    setMessage,
    setMode,
  } = useInputContext()
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  const clearDraft = () => {
    setAttachments([])
    setIsRecording(false)
    setMessage('')
    setMode('text')
  }

  const createNoteFromDraft = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      return
    }

    await createFocusItem({
      text: trimmedMessage,
    })
    await invalidateInboxQueries(queryClient)
    clearDraft()
  }

  const createChatFromDraft = async () => {
    const trimmedMessage = message.trim()
    const chatTitle = trimmedMessage.slice(0, 64) || 'New conversation'
    const chat = await client.chats.create({
      title: chatTitle,
    })

    if (trimmedMessage) {
      await client.chats.send({
        chatId: chat.id,
        message: trimmedMessage,
      })
    }

    queryClient.setQueryData<ChatWithActivity[] | undefined>(chatKeys.resumableSessions, (previousSessions) =>
      upsertInboxSessionActivity(
        previousSessions ?? [],
        createChatInboxRefreshSnapshot({
          chatId: chat.id,
          noteId: chat.noteId,
          title: chat.title,
          timestamp: chat.createdAt,
          userId: chat.userId,
        }),
      ),
    )
    await invalidateInboxQueries(queryClient)
    clearDraft()
    router.push(`/(protected)/(tabs)/sherpa?chatId=${chat.id}` as RelativePathString)
  }

  const handlePrimaryAction = () => {
    if (activeContext === 'chat') {
      submitAction?.()
      return
    }

    if (activeContext === 'search') {
      return
    }

    void createNoteFromDraft()
  }

  const handleSecondaryAction = () => {
    if (activeContext === 'search') {
      return
    }

    if (activeContext === 'chat') {
      void createNoteFromDraft()
      return
    }

    void createChatFromDraft()
  }


  const presentation = deriveMobileHyperFormPresentation({
    context: activeContext,
    hasText: message.trim().length > 0 || attachments.length > 0,
    isRecording,
  })

  const handlePickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      quality: 0.8,
    })

    if (result.canceled) {
      return
    }

    const nextState = appendPickedAssetsToDraft(
      {
        attachments,
        context: activeContext,
        isRecording,
        mode,
        text: message,
      },
      result.assets.map((asset) => ({
        fileName: asset.fileName ?? null,
        type: asset.type ?? null,
        uri: asset.uri,
      })),
    )

    setAttachments(nextState.attachments)
  }

  const handleVoiceTranscript = (transcript: string) => {
    const nextState = applyVoiceTranscriptToDraft(
      {
        attachments,
        context: activeContext,
        isRecording,
        mode,
        text: message,
      },
      transcript,
    )

    setMessage(nextState.text)
    setIsRecording(nextState.isRecording)
    setMode(nextState.mode)
    setIsVoiceModalOpen(false)
  }

  const handleRemoveAttachment = (attachmentId: string) => {
    const nextState = removeAttachmentFromDraft(
      {
        attachments,
        context: activeContext,
        isRecording,
        mode,
        text: message,
      },
      attachmentId,
    )

    setAttachments(nextState.attachments)
  }

  if (presentation.posture === 'hidden') {
    return null
  }

  return (
    <View
      style={[
        styles.shell,
        { bottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View
        style={[
          styles.container,
          presentation.posture === 'draft' ? styles.containerDraft : null,
        ]}
        testID="mobile-hyper-form"
      >
        <TextInput
          onChangeText={setMessage}
          placeholder={presentation.placeholder}
          placeholderTextColor={theme.colors['text-tertiary']}
          style={[styles.input, presentation.posture === 'draft' ? styles.inputDraft : null]}
          testID="mobile-hyper-form-input"
          value={message}
        />
        {attachments.length > 0 ? (
          <View style={styles.attachments} testID="mobile-hyper-form-attachments">
            {attachments.map((attachment) => (
              <Pressable
                key={attachment.id}
                onPress={() => handleRemoveAttachment(attachment.id)}
                style={styles.attachmentChip}
                testID={`mobile-hyper-form-attachment-${attachment.id}`}
              >
                <Text style={styles.attachmentLabel}>{attachment.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.tools}>
            {presentation.showsAttachmentButton ? (
              <Pressable
                onPress={() => {
                  void handlePickAttachment()
                }}
                accessibilityLabel="Add attachment"
                style={styles.toolButton}
                testID="mobile-hyper-form-attach"
              >
                <AppIcon name="plus" size={18} style={styles.icon} />
              </Pressable>
            ) : null}
            {presentation.showsVoiceButton ? (
              <Pressable
                onPress={() => {
                  setMode('voice')
                  setIsRecording(true)
                  setIsVoiceModalOpen(true)
                }}
                accessibilityLabel="Record voice note"
                style={styles.toolButton}
                testID="mobile-hyper-form-voice"
              >
                <AppIcon name="microphone" size={18} style={styles.icon} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.actions}>
            {presentation.secondaryActionLabel ? (
              <Pressable
                accessibilityLabel={presentation.secondaryActionLabel}
                onPress={handleSecondaryAction}
                style={styles.secondaryAction}
                testID="mobile-hyper-form-secondary-action"
              >
                <AppIcon
                  name={activeContext === 'chat' ? 'circle-plus' : 'comment'}
                  size={18}
                  style={styles.icon}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={presentation.primaryActionLabel}
              onPress={handlePrimaryAction}
              style={styles.primaryAction}
              testID="mobile-hyper-form-primary-action"
            >
              <AppIcon
                name={activeContext === 'chat' ? 'arrow-up' : 'circle-plus'}
                size={18}
                style={styles.primaryIcon}
              />
            </Pressable>
          </View>
        </View>
      </View>
      <VoiceSessionModal
        onAudioTranscribed={handleVoiceTranscript}
        onClose={() => {
          setIsRecording(false)
          setMode('text')
          setIsVoiceModalOpen(false)
        }}
        visible={isVoiceModalOpen}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    left: 0,
    paddingHorizontal: theme.spacing.sm_8,
    position: 'absolute',
    right: 0,
  },
  container: {
    gap: theme.spacing.sm_12,
    backgroundColor: theme.colors.background,
    boxShadow: '0 -10px 30px rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: 30,
    paddingHorizontal: theme.spacing.sm_12,
    paddingTop: theme.spacing.sm_12,
    paddingBottom: theme.spacing.sm_8,
    overflow: 'hidden',
  },
  containerDraft: {
    minHeight: 160,
  },
  input: {
    color: theme.colors.foreground,
    fontSize: 16,
    minHeight: 38,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  inputDraft: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm_8,
  },
  attachmentChip: {
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: theme.spacing.sm_8,
    paddingVertical: theme.spacing.xs_4,
  },
  attachmentLabel: {
    color: theme.colors.foreground,
    fontSize: 12,
  },
  tools: {
    flexDirection: 'row',
    gap: theme.spacing.sm_8,
  },
  toolButton: {
    alignItems: 'center',
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  icon: {
    color: theme.colors.foreground,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm_8,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.foreground,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 42,
  },
  primaryIcon: {
    color: theme.colors.background,
  },
})
