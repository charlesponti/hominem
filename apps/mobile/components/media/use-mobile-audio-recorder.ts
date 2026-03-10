import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { emitVoiceEvent } from '~/utils/voice-events'
import { useAudioTranscribe } from './use-audio-transcribe'

type RecorderState = 'IDLE' | 'REQUESTING_PERMISSION' | 'PREPARING' | 'RECORDING' | 'STOPPING' | 'TRANSCRIBING'

interface UseMobileAudioRecorderProps {
  autoTranscribe?: boolean
  onAudioReady?: (audioUri: string) => void
  onAudioTranscribed?: (transcription: string) => void
  onError?: () => void
}

export function useMobileAudioRecorder({
  autoTranscribe = false,
  onAudioReady,
  onAudioTranscribed,
  onError,
}: UseMobileAudioRecorderProps = {}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [meterings, setMeterings] = useState<number[]>([])
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null)
  const [recorderState, setRecorderState] = useState<RecorderState>('IDLE')

  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (recorder.isRecording) {
        recorder.stop().catch(() => {})
        deactivateKeepAwake().catch(() => {})
      }
      abortControllerRef.current?.abort()
    }
  }, [recorder])

  const { mutateAsync: transcribeAudio } = useAudioTranscribe({
    onSuccess: (data) => {
      onAudioTranscribed?.(data)
    },
    onError: () => {
      onError?.()
    },
  })

  const clearRecording = useCallback(() => {
    setLastRecordingUri(null)
    setMeterings([])
    setRecorderState('IDLE')
  }, [])

  const runTranscription = useCallback(
    async (audioUri: string) => {
      if (!isMountedRef.current) return

      abortControllerRef.current = new AbortController()

      try {
        setRecorderState('TRANSCRIBING')
        const transcription = await transcribeAudio(audioUri)

        if (!isMountedRef.current) return

        onAudioTranscribed?.(transcription)
        if (autoTranscribe) {
          clearRecording()
        }
      } catch {
        if (isMountedRef.current) {
          setRecorderState('IDLE')
          onError?.()
        }
      }
    },
    [autoTranscribe, clearRecording, onAudioTranscribed, transcribeAudio, onError],
  )

  const startRecording = useCallback(async () => {
    if (recorderState !== 'IDLE') return

    try {
      setRecorderState('REQUESTING_PERMISSION')

      const permission = await AudioModule.requestRecordingPermissionsAsync()
      if (!permission.granted) {
        if (isMountedRef.current) setRecorderState('IDLE')
        onError?.()
        return
      }

      if (!isMountedRef.current) return
      setRecorderState('PREPARING')

      activateKeepAwakeAsync().catch((error: Error) =>
        console.error('[audio-recorder] keep-awake activation failed', error),
      )

      await recorder.prepareToRecordAsync()

      if (!isMountedRef.current) {
        await recorder.stop().catch(() => {})
        return
      }

      recorder.record()
      setMeterings([])
      setRecorderState('RECORDING')
      emitVoiceEvent('voice_record_started', { platform: 'mobile-ios' })
    } catch (error) {
      console.error('[audio-recorder] start failed', error)
      if (isMountedRef.current) setRecorderState('IDLE')
      onError?.()
    }
  }, [onError, recorderState, recorder])

  const stopRecording = useCallback(async () => {
    if (!recorder.isRecording || recorderState === 'STOPPING') return

    setRecorderState('STOPPING')

    await recorder.stop().catch((reason: Error) => {
      console.error('[audio-recorder] stop failed', reason)
    })

    deactivateKeepAwake().catch((error: Error) =>
      console.error('[audio-recorder] keep-awake deactivation failed', error),
    )

    if (!isMountedRef.current) return

    const fileUri = recorder.uri

    setMeterings([])

    if (!fileUri) {
      setRecorderState('IDLE')
      return
    }

    setLastRecordingUri(fileUri)
    emitVoiceEvent('voice_record_stopped', { platform: 'mobile-ios' })

    if (autoTranscribe) {
      await runTranscription(fileUri)
      return
    }

    setRecorderState('IDLE')
    onAudioReady?.(fileUri)
  }, [autoTranscribe, onAudioReady, recorder, runTranscription, recorderState])

  const retryTranscription = useCallback(async () => {
    if (!lastRecordingUri) return
    await runTranscription(lastRecordingUri)
  }, [lastRecordingUri, runTranscription])

  const isRecording = recorderState === 'RECORDING'

  return {
    isRecording,
    isTranscribing: recorderState === 'TRANSCRIBING',
    meterings,
    hasRetryRecording: !!lastRecordingUri,
    recorderState,
    startRecording,
    stopRecording,
    retryTranscription,
    clearRecording,
    onRecordingStatusChange: undefined,
    buttonAction: useMemo(
      () => ({
        onPress: isRecording ? stopRecording : startRecording,
      }),
      [isRecording, startRecording, stopRecording],
    ),
  }
}
