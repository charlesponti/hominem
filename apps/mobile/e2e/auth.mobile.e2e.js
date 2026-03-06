const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4040'
const AUTH_E2E_SECRET = process.env.EXPO_PUBLIC_E2E_AUTH_SECRET ?? 'otp-secret'

async function fetchLatestOtp(email) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': AUTH_E2E_SECRET,
        },
      }
    )

    if (response.status === 200) {
      const payload = await response.json()
      if (typeof payload.otp === 'string' && payload.otp.length > 0) {
        return payload.otp
      }
    }

    if (response.status !== 404) {
      const body = await response.text()
      throw new Error(`OTP lookup failed (${response.status}): ${body}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Timed out waiting for OTP')
}

async function waitForVisible(matcher, timeout = 5000) {
  try {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout)
    return true
  } catch {
    return false
  }
}

async function waitForResolvedShell(timeout = 60000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    const onAuthScreen = await waitForVisible(by.id('auth-screen'), 1500)
    if (onAuthScreen) {
      return 'signed_out'
    }

    const onStartScreen = await waitForVisible(by.text('WHERE SHOULD WE START?'), 1500)
    if (onStartScreen) {
      return 'signed_in'
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Timed out waiting for a resolved app shell state')
}

async function dismissKeyboard() {
  await element(by.id('auth-screen')).tapAtPoint({ x: 16, y: 16 })
}

async function ensureSignedOut() {
  const shellState = await waitForResolvedShell()
  if (shellState === 'signed_out') {
    return
  }

  await element(by.text('ACCOUNT')).tap()

  await waitFor(element(by.id('account-sign-out')))
    .toBeVisible()
    .withTimeout(10000)
  await element(by.id('account-sign-out')).tap()

  await waitFor(element(by.id('auth-screen')))
    .toBeVisible()
    .withTimeout(30000)
}

describe('Mobile auth', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true })
  })

  it('signs in and signs out using email otp flow', async () => {
    const email = `mobile-e2e-${Date.now()}@hominem.test`

    await ensureSignedOut()

    await element(by.id('auth-email-input')).typeText(email)
    await dismissKeyboard()
    await waitFor(element(by.id('auth-send-otp')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-send-otp')).tap()

    await waitFor(element(by.id('auth-otp-input')))
      .toBeVisible()
      .withTimeout(15000)

    const otp = await fetchLatestOtp(email)
    await element(by.id('auth-otp-input')).typeText(otp)
    await dismissKeyboard()
    await waitFor(element(by.id('auth-verify-otp')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('auth-verify-otp')).tap()

    const postLoginShellState = await waitForResolvedShell()
    if (postLoginShellState !== 'signed_in') {
      throw new Error('Expected signed-in shell after OTP verification')
    }

    await element(by.text('ACCOUNT')).tap()

    await waitFor(element(by.id('account-sign-out')))
      .toBeVisible()
      .withTimeout(10000)

    await element(by.id('account-sign-out')).tap()

    await waitFor(element(by.id('auth-send-otp')))
      .toBeVisible()
      .withTimeout(30000)
  })
})
