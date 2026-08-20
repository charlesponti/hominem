import { useCallback, useState } from 'react';

import { normalizeEmail, normalizeOtp } from '~/services/auth/validation';
import t from '~/translations';

type EmailAuthOperations = {
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
};

export function useEmailAuth(ops: EmailAuthOperations) {
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
        setError(cause instanceof Error ? cause.message : t.auth.verify.authFailedError);
        if (opts.clearOtpOnError) setOtp('');
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  return {
    otp,
    setOtp,
    error,
    setError,
    isSubmitting,
    isResending,
    handleVerifyOtp: (email: string, otpOverride?: string) => {
      const resolvedEmail = normalizeEmail(email);
      const resolvedOtp = normalizeOtp(otpOverride ?? otp);
      if (!resolvedEmail || !resolvedOtp) {
        setError(
          !resolvedEmail ? t.auth.verify.emailRequiredError : t.auth.verify.codeRequiredError,
        );
        return Promise.resolve();
      }
      return run(() => ops.verifyOtp(resolvedEmail, resolvedOtp), { clearOtpOnError: true });
    },
    handleResendOtp: (email: string) => {
      const resolved = normalizeEmail(email);
      return resolved
        ? run(
            async () => {
              await ops.resendOtp(resolved);
              setOtp('');
            },
            { resending: true },
          )
        : (setError(t.auth.verify.emailRequiredError), Promise.resolve());
    },
  };
}
