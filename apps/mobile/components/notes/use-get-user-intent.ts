import { useMutation } from '@tanstack/react-query'

import { captureException } from '@sentry/react-native'
import { useHonoClient } from '@hominem/hono-client/react'
import type { MobileIntentDeriveOutputV1 } from '@hominem/hono-rpc/types/mobile.types'
import { useAudioTranscribe } from '../media/use-audio-transcribe'

export type GeneratedTask = {
  id: string
  text: string
  category?: string
  due_date?: string | null
  priority?: number
  sentiment?: string
  task_size?: string
  type?: string
  state?: 'backlog' | 'active' | 'completed' | 'deleted'
  profile_id?: string
  created_at?: string
  updated_at?: string
}

export type GeneratedIntentsResponse = {
  version: 'v1'
  output: string
  create?: {
    output: GeneratedTask[]
  }
  search?: {
    input: {
      keyword: string
    }
    output: GeneratedTask[]
  }
  chat?: {
    output: string
  }
  fallback_reason?: string
}

function deriveFallback(content: string): GeneratedIntentsResponse {
  const normalized = content.trim()
  const now = new Date().toISOString()

  if (!normalized) {
    return {
      version: 'v1',
      output: 'No input detected.',
      chat: { output: 'Please enter text so I can help.' },
      fallback_reason: 'empty_input',
    }
  }

  return {
    version: 'v1',
    output: 'Created a focus item.',
    create: {
      output: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: normalized,
          category: 'task',
          due_date: null,
          priority: 0,
          sentiment: 'neutral',
          task_size: 'medium',
          type: 'task',
          state: 'active',
          profile_id: '',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    fallback_reason: 'derive_endpoint_failure',
  }
}

export const useGetUserIntent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: GeneratedIntentsResponse) => void
  onError?: (error: Error) => void
}) => {
  const client = useHonoClient()
  const { mutateAsync: transcribeAudio } = useAudioTranscribe()

  const deriveFromText = async (content: string): Promise<GeneratedIntentsResponse> => {
    try {
      const response = await client.api.mobile.intents.derive.$post({
        json: { content },
      })

      if (!response.ok) {
        return deriveFallback(content)
      }

      const payload = (await response.json()) as MobileIntentDeriveOutputV1
      return payload
    } catch {
      return deriveFallback(content)
    }
  }

  const audioIntentMutation = useMutation<GeneratedIntentsResponse, Error, string>({
    mutationFn: async (audioUri: string) => {
      const transcription = await transcribeAudio(audioUri)
      return deriveFromText(transcription)
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.(error)
    },
  })

  const textIntentMutation = useMutation<GeneratedIntentsResponse, Error, string>({
    mutationFn: async (content: string) => deriveFromText(content),
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.(error)
    },
  })

  return { audioIntentMutation, textIntentMutation }
}
