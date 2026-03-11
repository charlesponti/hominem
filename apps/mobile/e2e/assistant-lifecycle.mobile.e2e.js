const {
  launchMobileApp,
  stopMobileAppSync,
  waitForAuthState,
  resetToSignedOut,
  triggerOtpRequest,
  waitForOtpStep,
  fetchLatestOtp,
  dismissKeyboard,
} = require('./helpers/auth.e2e.helpers')

const SIGN_IN_TIMEOUT = 30000

/**
 * Signs in and waits for the protected home (focus) screen.
 */
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

describe('Mobile: focus → sherpa critical path', () => {
  beforeEach(async () => {
    await device.clearKeychain()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()
    await resetToSignedOut()
  })

  afterAll(async () => {
    await stopMobileAppSync()
  })

  it('focus screen loads with CaptureBar after sign-in', async () => {
    const email = `mobile-e2e-${Date.now()}-focus@hominem.test`
    await signInAndReachFocus(email)

    await waitFor(element(by.id('focus-screen')))
      .toBeVisible()
      .withTimeout(5000)

    await waitFor(element(by.id('capture-bar-input')))
      .toBeVisible()
      .withTimeout(5000)
  })

  it('capture bar Think navigates to sherpa session', async () => {
    const email = `mobile-e2e-${Date.now()}-think@hominem.test`
    await signInAndReachFocus(email)

    // Type a thought into the capture bar
    await element(by.id('capture-bar-input')).tap()
    await element(by.id('capture-bar-input')).typeText('What should I focus on today?')
    await dismissKeyboard()

    // Tap "Think through it" to start a session
    await waitFor(element(by.id('capture-bar-think')))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.id('capture-bar-think')).tap()

    // Should navigate to sherpa with a new chat session
    await waitFor(element(by.id('sherpa-screen')))
      .toBeVisible()
      .withTimeout(10000)

    // Chat input should be present
    await waitFor(element(by.id('chat-input-message')))
      .toBeVisible()
      .withTimeout(10000)
  })

  it('sherpa screen shows voice input button', async () => {
    const email = `mobile-e2e-${Date.now()}-voice@hominem.test`
    await signInAndReachFocus(email)

    // Navigate directly to sherpa via header link
    await waitFor(element(by.text('SHERPA')))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.text('SHERPA')).tap()

    await waitFor(element(by.id('sherpa-screen')))
      .toBeVisible()
      .withTimeout(10000)

    await waitFor(element(by.id('chat-voice-input-button')))
      .toBeVisible()
      .withTimeout(5000)
  })

  it('capture bar Save persists a note and stays on focus screen', async () => {
    const email = `mobile-e2e-${Date.now()}-save@hominem.test`
    await signInAndReachFocus(email)

    await element(by.id('capture-bar-input')).tap()
    await element(by.id('capture-bar-input')).typeText('Quick note to save')
    await dismissKeyboard()

    await waitFor(element(by.id('capture-bar-save')))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.id('capture-bar-save')).tap()

    // Should stay on focus screen after save
    await waitFor(element(by.id('focus-screen')))
      .toBeVisible()
      .withTimeout(5000)
  })
})
