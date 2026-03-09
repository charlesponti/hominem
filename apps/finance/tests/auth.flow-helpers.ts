import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const AUTH_TEST_OTP_URL = 'http://localhost:4040/api/auth/test/otp/latest'
const AUTH_E2E_SECRET = 'otp-secret'

export interface OtpResponse {
  otp: string
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
  const otpResponse = await fetch(
    `${AUTH_TEST_OTP_URL}?email=${encodeURIComponent(email)}&type=sign-in`,
    {
      method: 'GET',
      headers: {
        'x-e2e-auth-secret': AUTH_E2E_SECRET,
      },
    },
  )

  expect(otpResponse.ok).toBe(true)
  const otpPayload = (await otpResponse.json()) as OtpResponse
  expect(otpPayload.otp.length).toBeGreaterThan(3)
  return otpPayload.otp
}

export async function signInWithEmailOtp(page: Page, email: string) {
  await startEmailOtpFlow(page, email)
  const otp = await fetchLatestSignInOtp(email)
  await submitOtpCode(page, otp)
  await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 })
}

export async function enterOtpCode(page: Page, otp: string) {
  const digitInputs = page.locator('input[inputmode="numeric"]')
  const normalized = otp.replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill(normalized[i] ?? '')
  }
}

export async function submitOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6)
  await enterOtpCode(page, normalized)

  const verifyButton = page.getByRole('button', { name: 'Verify' })
  try {
    await expect(verifyButton).toBeEnabled({ timeout: 1500 })
    await verifyButton.click()
    return
  } catch {
    await page.locator('input[name="otp"]').evaluate((input, value) => {
      if (!(input instanceof HTMLInputElement)) return
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      const form = input.closest('form')
      if (form instanceof HTMLFormElement) {
        form.requestSubmit()
      }
    }, normalized)
  }
}
