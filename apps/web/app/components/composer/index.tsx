/**
 * Composer — web translation of MobileComposer
 *
 * Layout is pixel-faithful to the mobile design:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  [textarea — grows with content, taller in draft mode]   │
 *   │  [note context chips — if attached in chat mode]         │
 *   │  ──────────────────────────────────────────────────────  │
 *   │  [●][●][●]                    [secondary ○] [primary ●]  │
 *   │  left tools (38×38 bordered)        right actions        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Posture:
 *   capture  — focus/home: primary=Save note, secondary=Start chat
 *   draft    — note detail: primary=Add to note, secondary=Discuss note
 *   reply    — chat: primary=Send (arrow-up), secondary=Save as note
 *   hidden   — no composer rendered (settings etc.)
 *
 * No intent toggle — posture and route determine button roles exactly
 * as on mobile. Enter commits the primary action.
 */

import { memo, useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

import { ChatModals } from '~/components/chat/ChatModals'

import { ComposerAttachmentList } from './composer-attachment-list'
import { AttachedNotesList } from './attached-notes-list'
import { ComposerActionsRow } from './composer-actions-row'
import {
  useComposerAttachedNotes,
  useComposerDraftActions,
  useComposerDraftState,
  useComposerRefs,
  useComposerSubmission,
  useComposerUploadActions,
  useComposerUploadState,
} from './composer-provider'
import { deriveComposerPresentation } from './composer-presentation'
import { ComposerShell } from './composer-shell'
import { ComposerTools } from './composer-tools'
import { useComposerMode } from './use-composer-mode'
import { NotePicker } from './note-picker'

const ComposerInput = memo(function ComposerInput({
  isDraftMode,
  placeholder,
}: {
  isDraftMode: boolean
  placeholder: string
}) {
  const { draftText } = useComposerDraftState()
  const { setDraftText } = useComposerDraftActions()
  const { isSubmitting } = useComposerSubmission()
  const { inputRef, submitBtnRef } = useComposerRefs()

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (submitBtnRef.current?.disabled) return
      submitBtnRef.current?.click()
    }
  }, [submitBtnRef])

  return (
    <textarea
      ref={inputRef}
      data-testid="composer-input"
      value={draftText}
      onChange={(event) => setDraftText(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={isSubmitting}
      className={[
        'w-full resize-none border-0 bg-transparent p-0 text-base leading-normal text-foreground outline-none field-sizing-content overflow-y-auto placeholder:text-text-tertiary focus:outline-none',
        !isDraftMode ? 'max-h-48 min-h-6' : 'min-h-24 max-h-64',
      ].join(' ')}
      aria-label="Compose message or note"
    />
  )
})

const ComposerAttachments = memo(function ComposerAttachments() {
  const { attachedNotes, detachNote } = useComposerAttachedNotes()
  const { uploadState } = useComposerUploadState()
  const { removeUploadedFile } = useComposerUploadActions()

  return (
    <>
      <ComposerAttachmentList
        errors={uploadState.errors}
        files={uploadState.uploadedFiles}
        onRemove={removeUploadedFile}
      />
      <AttachedNotesList notes={attachedNotes} onRemove={detachNote} />
    </>
  )
})

export function Composer() {
  const { mode, noteId, chatId } = useComposerMode()
  const { attachedNotes } = useComposerAttachedNotes()
  const { setDraftText } = useComposerDraftActions()
  const { uploadFiles } = useComposerUploadActions()
  const { containerRef: cardRef, inputRef } = useComposerRefs()

  const [showVoice, setShowVoice] = useState(false)
  const [showNotePicker, setShowNotePicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const presentation = deriveComposerPresentation(mode, isRecording)
  if (presentation.posture === 'hidden') return null

  const handleAudioTranscribed = useCallback(
    (transcript: string) => {
      setDraftText(transcript)
      setShowVoice(false)
      setIsRecording(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [inputRef, setDraftText],
  )

  const handleCloseNotePicker = useCallback(() => {
    setShowNotePicker(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [inputRef])

  const isDraftMode = presentation.posture === 'draft'

  const handleFilesSelected = useCallback(async (files: FileList | File[] | null) => {
    if (!files || Array.from(files).length === 0) return
    await uploadFiles(files)
  }, [uploadFiles])

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await handleFilesSelected(event.target.files)
      event.target.value = ''
      inputRef.current?.focus()
    },
    [handleFilesSelected, inputRef],
  )

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click()
  }, [])

  const handleNotePickerClick = useCallback(() => {
    setShowNotePicker(true)
  }, [])

  const handleVoiceClick = useCallback(() => {
    if (isRecording) {
      setIsRecording(false)
      return
    }

    setIsRecording(true)
    setShowVoice(true)
  }, [isRecording])

  return (
    <>
      <input
        ref={fileInputRef}
        data-testid="composer-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFileInputChange(event)
        }}
      />
      <input
        ref={cameraInputRef}
        data-testid="composer-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFileInputChange(event)
        }}
      />

      <ComposerShell
        cardRef={cardRef}
        isDraftMode={isDraftMode}
        input={<ComposerInput isDraftMode={isDraftMode} placeholder={presentation.placeholder} />}
        attachments={<ComposerAttachments />}
        tools={
          <ComposerTools
            attachedNotesCount={attachedNotes.length}
            isRecording={isRecording}
            showsAttachmentButton={presentation.showsAttachmentButton}
            showsNotePicker={presentation.showsNotePicker}
            showsVoiceButton={presentation.showsVoiceButton}
            onAttachmentClick={handleAttachmentClick}
            onCameraClick={handleCameraClick}
            onNotePickerClick={handleNotePickerClick}
            onVoiceClick={handleVoiceClick}
          />
        }
        actions={
          <ComposerActionsRow
            primaryActionIcon={presentation.primaryActionIcon}
            primaryActionLabel={presentation.primaryActionLabel}
            secondaryActionIcon={presentation.secondaryActionIcon}
            secondaryActionLabel={presentation.secondaryActionLabel}
            posture={presentation.posture}
            chatId={chatId}
            noteId={noteId}
          />
        }
      />

      <NotePicker open={showNotePicker} onClose={handleCloseNotePicker} />
      <ChatModals
        showAudioRecorder={showVoice}
        onCloseAudioRecorder={() => {
          setShowVoice(false)
          setIsRecording(false)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  )
}
