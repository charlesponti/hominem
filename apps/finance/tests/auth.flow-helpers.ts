import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const AUTH_API_BASE_URL = 'http://api.lvh.me:4040'
const FINANCE_APP_BASE_URL = 'http://finance.lvh.me:4444'
const AUTH_TEST_OTP_URL = `${AUTH_API_BASE_URL}/api/auth/test/otp/latest`
const AUTH_E2E_SECRET = 'otp-secret'
const OTP_FETCH_TIMEOUT_MS = 15_000
const OTP_FETCH_RETRY_DELAY_MS = 500

export interface OtpResponse {
  otp: string
}

interface EmailOtpVerifyResponse {
  access_token: string
  expires_in: number
}

export function createAuthTestEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@hominem.test`
}

export async function startEmailOtpFlow(page: Page, email: string) {
  await page.goto('/auth')

  // Wait for full React hydration: in Vite dev mode, React may still be
  // reconciling the SSR HTML when the page appears ready. A fill before
  // hydration is complete will be wiped when React takes over the DOM.
  // Retry until the fill value sticks — this is the reliable hydration signal.
  const emailInput = page.getByLabel('Email address')
  await emailInput.waitFor({ state: 'visible' })
  await expect(async () => {
    await emailInput.fill(email)
    await expect(emailInput).toHaveValue(email)
  }).toPass({ timeout: 20000 })

  const continueButton = page.getByRole('button', { name: 'Continue' })
  await expect(continueButton).toBeEnabled()
  await continueButton.click()

  // Wait for navigation to /auth/verify after the action redirects
  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30000 })
}

export async function fetchLatestSignInOtp(email: string) {
  const deadline = Date.now() + OTP_FETCH_TIMEOUT_MS

  while (Date.now() < deadline) {
    const otpResponse = await fetch(
      `${AUTH_TEST_OTP_URL}?email=${encodeURIComponent(email)}&type=sign-in`,
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': AUTH_E2E_SECRET,
        },
      },
    )

    if (otpResponse.ok) {
      const otpPayload = (await otpResponse.json()) as OtpResponse
      expect(otpPayload.otp.length).toBeGreaterThan(3)
      return otpPayload.otp
    }

    await new Promise((resolve) => setTimeout(resolve, OTP_FETCH_RETRY_DELAY_MS))
  }

  throw new Error(`Timed out waiting for sign-in OTP for ${email}`)
}

export async function signInWithEmailOtp(page: Page, email: string) {
  await startEmailOtpFlow(page, email)
  const verifyResponse = await fetch(`${AUTH_API_BASE_URL}/api/auth/mobile/e2e/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-e2e-auth-secret': AUTH_E2E_SECRET,
    },
    body: JSON.stringify({ email, amr: ['email_otp'] }),
  })

  if (!verifyResponse.ok) {
    throw new Error(
      `Failed to create E2E auth session (${verifyResponse.status}): ${await verifyResponse.text()}`,
    )
  }
  const verifyPayload = (await verifyResponse.json()) as EmailOtpVerifyResponse
  expect(verifyPayload.access_token.length).toBeGreaterThan(10)

  const expiresAtSeconds = Math.floor(Date.now() / 1000) + Math.max(verifyPayload.expires_in, 60)
  await page.context().addCookies([
    {
      name: 'hominem_access_token',
      value: verifyPayload.access_token,
      url: FINANCE_APP_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      expires: expiresAtSeconds,
    },
    {
      name: 'hominem_access_token',
      value: verifyPayload.access_token,
      url: AUTH_API_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      expires: expiresAtSeconds,
    },
  ])

  await page.goto(`${FINANCE_APP_BASE_URL}/finance`)
  await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 })
}

export async function enterOtpCode(page: Page, otp: string) {
  const digitInputs = page.locator('input[inputmode="numeric"]')
  const otpField = page.locator('input[name="otp"]')
  const normalized = otp.replace(/\D/g, '').slice(0, 6)
  await expect(async () => {
    for (let i = 0; i < 6; i++) {
      await digitInputs.nth(i).fill(normalized[i] ?? '')
    }
    await expect(digitInputs.first()).toHaveValue(normalized[0] ?? '')
    await expect(otpField).toHaveValue(normalized)
  }).toPass({ timeout: 10000 })
}

export async function submitOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6)
  expect(normalized.length).toBeGreaterThan(3)
  await enterOtpCode(page, normalized)
  await page.locator('input[name="otp"]').evaluate((input, value) => {
    if (!(input instanceof HTMLInputElement)) {
      return
    }

    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))

    const form = input.closest('form')
    if (form instanceof HTMLFormElement) {
      form.requestSubmit()
    }
  }, normalized)
}
