import { captureException } from '@sentry/react-native'
import type { Audio } from 'expo-av'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { emitVoiceEvent } from '~/utils/voice-events'
import { useAudioTranscribe } from './use-audio-transcribe'

const MAX_METERINGS = 100

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
  const [recording, setRecording] = useState<Audio.Recording>()
  const [recordingStatus, setRecordingStatus] = useState<Audio.RecordingStatus>()
  const [meterings, setMeterings] = useState<number[]>([])
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null)
  const [recorderState, setRecorderState] = useState<RecorderState>('IDLE')

  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {})
        deactivateKeepAwake().catch(() => {})
      }
      abortControllerRef.current?.abort()
    }
  }, [recording])

  const { mutateAsync: transcribeAudio, isPending: isTranscribing } = useAudioTranscribe({
    onSuccess: (data) => {
      onAudioTranscribed?.(data)
    },
    onError: () => {
      onError?.()
    },
  })

  const onRecordingStatusChange = useCallback((status: Audio.RecordingStatus) => {
    if (!isMountedRef.current) return
    setRecordingStatus(status)
    const { metering } = status
    if (status.isRecording && metering !== undefined) {
      setMeterings((current) => {
        const next = [...current, metering]
        return next.slice(-MAX_METERINGS)
      })
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (recorderState !== 'IDLE') return

    try {
      setRecorderState('REQUESTING_PERMISSION')
      const { Audio } = await import('expo-av')
      activateKeepAwakeAsync().catch((error: Error) => captureException(error))

      const permission = await Audio.requestPermissionsAsync()
      if (permission.status !== 'granted') {
        if (isMountedRef.current) setRecorderState('IDLE')
        onError?.()
        return
      }

      if (!isMountedRef.current) return
      setRecorderState('PREPARING')

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const nextRecording = new Audio.Recording()
      await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await nextRecording.startAsync()
      nextRecording.setOnRecordingStatusUpdate(onRecordingStatusChange)

      if (!isMountedRef.current) {
        await nextRecording.stopAndUnloadAsync().catch(() => {})
        return
      }

      setRecording(nextRecording)
      setRecordingStatus(undefined)
      setMeterings([])
      setRecorderState('RECORDING')
      emitVoiceEvent('voice_record_started', { platform: 'mobile-ios' })
    } catch (error) {
      captureException(error)
      if (isMountedRef.current) setRecorderState('IDLE')
      onError?.()
    }
  }, [onError, onRecordingStatusChange, recorderState])

  const clearRecording = useCallback(() => {
    setLastRecordingUri(null)
    setRecording(undefined)
    setRecordingStatus(undefined)
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

  const stopRecording = useCallback(async () => {
    if (!recording || recorderState === 'STOPPING') {
      return
    }

    setRecorderState('STOPPING')
    const durationMs = recordingStatus?.durationMillis

    await recording.stopAndUnloadAsync().catch((reason: Error) => {
      captureException(reason)
    })

    deactivateKeepAwake().catch((error: Error) => captureException(error))

    if (!isMountedRef.current) return

    const fileUri = recording.getURI()

    setRecording(undefined)
    setRecordingStatus(undefined)
    setMeterings([])

    if (!fileUri) {
      setRecorderState('IDLE')
      return
    }

    setLastRecordingUri(fileUri)
    emitVoiceEvent('voice_record_stopped', {
      platform: 'mobile-ios',
      ...(typeof durationMs === 'number' ? { durationMs } : {}),
    })

    if (autoTranscribe) {
      await runTranscription(fileUri)
      return
    }

    setRecorderState('IDLE')
    onAudioReady?.(fileUri)
  }, [autoTranscribe, onAudioReady, recording, recordingStatus?.durationMillis, runTranscription, recorderState])

  const retryTranscription = useCallback(async () => {
    if (!lastRecordingUri) {
      return
    }
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
    onRecordingStatusChange,
    buttonAction: useMemo(
      () => ({
        onPress: isRecording ? stopRecording : startRecording,
      }),
      [isRecording, startRecording, stopRecording],
    ),
  }
}
