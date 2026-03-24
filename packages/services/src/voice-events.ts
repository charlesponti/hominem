export const VOICE_ERROR_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'AUTH',
  'QUOTA',
  'TRANSCRIBE_FAILED',
] as const

export type VoiceErrorCode = (typeof VOICE_ERROR_CODES)[number]

export function isVoiceErrorCode(code: string | undefined): code is VoiceErrorCode {
  return VOICE_ERROR_CODES.includes(code as VoiceErrorCode)
}

export const VOICE_TRANSPORTS = ['hono-rpc'] as const

export type VoiceTransport = (typeof VOICE_TRANSPORTS)[number]

export const VOICE_EVENTS = [
  'voice_record_started',
  'voice_record_stopped',
  'voice_transcribe_requested',
  'voice_transcribe_succeeded',
  'voice_transcribe_failed',
] as const

export type VoiceEventName = (typeof VOICE_EVENTS)[number]

export interface VoiceEventPayload {
  platform: 'web' | 'mobile-ios'
  mimeType?: string
  sizeBytes?: number
  durationMs?: number
  errorCode?: VoiceErrorCode
  provider?: string
  model?: string
  transport?: VoiceTransport
  streamMode?: 'stream' | 'request-response'
  stage?: 'request_prepare' | 'transport_send' | 'first_token' | 'complete'
}

interface PostHogClientLike {
  capture: (event: string, properties?: Record<string, string | number | boolean | null | undefined>) => void
}

function getBrowserPostHog(): PostHogClientLike | null {
  if (typeof globalThis === 'undefined') return null

  const maybeWindow = globalThis as { window?: { posthog?: PostHogClientLike } }
  return maybeWindow.window?.posthog ?? null
}

function toCaptureProperties(payload: VoiceEventPayload): Record<string, string | number | boolean | null | undefined> {
  return {
    platform: payload.platform,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    durationMs: payload.durationMs,
    errorCode: payload.errorCode,
    provider: payload.provider,
    model: payload.model,
    transport: payload.transport,
    streamMode: payload.streamMode,
    stage: payload.stage,
  }
}

export function emitVoiceEvent(event: VoiceEventName, payload: VoiceEventPayload) {
  const eventData = { event, ...payload }
  console.info('[voice-event]', JSON.stringify(eventData))

  const posthog = getBrowserPostHog()
  if (!posthog) return

  posthog.capture(event, toCaptureProperties(payload))
}
