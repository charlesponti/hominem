import { resolveAuthRedirect } from '@ponti-studios/auth/shared/redirect-policy';
import { normalizeEmail, normalizeOtp } from '@ponti-studios/auth/shared/validation';
import { useMemo, useState } from 'react';

import { authClient } from './auth-client';

export function useEmailOtpAuthRoute(input: {
  allowedRedirectPrefixes: readonly string[];
  defaultRedirect: string;
  onNavigate: (to: string) => void;
  search: string;
}) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const postAuthRedirect = useMemo(() => {
    const next = new URLSearchParams(input.search).get('next');
    return resolveAuthRedirect(next, input.defaultRedirect, input.allowedRedirectPrefixes)
      .safeRedirect;
  }, [input.allowedRedirectPrefixes, input.defaultRedirect, input.search]);
  const request = async (value: string, resending = false) => {
    const setBusy = resending ? setIsResending : setIsSubmitting;
    try {
      setBusy(true);
      setError(null);
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: value,
        type: 'sign-in',
      });
      if (result.error) throw new Error(result.error.message ?? 'Failed to send verification code');
      setStep('otp');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to send verification code');
    } finally {
      setBusy(false);
    }
  };
  return {
    email,
    otp,
    error,
    isSubmitting,
    isResending,
    step,
    changeEmail: () => setStep('email'),
    handleEmailChange: (value: string) => {
      setEmail(value);
      setError(null);
    },
    handleOtpChange: (value: string) => {
      setOtp(value);
      setError(null);
    },
    handleSendOtp: async () => {
      const value = normalizeEmail(email);
      if (!value) return setError('Email is required');
      await request(value);
    },
    handleResendOtp: async () => {
      const value = normalizeEmail(email);
      if (!value) return setError('Email is required');
      await request(value, true);
      setOtp('');
    },
    handleVerifyOtp: async () => {
      const resolvedEmail = normalizeEmail(email);
      const resolvedOtp = normalizeOtp(otp);
      if (!resolvedEmail || !resolvedOtp)
        return setError(!resolvedEmail ? 'Email is required' : 'Verification code is required');
      try {
        setIsSubmitting(true);
        setError(null);
        const result = await authClient.signIn.emailOtp({ email: resolvedEmail, otp: resolvedOtp });
        if (result.error || !result.data?.user?.id)
          throw new Error(
            result.error?.message ?? 'Verification failed. Please check your code and try again.',
          );
        input.onNavigate(postAuthRedirect);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Verification failed. Please check your code and try again.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  };
}
