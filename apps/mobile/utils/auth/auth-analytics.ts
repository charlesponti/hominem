import { posthog } from '~/lib/posthog';
import { API_BASE_URL, APP_VARIANT } from '~/utils/constants';

type AuthAnalyticsPhase =
  | 'boot'
  | 'email_otp_request'
  | 'email_otp_verify'
  | 'passkey_sign_in'
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

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return null;
  }

  return normalizedEmail.slice(atIndex + 1);
}

function buildAuthAnalyticsProperties(context: AuthAnalyticsContext) {
  return {
    apiBaseOrigin: getApiBaseOrigin(),
    appVariant: APP_VARIANT,
    durationMs: context.durationMs ?? null,
    emailDomain: getEmailDomain(context.email),
    errorMessage: context.error?.message ?? null,
    errorName: context.error?.name ?? null,
    failureStage: context.failureStage ?? null,
    isTimeout: context.error?.name === 'AbortError' || context.error?.message.includes('timed out') === true,
    phase: context.phase,
    source: context.source ?? 'auth_provider',
    statusCode: context.statusCode ?? null,
  };
}

export function captureAuthAnalyticsEvent(event: string, context: AuthAnalyticsContext) {
  posthog.capture(event, buildAuthAnalyticsProperties(context));
}

export function captureAuthAnalyticsFailure(event: string, context: AuthAnalyticsContext) {
  const properties = buildAuthAnalyticsProperties(context);
  posthog.capture(event, properties);

  if (context.error) {
    posthog.captureException(context.error, properties);
  }
}