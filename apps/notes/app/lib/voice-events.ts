import type { VoiceErrorCode } from '@hominem/services'

type VoiceEventName =
  | 'voice_record_started'
  | 'voice_record_stopped'
  | 'voice_transcribe_requested'
  | 'voice_transcribe_succeeded'
  | 'voice_transcribe_failed'

interface VoiceEventPayload {
  platform: 'web' | 'mobile-ios'
  mimeType?: string
  sizeBytes?: number
  durationMs?: number
  errorCode?: VoiceErrorCode
}

export function emitVoiceEvent(event: VoiceEventName, payload: VoiceEventPayload) {
  console.info('[voice-event]', JSON.stringify({ event, ...payload }))
}
