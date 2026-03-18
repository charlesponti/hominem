import { parseAuthError } from '@hominem/utils';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Form, useFetcher, useNavigation, useSearchParams } from 'react-router';

import { useCountdown } from '../../hooks/use-countdown';
import { Button } from '../ui/button';
import { AuthErrorBanner } from './auth-error-banner';
import { OtpCodeInput } from './otp-code-input';
import { PasskeyButton } from './passkey-button';

interface OtpVerificationFormProps {
  action: string;
  sendAction?: string;
  email: string;
  defaultNext?: string;
  error?: string | undefined;
  onChangeEmail?: () => void;
  onPasskeyClick?: () => void;
  loadingMessage?: string;
  className?: string;
  maxAttempts?: number;
  resendCooldown?: number;
  expiresAt?: number;
}

export function OtpVerificationForm({
  action,
  sendAction = '/auth',
  email,
  defaultNext = '/finance',
  error,
  onChangeEmail,
  onPasskeyClick,
  loadingMessage = 'Verifying...',
  className,
  maxAttempts = 5,
  resendCooldown = 30,
  expiresAt,
}: OtpVerificationFormProps) {
  const navigation = useNavigation();
  const resendFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === 'submitting' && navigation.formAction === action;

  const [otp, setOtp] = useState('');
  const [expirationCountdown, setExpirationCountdown] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hadPendingSubmissionRef = useRef(false);

  // Use countdown hook for resend timer
  const resendTimer = useCountdown(resendCooldown);

  const resolvedEmail = searchParams.get('email') ?? email;
  const next = searchParams.get('next') ?? defaultNext;
  const maskedEmail = resolvedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  // Parse error into semantic type
  const parsedError = parseAuthError(error, 'otp');
  const errorsRemaining = Math.max(0, maxAttempts - attemptCount);
  const isAccountLocked = attemptCount >= maxAttempts;

  // Track submission success
  useEffect(() => {
    if (navigation.state === 'idle' && isSubmitting) {
      if (!error) {
        setIsSuccess(true);
      }
    }
  }, [navigation.state, isSubmitting, error]);

  useEffect(() => {
    if (isSubmitting) {
      hadPendingSubmissionRef.current = true;
      return;
    }

    if (!hadPendingSubmissionRef.current) {
      return;
    }

    hadPendingSubmissionRef.current = false;

    if (error && attemptCount < maxAttempts) {
      setAttemptCount((prev) => prev + 1);
    }
  }, [attemptCount, error, isSubmitting, maxAttempts]);

  useEffect(() => {
    if (!error) {
      hadPendingSubmissionRef.current = false;
    }
  }, [error]);

  // Expiration countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setExpirationCountdown(null);
        if (interval) clearInterval(interval);
        return;
      }

      const seconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setExpirationCountdown(`${minutes}:${secs.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expiresAt]);

  // Auto-submit when code is complete
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value);
  }, []);

  const handleOtpComplete = useCallback(
    (completeValue: string) => {
      if (!isSubmitting && !isAccountLocked && !isSuccess) {
        setOtp(completeValue);
        // Use setTimeout to allow the state update to flush before submitting
        setTimeout(() => formRef.current?.requestSubmit(), 0);
      }
    },
    [isSubmitting, isAccountLocked, isSuccess],
  );

  // Resend is via fetcher since it doesn't need a redirect
  const handleResend = () => {
    if (resendTimer.isActive) return;
    const formData = new FormData();
    formData.append('email', resolvedEmail);
    resendFetcher.submit(formData, { method: 'post', action: sendAction });
    resendTimer.start();
  };

  return (
    <Form ref={formRef} method="post" action={action} className={className}>
      <input type="hidden" name="email" value={resolvedEmail} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="otp" value={otp} />

      <div className="space-y-3 px-4 sm:px-0">
        {/* Header section */}
        <div className="text-center space-y-2">
          <p className="text-sm text-text-secondary">
            Code sent to <span className="text-text-primary font-medium">{maskedEmail}</span>
          </p>

          {/* Attempt counter */}
          {attemptCount > 0 && !isAccountLocked && (
            <p className="text-xs text-text-tertiary">
              Attempt {attemptCount} of {maxAttempts}
              {errorsRemaining > 0 && ` (${errorsRemaining} remaining)`}
            </p>
          )}

          {/* Expiration timer */}
          {expirationCountdown && (
            <p className="text-xs text-text-secondary font-medium">
              Code expires in {expirationCountdown}
            </p>
          )}
        </div>

        {/* OTP Input */}
        <div className="flex justify-center">
          <OtpCodeInput
            value={otp}
            onChange={handleOtpChange}
            onComplete={(v) => handleOtpComplete(v)}
            error={error}
            disabled={isSubmitting || isAccountLocked}
            autoFocus={!error}
            className="w-full"
          />
        </div>

        {/* Error Banner with type-specific messaging */}
        {(error || isAccountLocked) && !isSuccess && (
          <AuthErrorBanner
            error={
              isAccountLocked
                ? 'Too many attempts. Please request a new code.'
                : parsedError.message
            }
            {...((isAccountLocked || parsedError.isCritical) && {
              className: 'bg-destructive/10 border border-destructive/20',
            })}
          />
        )}

        {/* Success message */}
        {isSuccess && (
          <div className="text-center text-sm font-medium text-accent">
            ✓ Code verified successfully!
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          disabled={otp.length < 6 || isSubmitting || isAccountLocked || isSuccess}
          className="w-full"
        >
          {isSuccess ? 'Redirecting...' : isSubmitting ? loadingMessage : 'Verify'}
        </Button>

        {/* Action buttons - responsive stack on mobile */}
        <div className="flex flex-col gap-2 items-center">
          {/* Resend button with cooldown */}
          <div className="w-full sm:w-auto">
            {resendTimer.isActive ? (
              <div className="text-xs text-text-tertiary text-center py-2">
                Resend code in {resendTimer.seconds}s
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                disabled={isSubmitting || isSuccess}
                className="text-sm"
              >
                Didn't receive a code?
              </Button>
            )}
          </div>

          {/* Change email */}
          {onChangeEmail && (
            <Button
              type="button"
              variant="link"
              onClick={onChangeEmail}
              disabled={isSubmitting || isSuccess}
              className="text-text-secondary text-sm"
            >
              Use a different email
            </Button>
          )}

          {/* Passkey fallback */}
          {onPasskeyClick && (
            <PasskeyButton
              onClick={onPasskeyClick}
              disabled={isSubmitting || isSuccess}
              className="w-full mt-1"
            />
          )}
        </div>
      </div>
    </Form>
  );
}
