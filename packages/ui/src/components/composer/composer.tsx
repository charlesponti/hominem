import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2, Mic } from 'lucide-react'

import { emitVoiceEvent } from '@hominem/services/voice-events'
import { SpeechInput } from '../ai-elements'

import { AttachedNotesList } from './attached-notes-list'
import { ComposerActionsRow } from './composer-actions-row'
import { ComposerAttachmentList } from './composer-attachment-list'
import { ComposerShell } from './composer-shell'
import { ComposerTools } from './composer-tools'
import type { ComposerMode } from './composer-provider'
import { deriveComposerPresentation } from './composer-presentation'
import { useComposerAttachedNotes, useComposerDraftActions, useComposerDraftState, useComposerRefs, useComposerSubmission, useComposerUploadActions, useComposerUploadState } from './composer-provider'
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

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

export interface ComposerProps {
  mode: ComposerMode
  noteId?: string | null
  chatId?: string | null
  navigate: (path: string) => void
  transcribeMutation: UseMutationResult<TranscribeResult, Error, TranscribeVariables>
}

export function Composer({ mode, noteId: propNoteId, chatId: propChatId, navigate, transcribeMutation }: ComposerProps) {
  const { attachedNotes } = useComposerAttachedNotes()
  const { setDraftText } = useComposerDraftActions()
  const { uploadFiles } = useComposerUploadActions()
  const { containerRef: cardRef, inputRef } = useComposerRefs()

  const [showVoice, setShowVoice] = useState(false)
  const [showNotePicker, setShowNotePicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false)
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0)
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0)
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const presentation = deriveComposerPresentation(mode, isRecording)
  if (presentation.posture === 'hidden') return null

  const handleAudioTranscribed = useCallback(
    (transcript: string) => {
      setDraftText(transcript)
      setShowVoice(false)
      setVoiceErrorMessage(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [inputRef, setDraftText],
  )

  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    setVoiceErrorMessage(null)

    emitVoiceEvent('voice_transcribe_requested', {
      platform: 'web',
      mimeType: audioBlob.type,
      sizeBytes: audioBlob.size,
    })

    try {
      const preferredLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
      const result = await transcribeMutation.mutateAsync({ audioBlob, language: preferredLanguage })

      emitVoiceEvent('voice_transcribe_succeeded', {
        platform: 'web',
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
      })

      handleAudioTranscribed(result.text)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      setVoiceErrorMessage(errorMessage)

      emitVoiceEvent('voice_transcribe_failed', {
        platform: 'web',
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
      })
    }
  }, [handleAudioTranscribed, transcribeMutation])

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
    if (showVoice) {
      setShowVoice(false)
      setVoiceErrorMessage(null)
      setVoiceAudioLevel(0)
      setRecordingStartedAt(null)
      setRecordingElapsedMs(0)
      setIsVoiceProcessing(false)
      return
    }

    setShowVoice(true)
  }, [showVoice])

  useEffect(() => {
    if (!recordingStartedAt) return

    const intervalId = window.setInterval(() => {
      setRecordingElapsedMs(Date.now() - recordingStartedAt)
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [recordingStartedAt])

  const formattedRecordingTime = `${Math.floor(recordingElapsedMs / 60000).toString().padStart(2, '0')}:${Math.floor((recordingElapsedMs % 60000) / 1000).toString().padStart(2, '0')}`

  const waveformBars = Array.from({ length: 12 }, (_unused, index) => {
    const offset = ((index % 4) + 1) / 4
    const amplified = Math.max(0.12, voiceAudioLevel * offset)
    return Math.min(1, amplified)
  })

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
          <div className="flex items-center gap-3">
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
            {showVoice ? (
              <div className="flex items-center gap-2 rounded-full border border-border bg-bg-surface px-2 py-1">
                <SpeechInput
                  aria-label="Record audio message"
                  className="h-8 w-8"
                  onAudioRecorded={transcribeAudioBlob}
                  onRecordingStateChange={(recording) => {
                    setIsRecording(recording)
                    if (recording) {
                      setRecordingStartedAt(Date.now())
                      return
                    }

                    setRecordingStartedAt(null)
                    setRecordingElapsedMs(0)
                  }}
                  onProcessingStateChange={setIsVoiceProcessing}
                  onAudioLevelChange={(level) => {
                    setVoiceAudioLevel(level)
                    if (level <= 0 && !isRecording) {
                      setRecordingStartedAt(null)
                    }
                  }}
                  onTranscriptionChange={(transcript) => {
                    if (!transcript.trim()) return
                    setDraftText(transcript)
                  }}
                  onPermissionDenied={() => {
                    setVoiceErrorMessage('Microphone access blocked. Please allow microphone access and try again.')
                  }}
                />
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  {isVoiceProcessing ? <Loader2 className="size-3 animate-spin" /> : <Mic className="size-3" />}
                  <span>
                    {isRecording
                      ? `Recording ${formattedRecordingTime}`
                      : isVoiceProcessing
                        ? 'Transcribing'
                        : 'Ready'}
                  </span>
                </div>
                {showVoice ? (
                  <div className="ml-1 flex items-end gap-0.5" aria-hidden="true">
                    {waveformBars.map((heightScale, index) => (
                      <span
                        key={`voice-wave-${index}`}
                        className="w-1 rounded-full bg-text-tertiary/70 transition-all duration-100"
                        style={{
                          height: `${Math.round(6 + heightScale * 14)}px`,
                          opacity: isRecording ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        }
        actions={
          <ComposerActionsRow
            primaryActionIcon={presentation.primaryActionIcon}
            primaryActionLabel={presentation.primaryActionLabel}
            secondaryActionIcon={presentation.secondaryActionIcon}
            secondaryActionLabel={presentation.secondaryActionLabel}
            posture={presentation.posture}
            chatId={propChatId ?? null}
            noteId={propNoteId ?? null}
            navigate={navigate}
          />
        }
      />

      <NotePicker open={showNotePicker} onClose={handleCloseNotePicker} />
      {voiceErrorMessage ? <p className="mt-2 px-2 text-xs text-destructive">{voiceErrorMessage}</p> : null}
    </>
  )
}
