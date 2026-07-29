import { normalizeEmail } from '@ponti-studios/auth/shared/validation';

import { API_BASE_URL, APP_ENV, RELEASE_CHANNEL } from '~/constants';
import { posthog } from '~/services/posthog';

type AuthAnalyticsPhase =
  | 'boot'
  | 'email_otp_request'
  | 'email_otp_verify'
  | 'sign_out'
  | 'session_recovery';

interface AuthAnalyticsContext {
  phase: AuthAnalyticsPhase;
  durationMs?: number;
  email?: string | null;
  error?: Error;
  failureStage?: 'network' | 'response' | 'validation' | 'storage' | 'unknown';
  source?: 'auth_provider';
  statusCode?: number;
}

interface AuthEventLogEntry {
  event: string;
  phase: string;
  timestamp: number;
  durationMs: number | null;
}

const events: AuthEventLogEntry[] = [];
const phaseStartTimes = new Map<string, number>();

function getApiBaseOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

function getEmailDomain(email?: string | null) {
  if (!email) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return null;
  }

  return normalizedEmail.slice(atIndex + 1);
}

function buildAuthAnalyticsProperties(context: AuthAnalyticsContext) {
  return {
    apiBaseOrigin: getApiBaseOrigin(),
    appEnvironment: APP_ENV,
    durationMs: context.durationMs ?? null,
    emailDomain: getEmailDomain(context.email),
    errorMessage: context.error?.message ?? null,
    errorName: context.error?.name ?? null,
    failureStage: context.failureStage ?? null,
    isTimeout:
      context.error?.name === 'AbortError' || context.error?.message.includes('timed out') === true,
    phase: context.phase,
    releaseChannel: RELEASE_CHANNEL,
    source: context.source ?? 'auth_provider',
    statusCode: context.statusCode ?? null,
  };
}

export function captureAuthAnalyticsEvent(event: string, context: AuthAnalyticsContext) {
  const properties = buildAuthAnalyticsProperties(context);
  posthog.capture(event, properties);
}

export function captureAuthAnalyticsFailure(event: string, context: AuthAnalyticsContext) {
  const properties = buildAuthAnalyticsProperties(context);
  posthog.capture(event, properties);

  if (context.error) {
    posthog.captureException(context.error, properties);
  }
}

export function recordAuthEvent(
  event: string,
  phase: string,
  nowMs: number = Date.now(),
): AuthEventLogEntry {
  const phaseStart = phaseStartTimes.get(phase);
  const durationMs = phaseStart !== undefined ? nowMs - phaseStart : null;

  const entry: AuthEventLogEntry = { event, phase, timestamp: nowMs, durationMs };
  events.push(entry);
  return entry;
}

export function markAuthPhaseStart(phase: string, nowMs: number = Date.now()): void {
  phaseStartTimes.set(phase, nowMs);
}
