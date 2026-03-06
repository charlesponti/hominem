const {
  dismissKeyboard,
  fetchLatestOtp,
  launchMobileApp,
  resetToSignedOut,
  signOutViaContractControl,
  stopMobileAppSync,
  triggerOtpRequest,
  waitForAuthState,
  waitForOtpStep,
} = require('./helpers/auth.e2e.helpers')

describe('Mobile auth', () => {
  beforeAll(async () => {
    await device.clearKeychain()
    await launchMobileApp()
    await resetToSignedOut()
  })

  afterAll(async () => {
    await stopMobileAppSync()
  })

  it('signs in and signs out using email otp flow', async () => {
    const email = `mobile-e2e-${Date.now()}@hominem.test`

    await resetToSignedOut()

    await waitFor(element(by.id('auth-email-input')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-email-input')).tap()
    await element(by.id('auth-email-input')).replaceText(email)
    await expect(element(by.id('auth-email-input'))).toHaveText(email)
    await dismissKeyboard()
    await triggerOtpRequest()
    await waitForOtpStep(5000)

    const otp = await fetchLatestOtp(email)
    await element(by.id('auth-otp-input')).tap()
    await element(by.id('auth-otp-input')).replaceText(otp)
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
})
