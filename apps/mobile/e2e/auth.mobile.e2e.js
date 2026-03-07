const {
  dismissKeyboard,
  fetchLatestOtp,
  resetToSignedOut,
  signOutViaContractControl,
  triggerPasskeyCancel,
  triggerPasskeySuccess,
  triggerOtpRequest,
  waitForAuthState,
  waitForOtpStep,
} = require('./helpers/auth.e2e.helpers')

describe('Mobile auth', () => {
  beforeEach(async () => {
    // Fresh app state for each test - critical for Detox stability
    await device.clearKeychain()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()
    await resetToSignedOut()
  })

  it('should sign in and sign out using email OTP flow', async () => {
    const email = `mobile-e2e-${Date.now()}-signin@hominem.test`

    await waitFor(element(by.id('auth-email-input')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-email-input')).tap()
    await element(by.id('auth-email-input')).typeText(email)
    await expect(element(by.id('auth-email-input'))).toHaveText(email)
    await dismissKeyboard()
    await triggerOtpRequest()
    await waitForOtpStep(5000)

    const otp = await fetchLatestOtp(email)
    await element(by.id('auth-otp-input')).tap()
    await element(by.id('auth-otp-input')).typeText(otp)
    await dismissKeyboard()
    await waitFor(element(by.id('auth-verify-otp')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-verify-otp')).tap()

    await waitForAuthState('signed_in')
    await signOutViaContractControl()
    await waitFor(element(by.id('auth-send-otp')))
      .toBeVisible()
      .withTimeout(10000)
  })

  it('should reject invalid OTP code', async () => {
    const email = `mobile-e2e-${Date.now()}-invalid@hominem.test`

    await waitFor(element(by.id('auth-email-input')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-email-input')).tap()
    await element(by.id('auth-email-input')).typeText(email)
    await dismissKeyboard()
    await triggerOtpRequest()
    await waitForOtpStep(5000)

    const invalidOtp = '000000'
    await element(by.id('auth-otp-input')).tap()
    await element(by.id('auth-otp-input')).typeText(invalidOtp)
    await dismissKeyboard()
    await waitFor(element(by.id('auth-verify-otp')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-verify-otp')).tap()

    await waitForAuthState('signed_out', 10000)

    try {
      await waitFor(element(by.id('auth-otp-input')))
        .toBeVisible()
        .withTimeout(5000)
    } catch {
      await waitFor(element(by.id('auth-send-otp')))
        .toBeVisible()
        .withTimeout(5000)
    }
  })

  it('should restore session after cold start', async () => {
    const email = `mobile-e2e-${Date.now()}-session@hominem.test`

    await waitFor(element(by.id('auth-email-input')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-email-input')).tap()
    await element(by.id('auth-email-input')).typeText(email)
    await dismissKeyboard()
    await triggerOtpRequest()
    await waitForOtpStep(5000)

    const otp = await fetchLatestOtp(email)
    await element(by.id('auth-otp-input')).tap()
    await element(by.id('auth-otp-input')).typeText(otp)
    await dismissKeyboard()
    await waitFor(element(by.id('auth-verify-otp')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-verify-otp')).tap()

    await waitForAuthState('signed_in')

    // Simulate cold start - kill and relaunch app
    await device.terminateApp()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()

    // Should restore signed-in state
    await waitForAuthState('signed_in', 15000)
  })

  it('should complete deterministic passkey sign-in and survive relaunch', async () => {
    await waitFor(element(by.id('auth-passkey-button')))
      .toBeVisible()
      .withTimeout(10000)

    await triggerPasskeySuccess()
    await waitForAuthState('signed_in', 15000)

    await device.terminateApp()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()
    await waitForAuthState('signed_in', 15000)
  })

  it('should fall back cleanly when passkey sign-in is cancelled', async () => {
    await waitFor(element(by.id('auth-passkey-button')))
      .toBeVisible()
      .withTimeout(10000)

    await triggerPasskeyCancel()

    await waitFor(element(by.id('auth-error-text')))
      .toBeVisible()
      .withTimeout(10000)
    await waitForAuthState('signed_out', 10000)
    await waitFor(element(by.id('auth-send-otp')))
      .toBeVisible()
      .withTimeout(10000)
  })
})
