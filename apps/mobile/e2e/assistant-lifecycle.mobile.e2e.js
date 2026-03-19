const {
  stopMobileAppSync,
  waitForAuthState,
  resetToSignedOut,
  triggerOtpRequest,
  waitForOtpStep,
  fetchLatestOtp,
  dismissKeyboard,
} = require('./helpers/auth.e2e.helpers')

const SIGN_IN_TIMEOUT = 30000

async function signInAndReachFocus(email) {
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

  await waitForAuthState('signed_in', SIGN_IN_TIMEOUT)

  await waitFor(element(by.id('focus-screen')))
    .toBeVisible()
    .withTimeout(10000)
}

describe('Mobile: unified workspace critical path', () => {
  beforeEach(async () => {
    await device.clearKeychain()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()
    await resetToSignedOut()
  })

  afterAll(async () => {
    await stopMobileAppSync()
  })

  it('focus screen loads with the shared HyperForm after sign-in', async () => {
    const email = 'mobile-e2e-' + Date.now() + '-workspace@hominem.test'
    await signInAndReachFocus(email)

    await waitFor(element(by.id('focus-screen')))
      .toBeVisible()
      .withTimeout(5000)

    await waitFor(element(by.id('mobile-hyper-form')))
      .toBeVisible()
      .withTimeout(5000)
  })

  it('preserves the HyperForm draft while switching workspace contexts', async () => {
    const email = 'mobile-e2e-' + Date.now() + '-draft@hominem.test'
    await signInAndReachFocus(email)

    await element(by.id('mobile-hyper-form-input')).tap()
    await element(by.id('mobile-hyper-form-input')).typeText('Persistent workspace draft')
    await dismissKeyboard()

    await element(by.id('mobile-workspace-context-note')).tap()

    await waitFor(element(by.id('note-context-screen')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('mobile-hyper-form-input'))).toHaveText('Persistent workspace draft')

    await element(by.id('mobile-workspace-context-search')).tap()

    await waitFor(element(by.id('search-context-screen')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('mobile-hyper-form-input'))).toHaveText('Persistent workspace draft')
  })

  it('switches into chat context and keeps the shared voice affordance visible', async () => {
    const email = 'mobile-e2e-' + Date.now() + '-chat@hominem.test'
    await signInAndReachFocus(email)

    await element(by.id('mobile-workspace-context-chat')).tap()

    await waitFor(element(by.id('sherpa-screen')))
      .toBeVisible()
      .withTimeout(10000)

    await waitFor(element(by.id('mobile-hyper-form-voice')))
      .toBeVisible()
      .withTimeout(5000)
  })
})
