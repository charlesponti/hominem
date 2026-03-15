import { beforeEach, describe, expect, it, vi } from 'vitest'

const { capture, captureException } = vi.hoisted(() => ({
  capture: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('../lib/posthog', () => ({
  posthog: {
    capture,
    captureException,
  },
}))

vi.mock('../utils/constants', () => ({
  API_BASE_URL: 'https://api.ponti.io',
  APP_VARIANT: 'preview',
}))

import { captureAuthAnalyticsEvent, captureAuthAnalyticsFailure } from '../utils/auth/auth-analytics'

describe('auth analytics', () => {
  beforeEach(() => {
    capture.mockReset()
    captureException.mockReset()
  })

  it('captures sanitized auth event properties', () => {
    captureAuthAnalyticsEvent('auth_email_otp_request_succeeded', {
      phase: 'email_otp_request',
      durationMs: 187,
      email: 'User@Example.com',
      statusCode: 200,
    })

    expect(capture).toHaveBeenCalledWith('auth_email_otp_request_succeeded', {
      apiBaseOrigin: 'https://api.ponti.io',
      appVariant: 'preview',
      durationMs: 187,
      emailDomain: 'example.com',
      errorMessage: null,
      errorName: null,
      failureStage: null,
      isTimeout: false,
      phase: 'email_otp_request',
      source: 'auth_provider',
      statusCode: 200,
    })
  })

  it('captures handled auth failures and flags timeouts', () => {
    const error = new Error('Request timed out. Please try again.')

    captureAuthAnalyticsFailure('auth_email_otp_request_failed', {
      phase: 'email_otp_request',
      durationMs: 12004,
      email: 'person@hominem.test',
      error,
      failureStage: 'network',
    })

    expect(capture).toHaveBeenCalledWith('auth_email_otp_request_failed', {
      apiBaseOrigin: 'https://api.ponti.io',
      appVariant: 'preview',
      durationMs: 12004,
      emailDomain: 'hominem.test',
      errorMessage: 'Request timed out. Please try again.',
      errorName: 'Error',
      failureStage: 'network',
      isTimeout: true,
      phase: 'email_otp_request',
      source: 'auth_provider',
      statusCode: null,
    })

    expect(captureException).toHaveBeenCalledWith(error, {
      apiBaseOrigin: 'https://api.ponti.io',
      appVariant: 'preview',
      durationMs: 12004,
      emailDomain: 'hominem.test',
      errorMessage: 'Request timed out. Please try again.',
      errorName: 'Error',
      failureStage: 'network',
      isTimeout: true,
      phase: 'email_otp_request',
      source: 'auth_provider',
      statusCode: null,
    })
  })
})