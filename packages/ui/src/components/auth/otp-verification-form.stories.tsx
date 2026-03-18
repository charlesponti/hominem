import type { Meta, StoryObj } from '@storybook/react';
import { OtpCodeInput } from './otp-code-input';
import { AuthErrorBanner } from './auth-error-banner';
import { PasskeyButton } from './passkey-button';

// OtpVerificationForm requires react-router hooks (useFetcher, useNavigation, useSearchParams).
// This story demonstrates the visual composition of its sub-components.

const meta = {
  title: 'Auth/OtpVerificationForm',
  tags: ['autodocs'],
};
export default meta;

export const Default = {
  render: () => (
    <div className="max-w-sm space-y-4 p-4 border rounded-lg">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Verify your email</h2>
        <p className="text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">jo***@example.com</span>
        </p>
      </div>
      <div className="flex justify-center">
        <OtpCodeInput value="" onChange={() => {}} autoFocus={false} />
      </div>
      <button
        type="button"
        disabled
        className="w-full h-9 rounded-md border bg-primary text-primary-foreground text-sm font-medium opacity-50"
      >
        Verify
      </button>
      <div className="flex flex-col gap-2 items-center">
        <button type="button" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          Didn't receive a code?
        </button>
        <PasskeyButton onClick={() => {}} className="w-full" />
      </div>
    </div>
  ),
};

export const WithError = {
  render: () => (
    <div className="max-w-sm space-y-4 p-4 border rounded-lg">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">jo***@example.com</span>
        </p>
      </div>
      <div className="flex justify-center">
        <OtpCodeInput
          value="123456"
          onChange={() => {}}
          error="Invalid code. Please try again."
          autoFocus={false}
        />
      </div>
      <AuthErrorBanner error="Invalid verification code." />
      <button
        type="button"
        className="w-full h-9 rounded-md border bg-primary text-primary-foreground text-sm font-medium"
      >
        Verify
      </button>
    </div>
  ),
};
