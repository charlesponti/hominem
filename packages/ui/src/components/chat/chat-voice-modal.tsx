import { emitVoiceEvent, isVoiceErrorCode, type VoiceErrorCode } from '@hominem/services/voice-events'
import type { UseMutationResult } from '@tanstack/react-query'
import { useCallback } from 'react'
import { X } from 'lucide-react'

import { Button } from '../ui/button'
import { Inline } from '../layout'
import { SpeechInput } from '../ai-elements'

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
}

export interface ChatVoiceModalProps {
  show: boolean
  onClose: () => void
  onTranscribed: (transcript: string) => void
  transcribeMutation: UseMutationResult<TranscribeResult, Error, TranscribeVariables>
}

export function ChatVoiceModal({ 
  show, 
  onClose, 
  onTranscribed,
  transcribeMutation 
}: ChatVoiceModalProps) {
  const { mutateAsync, error } = transcribeMutation

  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    emitVoiceEvent('voice_transcribe_requested', {
      platform: 'web',
      mimeType: audioBlob.type,
      sizeBytes: audioBlob.size,
    })

    try {
      const result = await mutateAsync({ audioBlob })
      
      emitVoiceEvent('voice_transcribe_succeeded', {
        platform: 'web',
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
      })
      
      return result.text
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
      const errorCode = err instanceof Error && 'code' in err 
        ? (err as Error & { code?: string }).code 
        : undefined
      
      // Only emit error code if it's a valid VoiceErrorCode
      if (errorCode && isVoiceErrorCode(errorCode)) {
        emitVoiceEvent('voice_transcribe_failed', {
          platform: 'web',
          mimeType: audioBlob.type,
          sizeBytes: audioBlob.size,
          errorCode: errorCode as VoiceErrorCode,
        })
      } else {
        emitVoiceEvent('voice_transcribe_failed', {
          platform: 'web',
          mimeType: audioBlob.type,
          sizeBytes: audioBlob.size,
        })
      }
      
      throw new Error(errorMessage)
    }
  }, [mutateAsync])

  const handleVoiceTranscription = useCallback((transcript: string) => {
    if (!transcript.trim()) return
    try {
      onTranscribed(transcript.trim())
    } catch {
      // Error handling is done via mutation error state
    }
  }, [onTranscribed])

  if (!show) return null

  const errorMessage = error instanceof Error ? error.message : null

  return (
    <div role="dialog" aria-modal="true" aria-label="Voice input" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 border bg-background p-6">
        <Inline justify="between">
          <h3 className="text-lg font-semibold" id="voice-dialog-title">
            Record Audio
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close voice input">
            <X className="size-4" />
          </Button>
        </Inline>
        <p className="text-sm text-muted-foreground">
          Tap to record, tap again to stop. The transcript will appear in the message input.
        </p>
        <Inline gap="sm">
          <SpeechInput
            aria-label="Record audio message"
            onAudioRecorded={transcribeAudioBlob}
            onTranscriptionChange={handleVoiceTranscription}
          />
        </Inline>
        {errorMessage ? <p className="text-sm text-destructive" role="alert">{errorMessage}</p> : null}
      </div>
    </div>
  )
}
