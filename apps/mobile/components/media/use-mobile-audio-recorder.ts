import { captureException } from '@sentry/react-native'
import type { Audio } from 'expo-av'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useCallback, useMemo, useState } from 'react'

import { emitVoiceEvent } from '~/utils/voice-events'
import { useAudioTranscribe } from './use-audio-transcribe'

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

  const { mutateAsync: transcribeAudio, isPending: isTranscribing } = useAudioTranscribe({
    onSuccess: (data) => {
      onAudioTranscribed?.(data)
    },
    onError: () => {
      onError?.()
    },
  })

  const onRecordingStatusChange = useCallback((status: Audio.RecordingStatus) => {
    setRecordingStatus(status)
    const { metering } = status
    if (status.isRecording && metering !== undefined) {
      setMeterings((current) => [...current, metering])
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = await import('expo-av')
      activateKeepAwakeAsync().catch((error: Error) => captureException(error))

      const permission = await Audio.requestPermissionsAsync()
      if (permission.status !== 'granted') {
        onError?.()
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const nextRecording = new Audio.Recording()
      await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await nextRecording.startAsync()
      nextRecording.setOnRecordingStatusUpdate(onRecordingStatusChange)

      setRecording(nextRecording)
      setRecordingStatus(undefined)
      setMeterings([])
      emitVoiceEvent('voice_record_started', { platform: 'mobile-ios' })
    } catch (error) {
      captureException(error)
      onError?.()
    }
  }, [onError, onRecordingStatusChange])

  const clearRecording = useCallback(() => {
    setLastRecordingUri(null)
    setRecording(undefined)
    setRecordingStatus(undefined)
    setMeterings([])
  }, [])

  const runTranscription = useCallback(
    async (audioUri: string) => {
      const transcription = await transcribeAudio(audioUri)
      onAudioTranscribed?.(transcription)
      if (autoTranscribe) {
        clearRecording()
      }
    },
    [autoTranscribe, clearRecording, onAudioTranscribed, transcribeAudio],
  )

  const stopRecording = useCallback(async () => {
    if (!recording) {
      return
    }

    const durationMs = recordingStatus?.durationMillis

    await recording.stopAndUnloadAsync().catch((reason: Error) => {
      captureException(reason)
    })

    deactivateKeepAwake().catch((error: Error) => captureException(error))

    const fileUri = recording.getURI()

    setRecording(undefined)
    setRecordingStatus(undefined)
    setMeterings([])

    if (!fileUri) {
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

    onAudioReady?.(fileUri)
  }, [autoTranscribe, onAudioReady, recording, recordingStatus?.durationMillis, runTranscription])

  const retryTranscription = useCallback(async () => {
    if (!lastRecordingUri) {
      return
    }
    await runTranscription(lastRecordingUri)
  }, [lastRecordingUri, runTranscription])

  const isRecording = !!recordingStatus?.isRecording

  return {
    isRecording,
    isTranscribing,
    meterings,
    hasRetryRecording: !!lastRecordingUri,
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
