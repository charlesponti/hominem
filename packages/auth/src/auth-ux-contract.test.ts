import { describe, expect, it } from 'vitest'

import {
  AUTH_COPY,
  NOTES_AUTH_CONFIG,
  SHERPA_AUTH_CONFIG,
} from './auth-ux-contract'

describe('AUTH_COPY — canonical cross-platform auth copy', () => {
  describe('emailEntry', () => {
    it('has a non-empty title', () => {
      expect(AUTH_COPY.emailEntry.title.length).toBeGreaterThan(0)
    })

    it('has a non-empty subtitle', () => {
      expect(AUTH_COPY.emailEntry.subtitle.length).toBeGreaterThan(0)
    })

    it('has a non-empty submit button label', () => {
      expect(AUTH_COPY.emailEntry.submitButton.length).toBeGreaterThan(0)
    })

    it('has a valid email placeholder', () => {
      expect(AUTH_COPY.emailEntry.emailPlaceholder).toContain('@')
    })

    it('has a non-empty passkey button label', () => {
      expect(AUTH_COPY.emailEntry.passkeyButton.length).toBeGreaterThan(0)
    })

    it('has a non-empty passkey loading label', () => {
      expect(AUTH_COPY.emailEntry.passkeyLoadingButton.length).toBeGreaterThan(0)
    })

    it('has error messages for all validation cases', () => {
      expect(AUTH_COPY.emailEntry.emailRequiredError.length).toBeGreaterThan(0)
      expect(AUTH_COPY.emailEntry.emailInvalidError.length).toBeGreaterThan(0)
      expect(AUTH_COPY.emailEntry.sendFailedError.length).toBeGreaterThan(0)
    })
  })

  describe('otpVerification', () => {
    it('has a non-empty title', () => {
      expect(AUTH_COPY.otpVerification.title.length).toBeGreaterThan(0)
    })

    it('has a non-empty verify button label', () => {
      expect(AUTH_COPY.otpVerification.verifyButton.length).toBeGreaterThan(0)
    })

    it('has a non-empty resend button label', () => {
      expect(AUTH_COPY.otpVerification.resendButton.length).toBeGreaterThan(0)
    })

    it('has a non-empty change email link label', () => {
      expect(AUTH_COPY.otpVerification.changeEmailLink.length).toBeGreaterThan(0)
    })

    it('formSubheading interpolates email', () => {
      const result = AUTH_COPY.otpVerification.formSubheading('user@example.com')
      expect(result).toContain('user@example.com')
    })

    it('has error messages for all validation cases', () => {
      expect(AUTH_COPY.otpVerification.codeRequiredError.length).toBeGreaterThan(0)
      expect(AUTH_COPY.otpVerification.codeLengthError.length).toBeGreaterThan(0)
      expect(AUTH_COPY.otpVerification.verifyFailedError.length).toBeGreaterThan(0)
      expect(AUTH_COPY.otpVerification.resendFailedError.length).toBeGreaterThan(0)
    })

    it('has a resend success message', () => {
      expect(AUTH_COPY.otpVerification.resendSuccessMessage.length).toBeGreaterThan(0)
    })
  })

  describe('passkey', () => {
    it('has a generic error message', () => {
      expect(AUTH_COPY.passkey.genericError.length).toBeGreaterThan(0)
    })
  })
})

describe('AppAuthConfig — per-app destination policy', () => {
  describe('NOTES_AUTH_CONFIG', () => {
    it('has a non-empty appName', () => {
      expect(NOTES_AUTH_CONFIG.appName.length).toBeGreaterThan(0)
    })

    it('has a valid web post-auth destination', () => {
      expect(NOTES_AUTH_CONFIG.defaultPostAuthDestination).toMatch(/^\//)
    })

    it('includes default destination in allowed list', () => {
      const dest = NOTES_AUTH_CONFIG.defaultPostAuthDestination
      const allowed = NOTES_AUTH_CONFIG.allowedDestinations
      const isAllowed = allowed.some((prefix) => dest.startsWith(prefix))
      expect(isAllowed).toBe(true)
    })

    it('uses canonical AUTH_COPY', () => {
      expect(NOTES_AUTH_CONFIG.copy).toBe(AUTH_COPY)
    })
  })

  describe('SHERPA_AUTH_CONFIG', () => {
    it('has a non-empty appName', () => {
      expect(SHERPA_AUTH_CONFIG.appName.length).toBeGreaterThan(0)
    })

    it('has a valid mobile post-auth destination', () => {
      expect(SHERPA_AUTH_CONFIG.defaultPostAuthDestination.length).toBeGreaterThan(0)
    })

    it('uses canonical AUTH_COPY', () => {
      expect(SHERPA_AUTH_CONFIG.copy).toBe(AUTH_COPY)
    })
  })

  describe('cross-platform copy parity', () => {
    it('both apps use the same AUTH_COPY reference', () => {
      expect(NOTES_AUTH_CONFIG.copy).toBe(SHERPA_AUTH_CONFIG.copy)
    })

    it('both apps share the same email entry copy', () => {
      expect(NOTES_AUTH_CONFIG.copy.emailEntry).toEqual(SHERPA_AUTH_CONFIG.copy.emailEntry)
    })

    it('both apps share the same OTP verification copy', () => {
      expect(NOTES_AUTH_CONFIG.copy.otpVerification).toEqual(SHERPA_AUTH_CONFIG.copy.otpVerification)
    })

    it('both apps share the same passkey copy', () => {
      expect(NOTES_AUTH_CONFIG.copy.passkey).toEqual(SHERPA_AUTH_CONFIG.copy.passkey)
    })

    it('post-auth destinations are different per platform', () => {
      // They serve different apps with different navigation systems
      expect(NOTES_AUTH_CONFIG.defaultPostAuthDestination).not.toBe(
        SHERPA_AUTH_CONFIG.defaultPostAuthDestination,
      )
    })
  })
})
