type VoiceErrorCode = 'INVALID_FORMAT' | 'TOO_LARGE' | 'AUTH' | 'QUOTA' | 'TRANSCRIBE_FAILED'

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
  provider?: string
  model?: string
  transport?: 'hono-rpc' | 'notes-route' | 'mobile-ai-sdk' | 'web-ai-sdk'
  streamMode?: 'stream' | 'request-response'
  stage?: 'request_prepare' | 'transport_send' | 'first_token' | 'complete'
}

export function emitVoiceEvent(event: VoiceEventName, payload: VoiceEventPayload) {
  console.info('[voice-event]', JSON.stringify({ event, ...payload }))
}
