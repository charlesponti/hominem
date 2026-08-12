import { useCallback } from 'react';

import { captureAuthAnalyticsEvent, captureAuthAnalyticsFailure } from '~/services/auth/analytics';
import { authClient } from '~/services/auth/auth-client';

const OTP_REQUEST_TIMEOUT_MS = 12000;
const OTP_VERIFY_TIMEOUT_MS = 20000;

export function useEmailOtp() {
  const requestEmailOtp = useCallback(async (email: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OTP_REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();

    captureAuthAnalyticsEvent('auth_email_otp_request_started', {
      phase: 'email_otp_request',
      email,
    });

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
        fetchOptions: {
          signal: controller.signal,
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to send verification code.');
      }
    } catch (error) {
      const resolvedError =
        error instanceof Error && error.name === 'AbortError'
          ? new Error('Request timed out. Please try again.')
          : error instanceof Error
            ? error
            : new Error('Unable to send verification code.');
      captureAuthAnalyticsFailure('auth_email_otp_request_failed', {
        phase: 'email_otp_request',
        durationMs: Date.now() - startedAt,
        email,
        error: resolvedError,
        failureStage: 'network',
      });
      throw resolvedError;
    } finally {
      clearTimeout(timeoutId);
    }

    captureAuthAnalyticsEvent('auth_email_otp_request_succeeded', {
      phase: 'email_otp_request',
      durationMs: Date.now() - startedAt,
      email,
      statusCode: 200,
    });
  }, []);

  const verifyEmailOtp = useCallback(
    async (input: { email: string; otp: string; name?: string }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OTP_VERIFY_TIMEOUT_MS);
      const startedAt = Date.now();

      captureAuthAnalyticsEvent('auth_email_otp_verify_started', {
        phase: 'email_otp_verify',
        email: input.email,
      });

      try {
        const result = await authClient.signIn.emailOtp({
          email: input.email,
          otp: input.otp,
          ...(input.name ? { name: input.name } : {}),
          fetchOptions: {
            signal: controller.signal,
          },
        });

        if (result.error || !result.data?.user?.id) {
          throw new Error(result.error?.message ?? 'Verification failed. Please try again.');
        }

        captureAuthAnalyticsEvent('auth_email_otp_verify_succeeded', {
          phase: 'email_otp_verify',
          durationMs: Date.now() - startedAt,
          email: input.email,
          statusCode: 200,
        });
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Sign-in failed');
        captureAuthAnalyticsFailure('auth_email_otp_verify_failed', {
          phase: 'email_otp_verify',
          durationMs: Date.now() - startedAt,
          email: input.email,
          error: resolvedError,
          failureStage: 'unknown',
        });
        throw resolvedError;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [],
  );

  return { requestEmailOtp, verifyEmailOtp };
}
