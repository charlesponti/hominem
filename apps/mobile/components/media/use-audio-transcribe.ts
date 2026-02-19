import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import { captureException } from '@sentry/react-native'

import { useAuth } from '~/utils/auth-provider'
import { API_BASE_URL } from '~/utils/constants'
import { emitVoiceEvent } from '~/utils/voice-events'

type VoiceTranscribeResponse = {
  text: string
}

type VoiceTranscribeErrorResponse = {
  error?: string
  code?: string
}

function isVoiceErrorCode(code: string | undefined): code is 'INVALID_FORMAT' | 'TOO_LARGE' | 'AUTH' | 'QUOTA' | 'TRANSCRIBE_FAILED' {
  return code === 'INVALID_FORMAT' || code === 'TOO_LARGE' || code === 'AUTH' || code === 'QUOTA' || code === 'TRANSCRIBE_FAILED'
}

function getMimeTypeFromUri(uri: string): string {
  const normalized = uri.toLowerCase()
  if (normalized.endsWith('.mp3')) return 'audio/mpeg'
  if (normalized.endsWith('.mp4') || normalized.endsWith('.m4a')) return 'audio/mp4'
  if (normalized.endsWith('.wav')) return 'audio/wav'
  if (normalized.endsWith('.ogg')) return 'audio/ogg'
  return 'audio/webm'
}

export const useAudioTranscribe = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: string) => void
  onError?: () => void
} = {}) => {
  const { getAccessToken } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const mutation = useMutation<string, Error, string>({
    mutationFn: async (audioUri: string) => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      const token = await getAccessToken()
      if (!token) {
        throw new Error('Missing auth token for voice transcription')
      }

      const formData = new FormData()
      const mimeType = getMimeTypeFromUri(audioUri)

      formData.append('audio', {
        uri: audioUri,
        name: `recording-${Date.now()}.${mimeType.split('/')[1] || 'webm'}`,
        type: mimeType,
      } as unknown as Blob)

      emitVoiceEvent('voice_transcribe_requested', {
        platform: 'mobile-ios',
        mimeType,
      })

      const response = await fetch(`${API_BASE_URL}/api/mobile/voice/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as VoiceTranscribeErrorResponse
        emitVoiceEvent('voice_transcribe_failed', {
          platform: 'mobile-ios',
          mimeType,
          ...(isVoiceErrorCode(payload.code) ? { errorCode: payload.code } : {}),
        })
        throw new Error(payload.error || `Voice transcription failed (${response.status})`)
      }

      const data = (await response.json()) as VoiceTranscribeResponse
      emitVoiceEvent('voice_transcribe_succeeded', {
        platform: 'mobile-ios',
        mimeType,
      })
      return data.text
    },
    onSuccess,
    onError: (error) => {
      if (error.name === 'AbortError') return
      captureException(error)
      onError?.()
    },
  })

  return { ...mutation, cancel }
}
