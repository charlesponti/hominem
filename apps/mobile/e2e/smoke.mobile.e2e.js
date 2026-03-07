const {
  launchMobileApp,
  stopMobileAppSync,
  waitForAuthState,
} = require('./helpers/auth.e2e.helpers')

describe('Mobile smoke', () => {
  beforeAll(async () => {
    await launchMobileApp()
  })

  afterAll(async () => {
    await stopMobileAppSync()
  })

  it('resolves to signed_out within 5 seconds on a clean install', async () => {
    // Clean install means no stored tokens → boot must settle to signed_out
    // within the AUTH_BOOT_TIMEOUT_MS budget (8s). We assert 5s to give a
    // meaningful margin: if this flakes, investigate boot perf not the test.
    await waitForAuthState('signed_out', 5000)
  })
})
