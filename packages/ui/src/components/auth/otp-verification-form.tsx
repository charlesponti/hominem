import { useState } from 'react'
import { Form, useFetcher, useNavigation, useSearchParams } from 'react-router'

import { Button } from '../ui/button'

import { AuthErrorBanner } from './auth-error-banner'
import { OtpCodeInput } from './otp-code-input'
import { PasskeyButton } from './passkey-button'
import { ResendCodeButton } from './resend-code-button'

interface OtpVerificationFormProps {
  action: string
  sendAction?: string
  email: string
  defaultNext?: string
  error?: string | undefined
  onChangeEmail?: () => void
  onPasskeyClick?: () => void
  loadingMessage?: string
  className?: string
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
}: OtpVerificationFormProps) {
  const navigation = useNavigation()
  const resendFetcher = useFetcher()
  const [searchParams] = useSearchParams()
  const isSubmitting = navigation.state === 'submitting' && navigation.formAction === action

  const [otp, setOtp] = useState('')
  const resolvedEmail = searchParams.get('email') ?? email
  const next = searchParams.get('next') ?? defaultNext
  const maskedEmail = resolvedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')

  // Resend is via fetcher since it doesn't need a redirect
  const handleResend = () => {
    const formData = new FormData()
    formData.append('email', resolvedEmail)
    resendFetcher.submit(formData, { method: 'post', action: sendAction })
  }

  return (
    <Form method="post" action={action} className={className}>
      <input type="hidden" name="email" value={resolvedEmail} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="otp" value={otp} />

      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="text-foreground font-medium">{maskedEmail}</span>
          </p>
        </div>

        <OtpCodeInput
          value={otp}
          onChange={setOtp}
          disabled={isSubmitting}
          autoFocus
        />

        <AuthErrorBanner error={error ?? null} />

        <Button type="submit" disabled={otp.length !== 6 || isSubmitting} className="w-full">
          {isSubmitting ? loadingMessage : 'Verify'}
        </Button>

        <div className="flex flex-col items-center gap-2">
          <ResendCodeButton onResend={handleResend} isLoading={isSubmitting} />

          {onChangeEmail && (
            <Button
              type="button"
              variant="link"
              onClick={onChangeEmail}
              disabled={isSubmitting}
              className="text-muted-foreground text-sm"
            >
              Use a different email
            </Button>
          )}

          {onPasskeyClick && (
            <PasskeyButton
              onClick={onPasskeyClick}
              disabled={isSubmitting}
              className="w-full mt-2"
            />
          )}
        </div>
      </div>
    </Form>
  )
}
