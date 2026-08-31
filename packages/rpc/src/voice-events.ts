export const VOICE_ERROR_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'AUTH',
  'QUOTA',
  'TRANSCRIBE_FAILED',
] as const;

export type VoiceErrorCode = (typeof VOICE_ERROR_CODES)[number];

export function isVoiceErrorCode(code: string | undefined): code is VoiceErrorCode {
  return typeof code === 'string' && (VOICE_ERROR_CODES as readonly string[]).includes(code);
}

export const VOICE_TRANSPORTS = ['hono-rpc'] as const;

export type VoiceTransport = (typeof VOICE_TRANSPORTS)[number];

export const VOICE_EVENTS = [
  'voice_record_started',
  'voice_record_stopped',
  'voice_record_discarded',
  'voice_transcribe_requested',
  'voice_transcribe_succeeded',
  'voice_transcribe_failed',
] as const;

export type VoiceEventName = (typeof VOICE_EVENTS)[number];

export const VOICE_DISCARD_REASONS = ['user-cancelled', 'unmounted', 'navigated-away'] as const;

export type VoiceDiscardReason = (typeof VOICE_DISCARD_REASONS)[number];

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
  reason?: VoiceDiscardReason;
}

/**
 * PostHog analytics integration for voice events.
 * NOTE: This couples the RPC client to PostHog. Consider moving to a dedicated
 * @hominem/analytics package if other domains need event emission.
 */
interface PostHogClientLike {
  capture: (
    event: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => void;
}

function getBrowserPostHog(): PostHogClientLike | null {
  if (typeof globalThis === 'undefined') return null;

  const maybeWindow = globalThis as { window?: { posthog?: PostHogClientLike } };
  return maybeWindow.window?.posthog ?? null;
}

function toCaptureProperties(
  payload: VoiceEventPayload,
): Record<string, string | number | boolean | null | undefined> {
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
    reason: payload.reason,
  };
}

export function emitVoiceEvent(event: VoiceEventName, payload: VoiceEventPayload) {
  const eventData = { event, ...payload };
  console.info('[voice-event]', JSON.stringify(eventData));

  const posthog = getBrowserPostHog();
  if (!posthog) return;

  posthog.capture(event, toCaptureProperties(payload));
}
