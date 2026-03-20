/**
 * Canonical cross-platform auth UX contract.
 *
 * Both web and mobile MUST source their auth copy and per-app destination
 * policy from here. Platform adapters may apply native styling (e.g. uppercase
 * transforms on mobile) but the underlying string values must be identical.
 */

// ---------------------------------------------------------------------------
// Auth UX states — platform-agnostic user-facing auth flow states
// (distinct from the internal AppAuthStatus state machine)
// ---------------------------------------------------------------------------

export type AuthUxState =
  | 'email-entry'
  | 'otp-verification'
  | 'passkey'
  | 'loading'
  | 'error'
  | 'signed-in'

// ---------------------------------------------------------------------------
// Canonical auth copy
// ---------------------------------------------------------------------------

export interface AuthEntryCopy {
  title: string
  subtitle: string
  formHeading: string
  formSubheading: string
  emailPlaceholder: string
  emailLabel: string
  submitButton: string
  passkeyButton: string
  passkeyLoadingButton: string
  emailRequiredError: string
  emailInvalidError: string
  sendFailedError: string
}

export interface AuthVerifyCopy {
  title: string
  subtitle: string
  formHeading: string
  formSubheading: (email: string) => string
  verifyButton: string
  resendButton: string
  changeEmailLink: string
  resendSuccessMessage: string
  codeRequiredError: string
  codeLengthError: string
  verifyFailedError: string
  resendFailedError: string
}

export interface AuthPasskeyCopy {
  genericError: string
}

export interface AuthCopy {
  emailEntry: AuthEntryCopy
  otpVerification: AuthVerifyCopy
  passkey: AuthPasskeyCopy
}

/** Canonical auth copy. All first-party apps MUST import strings from here. */
export const AUTH_COPY: AuthCopy = {
  emailEntry: {
    title: 'Welcome',
    subtitle: 'Sign in with your email and a one-time code.',
    formHeading: 'Sign in',
    formSubheading: 'Use your email to receive a one-time code.',
    emailPlaceholder: 'you@example.com',
    emailLabel: 'Email address',
    submitButton: 'Continue',
    passkeyButton: 'Use passkey',
    passkeyLoadingButton: 'Authenticating…',
    emailRequiredError: 'Email is required.',
    emailInvalidError: 'Enter a valid email address.',
    sendFailedError: 'Unable to send verification code.',
  },
  otpVerification: {
    title: 'Verify',
    subtitle: 'Enter the code we sent to your email.',
    formHeading: 'Verify',
    formSubheading: (email: string) => `Enter the code we sent to ${email}`,
    verifyButton: 'Verify',
    resendButton: 'Resend code',
    changeEmailLink: 'Use a different email',
    resendSuccessMessage: 'A new code is on the way.',
    codeRequiredError: 'Code is required.',
    codeLengthError: 'Code must be 6 digits.',
    verifyFailedError: 'There was a problem signing in. Our team is working on it.',
    resendFailedError: 'Unable to resend verification code.',
  },
  passkey: {
    genericError: 'Passkey sign-in failed.',
  },
}

// ---------------------------------------------------------------------------
// Per-app auth config
// ---------------------------------------------------------------------------

export interface AppAuthConfig {
  /** Human-readable product name shown in auth UI. */
  appName: string
  /** Platform-specific canonical post-auth destination path. */
  defaultPostAuthDestination: string
  /** Allowed redirect prefixes for safe redirect validation (web only). */
  allowedDestinations: string[]
  /** Copy to use for this app. Defaults to AUTH_COPY. */
  copy: AuthCopy
}

/** Hakumi web app auth config. */
export const NOTES_AUTH_CONFIG: AppAuthConfig = {
  appName: 'Hakumi',
  defaultPostAuthDestination: '/home',
  allowedDestinations: ['/', '/home', '/chat', '/notes', '/account', '/settings'],
  copy: AUTH_COPY,
}

/** Hakumi mobile app auth config. */
export const SHERPA_AUTH_CONFIG: AppAuthConfig = {
  appName: 'Hakumi',
  defaultPostAuthDestination: '/(protected)/(tabs)/start',
  allowedDestinations: ['/(protected)/(tabs)/start'],
  copy: AUTH_COPY,
}
