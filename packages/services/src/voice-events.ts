export const VOICE_ERROR_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'AUTH',
  'QUOTA',
  'TRANSCRIBE_FAILED',
] as const;

export type VoiceErrorCode = (typeof VOICE_ERROR_CODES)[number];

export const VOICE_TRANSPORTS = ['hono-rpc'] as const;

export type VoiceTransport = (typeof VOICE_TRANSPORTS)[number];

export const VOICE_EVENTS = [
  'voice_record_started',
  'voice_record_stopped',
  'voice_transcribe_requested',
  'voice_transcribe_succeeded',
  'voice_transcribe_failed',
] as const;

export type VoiceEventName = (typeof VOICE_EVENTS)[number];

export interface VoiceEventPayload {
  platform: 'web' | 'mobile-ios';
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  errorCode?: VoiceErrorCode;
  provider?: string;
  model?: string;
  transport?: VoiceTransport;
  streamMode?: 'stream' | 'request-response';
  stage?: 'request_prepare' | 'transport_send' | 'first_token' | 'complete';
}

export function emitVoiceEvent(event: VoiceEventName, payload: VoiceEventPayload) {
  console.info('[voice-event]', JSON.stringify({ event, ...payload }));
}