import { useMutation } from '@tanstack/react-query'

import { captureException } from '@sentry/react-native'
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
}

const buildTask = (text: string): GeneratedTask => {
  const now = new Date().toISOString()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
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
  }
}

function deriveIntentsFromText(content: string): GeneratedIntentsResponse {
  const normalized = content.trim()
  if (!normalized) {
    return {
      output: 'No input detected.',
      chat: { output: 'Please enter text so I can help.' },
    }
  }

  if (normalized.toLowerCase().startsWith('search ')) {
    const keyword = normalized.replace(/^search\s+/i, '')
    return {
      output: `Showing cached matches for "${keyword}"`,
      search: {
        input: { keyword },
        output: [buildTask(`Review results for ${keyword}`)],
      },
    }
  }

  return {
    output: 'Created a focus item.',
    create: {
      output: [buildTask(normalized)],
    },
  }
}

export const useGetUserIntent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: GeneratedIntentsResponse) => void
  onError?: (error: Error) => void
}) => {
  const { mutateAsync: transcribeAudio } = useAudioTranscribe()

  const audioIntentMutation = useMutation<GeneratedIntentsResponse, Error, string>({
    mutationFn: async (audioUri: string) => {
      const transcription = await transcribeAudio(audioUri)
      return deriveIntentsFromText(transcription)
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.(error)
    },
  })

  const textIntentMutation = useMutation<GeneratedIntentsResponse, Error, string>({
    mutationFn: async (content: string) => deriveIntentsFromText(content),
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.(error)
    },
  })

  return { audioIntentMutation, textIntentMutation }
}
