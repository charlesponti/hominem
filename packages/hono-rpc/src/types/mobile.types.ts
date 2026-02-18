import type { VoiceErrorCode } from '@hominem/services'

export type MobileIntentSuggestion = {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  seed_prompt?: string
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
