const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4040'
const AUTH_E2E_SECRET = process.env.EXPO_PUBLIC_E2E_AUTH_SECRET ?? 'otp-secret'

/**
 * Exponential backoff delay. Returns a promise that resolves after the
 * calculated delay, capped at maxMs. Use instead of fixed setTimeout sleeps.
 * Sequence: 50 → 100 → 200 → 400 → 800 → 1600 → 2000 (capped)
 */
async function backoffDelay(attempt, maxMs = 2000) {
  const ms = Math.min(50 * 2 ** attempt, maxMs)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForVisible(matcher, timeout = 5000) {
  try {
    await waitFor(element(matcher)).toBeVisible().withTimeout(timeout)
    return true
  } catch {
    return false
  }
}

async function readVisibleText(testId, timeout = 500) {
  const isVisible = await waitForVisible(by.id(testId), timeout)
  if (!isVisible) {
    return null
  }

  try {
    const attributes = await element(by.id(testId)).getAttributes()
    if (typeof attributes.text === 'string' && attributes.text.length > 0) {
      return attributes.text
    }
    if (typeof attributes.label === 'string' && attributes.label.length > 0) {
      return attributes.label
    }
    if (typeof attributes.value === 'string' && attributes.value.length > 0) {
      return attributes.value
    }
  } catch {
    return null
  }

  return null
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
  await device.clearKeychain()
  await device.launchApp()
  await device.disableSynchronization()
}

async function stopMobileAppSync() {
  try {
    await device.enableSynchronization()
  } catch {
    return
  }
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

    await backoffDelay(attempt)
  }

  throw new Error('Timed out waiting for OTP')
}

async function dismissBlockingAlertIfPresent() {
  const hasOkButton = await waitForVisible(by.text('OK'), 300)
  if (!hasOkButton) {
    return false
  }
  await element(by.text('OK')).tap()
  await backoffDelay(1) // ~100ms for UI to settle after dismissing alert
  return true
}

async function dismissKeyboard() {
  await dismissBlockingAlertIfPresent()
  // Try to dismiss keyboard by tapping on either auth screen
  try {
    await element(by.id('auth-screen')).tapAtPoint({ x: 16, y: 16 })
  } catch {
    try {
      await element(by.id('auth-verify-screen')).tapAtPoint({ x: 16, y: 16 })
    } catch {
      // If neither screen is available, just continue (keyboard might already be dismissed)
    }
  }
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
  let attempt = 0
  while (Date.now() - startedAt < timeout) {
    const hasOtpInput = await waitForVisible(by.id('auth-otp-input'), 1200)
    if (hasOtpInput) {
      return
    }

    const hasAuthError = await waitForVisible(by.id('auth-error-text'), 1200)
    if (hasAuthError) {
      const errorText = await readVisibleText('auth-error-text')
      throw new Error(`OTP request failed in app UI${errorText ? `: ${errorText}` : ''}`)
    }

    await backoffDelay(attempt++)
  }

  throw new Error('Timed out waiting for OTP step')
}

async function triggerOtpRequest(timeout = 20000) {
  const startedAt = Date.now()
  let lastError = null
  let attempt = 0

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
      const errorText = await readVisibleText('auth-error-text')
      lastError = errorText ? `OTP request failed in app UI: ${errorText}` : 'OTP request failed in app UI'

      const hasEmailInput = await waitForVisible(by.id('auth-email-input'), 400)
      if (hasEmailInput) {
        try {
          await element(by.id('auth-email-input')).tap()
        } catch {}
      }

      await backoffDelay(attempt++)
      continue
    }

    await backoffDelay(attempt++)
  }

  throw new Error(lastError ?? 'Timed out triggering OTP request')
}

async function triggerPasskeySuccess() {
  await waitFor(element(by.id('auth-e2e-passkey-success'))).toBeVisible().withTimeout(5000)
  await element(by.id('auth-e2e-passkey-success')).tap()
}

async function triggerPasskeyCancel() {
  await waitFor(element(by.id('auth-e2e-passkey-cancel'))).toBeVisible().withTimeout(5000)
  await element(by.id('auth-e2e-passkey-cancel')).tap()
}

module.exports = {
  dismissKeyboard,
  fetchLatestOtp,
  launchMobileApp,
  resetToSignedOut,
  signOutViaContractControl,
  stopMobileAppSync,
  triggerPasskeyCancel,
  triggerPasskeySuccess,
  triggerOtpRequest,
  waitForAuthState,
  waitForOtpStep,
  waitForVisible,
}
