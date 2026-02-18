import { Button } from '@hominem/ui/button'
import { Loader2, MicIcon, SquareIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { emitVoiceEvent } from '~/lib/voice-events'

type SpeechInputMode = 'media-recorder' | 'none'

export type SpeechInputProps = ComponentProps<typeof Button> & {
  onTranscriptionChange?: (text: string) => void
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>
}

const detectSpeechInputMode = (): SpeechInputMode => {
  if (typeof window === 'undefined') {
    return 'none'
  }

  if ('MediaRecorder' in window && 'mediaDevices' in navigator) {
    return 'media-recorder'
  }

  return 'none'
}

export const SpeechInput = ({
  onTranscriptionChange,
  onAudioRecorded,
  className,
  ...props
}: SpeechInputProps) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode] = useState<SpeechInputMode>(detectSpeechInputMode)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  const startMediaRecorder = useCallback(async () => {
    if (!onAudioRecorded) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      audioChunksRef.current = []

      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      const handleStop = async () => {
        for (const track of stream.getTracks()) {
          track.stop()
        }
        streamRef.current = null

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus',
        })

        if (audioBlob.size > 0) {
          setIsProcessing(true)
          try {
            const transcript = await onAudioRecorded(audioBlob)
            if (transcript) {
              onTranscriptionChange?.(transcript)
            }
          } finally {
            setIsProcessing(false)
          }
        }
      }

      const handleError = () => {
        setIsListening(false)
        for (const track of stream.getTracks()) {
          track.stop()
        }
        streamRef.current = null
      }

      mediaRecorder.addEventListener('dataavailable', handleDataAvailable)
      mediaRecorder.addEventListener('stop', handleStop)
      mediaRecorder.addEventListener('error', handleError)

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      recordingStartedAtRef.current = Date.now()
      setIsListening(true)
      emitVoiceEvent('voice_record_started', { platform: 'web' })
    } catch {
      setIsListening(false)
    }
  }, [onAudioRecorded, onTranscriptionChange])

  const stopMediaRecorder = useCallback(() => {
    const durationMs = recordingStartedAtRef.current
      ? Date.now() - recordingStartedAtRef.current
      : undefined
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    emitVoiceEvent('voice_record_stopped', {
      platform: 'web',
      ...(typeof durationMs === 'number' ? { durationMs } : {}),
    })
    recordingStartedAtRef.current = null
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (mode !== 'media-recorder') {
      return
    }
    if (isListening) {
      stopMediaRecorder()
      return
    }
    void startMediaRecorder()
  }, [isListening, mode, startMediaRecorder, stopMediaRecorder])

  return (
    <Button
      className={className}
      disabled={mode === 'none' || !onAudioRecorded || isProcessing}
      onClick={toggleListening}
      variant={isListening ? 'destructive' : 'outline'}
      {...props}
    >
      {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
      {!isProcessing && isListening ? <SquareIcon className="size-4" /> : null}
      {!isProcessing && !isListening ? <MicIcon className="size-4" /> : null}
    </Button>
  )
}
