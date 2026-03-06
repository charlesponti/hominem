const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4040'
const AUTH_E2E_SECRET = process.env.EXPO_PUBLIC_E2E_AUTH_SECRET ?? 'otp-secret'

async function waitForVisible(matcher, timeout = 5000) {
  try {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout)
    return true
  } catch {
    return false
  }
}

async function waitForAuthState(state, timeout = 30000) {
  const matcher =
    state === 'signed_in'
      ? by.id('auth-state-signed-in')
      : state === 'signed_out'
        ? by.id('auth-state-signed-out')
        : by.id('auth-state-booting')

  await waitFor(element(matcher)).toBeVisible().withTimeout(timeout)
}

async function launchMobileApp() {
  await device.launchApp({ newInstance: true, delete: true })
  await device.disableSynchronization()
}

async function stopMobileAppSync() {
  await device.enableSynchronization()
}

async function fetchLatestOtp(email) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': AUTH_E2E_SECRET,
        },
      },
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

async function dismissBlockingAlertIfPresent() {
  const hasOkButton = await waitForVisible(by.text('OK'), 300)
  if (!hasOkButton) {
    return false
  }
  await element(by.text('OK')).tap()
  await new Promise((resolve) => setTimeout(resolve, 200))
  return true
}

async function dismissKeyboard() {
  await dismissBlockingAlertIfPresent()
  await element(by.id('auth-screen')).tapAtPoint({ x: 16, y: 16 })
}

async function resetToSignedOut() {
  await waitFor(element(by.id('auth-e2e-reset'))).toBeVisible().withTimeout(30000)
  await element(by.id('auth-e2e-reset')).tap()
  await waitForAuthState('signed_out')
  await waitFor(element(by.id('auth-send-otp'))).toBeVisible().withTimeout(10000)
}

async function signOutViaContractControl() {
  await waitFor(element(by.id('auth-e2e-sign-out'))).toBeVisible().withTimeout(10000)
  await element(by.id('auth-e2e-sign-out')).tap()
  await waitForAuthState('signed_out')
}

async function waitForOtpStep(timeout = 20000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    const hasOtpInput = await waitForVisible(by.id('auth-otp-input'), 1200)
    if (hasOtpInput) {
      return
    }

    const hasAuthError = await waitForVisible(by.id('auth-error-text'), 1200)
    if (hasAuthError) {
      throw new Error('OTP request failed in app UI')
    }

    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  throw new Error('Timed out waiting for OTP step')
}

async function triggerOtpRequest(timeout = 20000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    await dismissBlockingAlertIfPresent()
    await waitFor(element(by.id('auth-send-otp'))).toBeVisible().withTimeout(5000)

    try {
      await element(by.id('auth-send-otp')).tap()
    } catch {
      const dismissed = await dismissBlockingAlertIfPresent()
      if (!dismissed) {
        throw new Error('Unable to tap auth-send-otp')
      }
      continue
    }

    const hasOtpInput = await waitForVisible(by.id('auth-otp-input'), 1200)
    if (hasOtpInput) {
      return
    }

    const hasAuthError = await waitForVisible(by.id('auth-error-text'), 1200)
    if (hasAuthError) {
      throw new Error('OTP request failed in app UI')
    }
  }

  throw new Error('Timed out triggering OTP request')
}

module.exports = {
  dismissKeyboard,
  fetchLatestOtp,
  launchMobileApp,
  resetToSignedOut,
  signOutViaContractControl,
  stopMobileAppSync,
  triggerOtpRequest,
  waitForAuthState,
  waitForOtpStep,
  waitForVisible,
}
