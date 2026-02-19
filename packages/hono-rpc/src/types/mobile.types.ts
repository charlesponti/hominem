import type { VoiceErrorCode } from '@hominem/services'

export type MobileIntentSuggestion = {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  seed_prompt?: string
}

export type MobileDerivedTask = {
  id: string
  text: string
  category: string
  due_date: string | null
  priority: number
  sentiment: string
  task_size: string
  type: string
  state: 'backlog' | 'active' | 'completed' | 'deleted'
  profile_id: string
  created_at: string
  updated_at: string
}

export type MobileIntentDeriveOutputV1 = {
  version: 'v1'
  output: string
  create?: {
    output: MobileDerivedTask[]
  }
  search?: {
    input: {
      keyword: string
    }
    output: MobileDerivedTask[]
  }
  chat?: {
    output: string
  }
  fallback_reason?: string
}

export type MobileVoiceTranscriptionOutput = {
  text: string
  language?: string
  duration?: number
  words?: unknown[]
  segments?: unknown[]
}

export type MobileIntentSuggestionsOutput = {
  suggestions: MobileIntentSuggestion[]
}

export type MobileVoiceTranscriptionErrorOutput = {
  error: string
  code: VoiceErrorCode
}
