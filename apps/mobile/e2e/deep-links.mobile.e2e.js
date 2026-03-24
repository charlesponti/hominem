const {
  resetToSignedOut,
  triggerPasskeySuccess,
  waitForAuthState,
  waitForVisible,
} = require('./helpers/auth.e2e.helpers')

// e2e variant app scheme (app.config.ts: appScheme: 'hakumi-e2e')
const SCHEME = 'hakumi-e2e'

describe('Deep link routing', () => {
  beforeEach(async () => {
    await device.clearKeychain()
    await device.launchApp({ newInstance: true })
    await device.disableSynchronization()
    await resetToSignedOut()
  })

  describe('unauthenticated', () => {
    it('should redirect protected deep link to auth screen', async () => {
      await device.openURL({ url: `${SCHEME}://focus` })
      await waitForAuthState('signed_out', 10000)
      await waitFor(element(by.id('auth-send-otp')))
        .toBeVisible()
        .withTimeout(10000)
    })

    it('should open verify path without crashing', async () => {
      await device.openURL({ url: `${SCHEME}://verify?token=test` })
      // Either shows verify/OTP input or falls back to sign-in — must not crash
      const hasOtpInput = await waitForVisible(by.id('auth-otp-input'), 5000)
      const hasSendOtp = await waitForVisible(by.id('auth-send-otp'), 5000)
      if (!hasOtpInput && !hasSendOtp) {
        throw new Error('Expected auth-otp-input or auth-send-otp to be visible after verify deep link')
      }
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      await triggerPasskeySuccess()
      await waitForAuthState('signed_in', 15000)
    })

    it('should navigate to focus tab via hakumi-e2e://focus', async () => {
      await device.openURL({ url: `${SCHEME}://focus` })
      await waitFor(element(by.id('focus-screen')))
        .toBeVisible()
        .withTimeout(10000)
    })

    it('should navigate to account tab via hakumi-e2e://account', async () => {
      await device.openURL({ url: `${SCHEME}://account` })
      await waitFor(element(by.id('account-screen')))
        .toBeVisible()
        .withTimeout(10000)
    })

    it('should navigate to chat tab via hakumi-e2e://chat', async () => {
      await device.openURL({ url: `${SCHEME}://chat` })
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(15000)
    })

    it('should handle unknown deep link without crashing', async () => {
      await device.openURL({ url: `${SCHEME}://unknown-route-xyz` })
      // App must still be running and authenticated
      await waitForAuthState('signed_in', 10000)
    })
  })
})
