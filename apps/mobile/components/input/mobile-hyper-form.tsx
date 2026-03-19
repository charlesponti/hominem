import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AppIcon from '../ui/icon'
import { useMobileWorkspace } from '../workspace/mobile-workspace-context'
import { appendPickedAssetsToDraft, applyVoiceTranscriptToDraft, removeAttachmentFromDraft } from './mobile-hyper-form-actions'
import { deriveMobileHyperFormPresentation } from './mobile-hyper-form-config'
import { useInputContext } from './input-context'
import { VoiceSessionModal } from '../media/voice-session-modal'
import { theme } from '~/theme'

export const MobileHyperForm = () => {
  const { activeContext } = useMobileWorkspace()
  const insets = useSafeAreaInsets()
  const {
    attachments,
    context,
    isRecording,
    message,
    mode,
    submitAction,
    setAttachments,
    setContext,
    setIsRecording,
    setMessage,
    setMode,
  } = useInputContext()
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  useEffect(() => {
    if (context !== activeContext) {
      setContext(activeContext)
    }
  }, [activeContext, context, setContext])

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
        context,
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
        context,
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
        context,
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
              onPress={() => {
                if (activeContext === 'chat') {
                  submitAction?.()
                }
              }}
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
    paddingHorizontal: 8,
    position: 'absolute',
    right: 0,
  },
  container: {
    gap: 12,
    backgroundColor: theme.colors.background,
    boxShadow: '0 -10px 30px rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
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
    gap: 8,
  },
  attachmentChip: {
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachmentLabel: {
    color: theme.colors.foreground,
    fontSize: 12,
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
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
    gap: 8,
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
