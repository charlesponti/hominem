import { OTPField } from '@base-ui/react/otp-field';
import { TextField } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { cn } from '@ponti-studios/ui/utilities';
import { useEffect, useState } from 'react';

const OTP_LENGTH = 6;

export interface EmailOtpAuthCopy {
  changeEmail: string;
  emailHelper: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailTitle: string;
  resend: string;
  resendLoading: string;
  submitEmail: string;
  submitEmailLoading: string;
  verify: string;
  verifyLoading: string;
  otpTitle: string;
}

export interface EmailOtpAuthFlowProps {
  copy: EmailOtpAuthCopy;
  email: string;
  onChangeEmail: () => void;
  onEmailChange: (email: string) => void;
  onEmailSubmit: () => void | Promise<void>;
  onOtpChange: (otp: string) => void;
  onOtpSubmit: () => void | Promise<void>;
  onResendOtp: () => void | Promise<void>;
  otp: string;
  otpHelperText: string;
  step: 'email' | 'otp';
  error?: string;
  isResending?: boolean;
  isSubmitting?: boolean;
}

function AuthScaffold({
  children,
  helperText,
  title,
}: {
  children: React.ReactNode;
  helperText: string;
  title: string;
}) {
  return (
    <div className="bg-surface-base flex items-center justify-center py-16 px-4 md:px-12 border max-w-lg rounded-lg mx-auto shadow">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center gap-20">
        <div className="space-y-2 text-left">
          <h1 className="text-3xl text-foreground">{title}</h1>
          <p className="text-muted-foreground">{helperText}</p>
        </div>
        <div className="w-full text-left">{children}</div>
      </div>
    </div>
  );
}

function OtpInput({
  disabled,
  error,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  onChange: (otp: string) => void;
  value: string;
}) {
  return (
    <OTPField.Root
      id="otp-verification-code"
      length={OTP_LENGTH}
      disabled={disabled}
      value={value}
      onValueChange={(val) => onChange(val)}
      aria-label="One-time verification code"
      aria-invalid={Boolean(error)}
      className="flex items-center gap-2"
    >
      {Array.from({ length: OTP_LENGTH }, (_, index) => (
        <OTPField.Input
          key={index}
          autoFocus={index === 0}
          className={cn(
            'border-subtle bg-panel h-12 w-10 rounded-md border text-center text-foreground font-semibold',
            error && 'border-destructive',
          )}
          aria-label={`Character ${index + 1} of ${OTP_LENGTH}`}
        />
      ))}
    </OTPField.Root>
  );
}

export function EmailOtpAuthFlow({
  copy,
  email,
  error,
  isResending = false,
  isSubmitting = false,
  onChangeEmail,
  onEmailChange,
  onEmailSubmit,
  onOtpChange,
  onOtpSubmit,
  onResendOtp,
  otp,
  otpHelperText,
  step,
}: EmailOtpAuthFlowProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (step === 'email') {
    return (
      <AuthScaffold title={copy.emailTitle} helperText={copy.emailHelper}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onEmailSubmit();
          }}
          className="space-y-3 w-full"
        >
          <TextField
            label={copy.emailLabel}
            name="email"
            type="email"
            value={email}
            autoComplete="email"
            required
            placeholder={copy.emailPlaceholder}
            disabled={!isHydrated || isSubmitting}
            error={error}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            isLoading={isSubmitting}
            loadingLabel={copy.submitEmailLoading}
          >
            {copy.submitEmail}
          </Button>
        </form>
      </AuthScaffold>
    );
  }

  const canSubmit = isHydrated && otp.length === OTP_LENGTH && !isSubmitting && !isResending;

  return (
    <AuthScaffold title={copy.otpTitle} helperText={otpHelperText}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onOtpSubmit();
        }}
        className="space-y-3"
      >
        <input type="hidden" name="email" value={email} />
        <div className="flex flex-col items-center gap-1.5">
          <OtpInput
            disabled={isSubmitting || isResending}
            error={error}
            onChange={onOtpChange}
            value={otp}
          />
          {error ? (
            <p className="text-sm text-destructive-text" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full"
          isLoading={isSubmitting}
          loadingLabel={copy.verifyLoading}
        >
          {copy.verify}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => void onResendOtp()}
            disabled={isResending || isSubmitting}
            isLoading={isResending}
            loadingLabel={copy.resendLoading}
          >
            {copy.resend}
          </Button>
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={onChangeEmail}
            disabled={isSubmitting}
          >
            {copy.changeEmail}
          </Button>
        </div>
      </form>
    </AuthScaffold>
  );
}
