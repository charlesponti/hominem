import * as ImagePicker from 'expo-image-picker'
import { useApiClient } from '@hominem/hono-client/react'
import { recordPositiveSignal } from '~/lib/review-prompt'
import { CameraModal } from '../media/camera-modal'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMobileWorkspace } from '../workspace/mobile-workspace-context'
import { appendPickedAssetsToDraft, applyVoiceTranscriptToDraft, removeAttachmentFromDraft } from './mobile-hyper-form-actions'
import { MobileHyperFormAttachments } from './mobile-hyper-form-attachments'
import { deriveMobileHyperFormPresentation } from './mobile-hyper-form-config'
import { MobileHyperFormFooter } from './mobile-hyper-form-footer'
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
  const [isCameraOpen, setIsCameraOpen] = useState(false)

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
    void recordPositiveSignal()
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

  const handleCameraCapture = (photo: { uri: string; fileName?: string }) => {
    const nextState = appendPickedAssetsToDraft(
      { attachments, context: activeContext, isRecording, mode, text: message },
      [{ fileName: photo.fileName ?? null, type: 'image', uri: photo.uri }],
    )
    setAttachments(nextState.attachments)
    setIsCameraOpen(false)
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
        <MobileHyperFormAttachments
          attachments={attachments}
          onRemoveAttachment={handleRemoveAttachment}
        />
        <MobileHyperFormFooter
          activeContext={activeContext}
          presentation={presentation}
          onPickAttachment={() => {
            void handlePickAttachment()
          }}
          onOpenCamera={() => setIsCameraOpen(true)}
          onOpenVoice={() => {
            setMode('voice')
            setIsRecording(true)
            setIsVoiceModalOpen(true)
          }}
          onSecondaryAction={handleSecondaryAction}
          onPrimaryAction={handlePrimaryAction}
        />
      </View>
      <CameraModal
        visible={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={() => setIsCameraOpen(false)}
      />
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
})
