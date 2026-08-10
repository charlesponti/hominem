import { normalizeEmail, normalizeOtp } from '@ponti-studios/auth/shared/validation';
import { useCallback, useState } from 'react';

type EmailAuthOperations = {
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
};

export function useEmailAuth(ops: EmailAuthOperations) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const run = useCallback(
    async (
      action: () => Promise<void>,
      opts: { resending?: boolean; clearOtpOnError?: boolean } = {},
    ) => {
      const setBusy = opts.resending ? setIsResending : setIsSubmitting;
      try {
        setBusy(true);
        setError(null);
        await action();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.');
        if (opts.clearOtpOnError) setOtp('');
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  return {
    email,
    setEmail,
    otp,
    setOtp,
    error,
    setError,
    isSubmitting,
    isResending,
    handleSendOtp: (emailOverride?: string) => {
      const resolved = normalizeEmail(emailOverride ?? email);
      return resolved
        ? run(() => ops.sendOtp(resolved))
        : (setError('Email is required'), Promise.resolve());
    },
    handleVerifyOtp: (emailOverride?: string, otpOverride?: string) => {
      const resolvedEmail = normalizeEmail(emailOverride ?? email);
      const resolvedOtp = normalizeOtp(otpOverride ?? otp);
      if (!resolvedEmail || !resolvedOtp) {
        setError(!resolvedEmail ? 'Email is required' : 'Verification code is required');
        return Promise.resolve();
      }
      return run(() => ops.verifyOtp(resolvedEmail, resolvedOtp), { clearOtpOnError: true });
    },
    handleResendOtp: (emailOverride?: string) => {
      const resolved = normalizeEmail(emailOverride ?? email);
      return resolved
        ? run(
            async () => {
              await ops.resendOtp(resolved);
              setOtp('');
            },
            { resending: true },
          )
        : (setError('Email is required'), Promise.resolve());
    },
  };
}
