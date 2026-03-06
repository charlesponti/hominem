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
  await page.goto('/auth/email')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send Verification Code' }).click()
  await expect(page).toHaveURL(/\/auth\/email\/verify\?email=/)
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
  await page.getByLabel('Verification code').fill(otp)
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()
  await expect(page).toHaveURL(/\/finance$/)
}
