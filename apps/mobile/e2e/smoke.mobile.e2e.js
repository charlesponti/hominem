const {
  launchMobileApp,
  stopMobileAppSync,
  waitForAuthState,
  waitForVisible,
} = require('./helpers/auth.e2e.helpers')

describe('Mobile smoke', () => {
  beforeAll(async () => {
    await launchMobileApp()
  })

  afterAll(async () => {
    await stopMobileAppSync()
  })

  it('resolves to an auth state contract indicator', async () => {
    const bootingVisible = await waitForVisible(by.id('auth-state-booting'), 5000)

    if (bootingVisible) {
      await waitForAuthState('signed_out', 30000)
      return
    }

    const signedOutVisible = await waitForVisible(by.id('auth-state-signed-out'), 10000)
    if (signedOutVisible) {
      return
    }

    await waitForAuthState('signed_in', 10000)
  })
})
