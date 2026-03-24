import * as ImagePicker from 'expo-image-picker'
import { CHAT_TITLE_MAX_LENGTH } from '@hominem/chat-services/constants'
import { useApiClient } from '@hominem/rpc/react'
import { CHAT_UPLOAD_MAX_FILE_COUNT } from '@hominem/utils/upload'
import { CameraModal } from '../media/camera-modal'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React, { useState } from 'react'
import { Alert } from 'react-native'
import { StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMobileWorkspace } from '../workspace/mobile-workspace-context'
import {
  appendUploadedAssetsToDraft,
  applyVoiceTranscriptToDraft,
  removeAttachmentFromDraft,
} from './mobile-composer-actions'
import { MobileComposerAttachments } from './mobile-composer-attachments'
import { deriveMobileComposerPresentation } from './mobile-composer-config'
import { MobileComposerFooter } from './mobile-composer-footer'
import { useInputContext } from './input-context'
import { VoiceSessionModal } from '../media/voice-session-modal'
import { theme } from '~/theme'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import {
  createChatInboxRefreshSnapshot,
  invalidateInboxQueries,
  upsertInboxSessionActivity,
} from '~/utils/services/inbox/inbox-refresh'
import { donateAddNoteIntent } from '~/lib/intent-donation'
import { useSendMessage } from '~/utils/services/chat'
import { useFileUpload } from '~/utils/services/files/use-file-upload'
import { useCreateFocusItem } from '~/utils/services/notes/use-create-focus-item'
import { chatKeys } from '~/utils/services/notes/query-keys'

export const MobileComposer = () => {
  const client = useApiClient()
  const router = useRouter()
  const params = useLocalSearchParams<{ chatId?: string }>()
  const queryClient = useQueryClient()
  const { mutateAsync: createFocusItem } = useCreateFocusItem()
  const { activeContext } = useMobileWorkspace()
  const insets = useSafeAreaInsets()
  const {
    attachments,
    isRecording,
    message,
    mode,
    setAttachments,
    setIsRecording,
    setMessage,
    setMode,
  } = useInputContext()
  const { sendChatMessage } = useSendMessage({ chatId: params.chatId ?? '' })
  const { uploadAssets, uploadState, clearErrors } = useFileUpload()
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
    donateAddNoteIntent()
    await invalidateInboxQueries(queryClient)
    clearDraft()
  }

  const createChatFromDraft = async () => {
    const trimmedMessage = message.trim()
    const fileIds = attachments.flatMap((attachment) =>
      attachment.uploadedFile?.id ? [attachment.uploadedFile.id] : [],
    )
    const chatTitle = trimmedMessage.slice(0, CHAT_TITLE_MAX_LENGTH) || 'New conversation'
    const chat = await client.chats.create({
      title: chatTitle,
    })

    if (trimmedMessage || fileIds.length > 0) {
      await client.chats.send({
        chatId: chat.id,
        message: trimmedMessage,
        ...(fileIds.length > 0 ? { fileIds } : {}),
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
      const trimmedMessage = message.trim()
      const fileIds = attachments.flatMap((attachment) =>
        attachment.uploadedFile?.id ? [attachment.uploadedFile.id] : [],
      )

      if ((!trimmedMessage && fileIds.length === 0) || !params.chatId) {
        return
      }

      void sendChatMessage({
        message: trimmedMessage,
        ...(fileIds.length > 0 ? { fileIds } : {}),
      }).then(() => {
        setAttachments([])
      })
      setMessage('')
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


  const presentation = deriveMobileComposerPresentation({
    context: activeContext,
    hasText: message.trim().length > 0 || attachments.length > 0,
    isRecording,
  })

  const handlePickAttachment = async () => {
    clearErrors()

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      quality: 0.8,
    })

    if (result.canceled) {
      return
    }

    if (attachments.length + result.assets.length > CHAT_UPLOAD_MAX_FILE_COUNT) {
      Alert.alert(`You can upload up to ${CHAT_UPLOAD_MAX_FILE_COUNT} files`)
      return
    }

    const uploadedAssets = await uploadAssets(
      result.assets.map((asset) => ({
        assetId: asset.assetId ?? asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        type: asset.type ?? null,
        uri: asset.uri,
      })),
    )

    if (uploadedAssets.length === 0) {
      return
    }

    setAttachments((currentAttachments) =>
      appendUploadedAssetsToDraft(
        {
          attachments: currentAttachments,
          context: activeContext,
          isRecording,
          mode,
          text: message,
        },
        uploadedAssets,
      ).attachments,
    )
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
    clearErrors()
    void (async () => {
      const uploadedAssets = await uploadAssets([
        {
          assetId: photo.uri,
          fileName: photo.fileName ?? null,
          mimeType: 'image/jpeg',
          type: 'image',
          uri: photo.uri,
        },
      ])

      if (uploadedAssets.length > 0) {
        setAttachments((currentAttachments) =>
          appendUploadedAssetsToDraft(
            {
              attachments: currentAttachments,
              context: activeContext,
              isRecording,
              mode,
              text: message,
            },
            uploadedAssets,
          ).attachments,
        )
      }

      setIsCameraOpen(false)
    })()
  }

  const handleRemoveAttachment = (attachmentId: string) => {
    const attachmentToRemove = attachments.find((attachment) => attachment.id === attachmentId)

    setAttachments((currentAttachments) =>
      removeAttachmentFromDraft(
        {
          attachments: currentAttachments,
          context: activeContext,
          isRecording,
          mode,
          text: message,
        },
        attachmentId,
      ).attachments,
    )

    if (attachmentToRemove?.uploadedFile?.id) {
      void client.files.delete({
        fileId: attachmentToRemove.uploadedFile.id,
      }).catch(() => {
        // Best-effort cleanup only.
      })
    }
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
        testID="mobile-composer"
      >
        <TextInput
          onChangeText={setMessage}
          placeholder={presentation.placeholder}
          placeholderTextColor={theme.colors['text-tertiary']}
          style={[styles.input, presentation.posture === 'draft' ? styles.inputDraft : null]}
          testID="mobile-composer-input"
          value={message}
        />
        <MobileComposerAttachments
          attachments={attachments}
          errors={uploadState.errors}
          isUploading={uploadState.isUploading}
          onRemoveAttachment={handleRemoveAttachment}
          progress={uploadState.progress}
        />
        <MobileComposerFooter
          activeContext={activeContext}
          disableAttachmentActions={uploadState.isUploading}
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
    borderRadius: theme.borderRadii.md,
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
