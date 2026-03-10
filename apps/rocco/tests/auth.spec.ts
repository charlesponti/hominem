import { expect, test } from '@playwright/test'

import {
  createAuthTestEmail,
  fetchLatestSignInOtp,
  signInWithEmailOtp,
  startEmailOtpFlow,
  submitOtpCode,
} from './auth.flow-helpers'

test('rocco auth falls back from passkey entry to email otp successfully', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('rocco-passkey-fallback')

  await page.goto('/auth')
  const passkeyButton = page.getByRole('button', { name: /passkey/i })
  if ((await passkeyButton.count()) > 0) {
    await passkeyButton.first().click()
  }

  const emailInput = page.getByLabel('Email address')
  await expect(async () => {
    await emailInput.fill(email)
    await expect(emailInput).toHaveValue(email)
  }).toPass({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30_000 })

  const otp = await fetchLatestSignInOtp(email)
  await submitOtpCode(page, otp)
  await expect(page).toHaveURL(/\/visits$/, { timeout: 30_000 })
})

test('rocco email + otp auth flow reaches authenticated visits view', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('rocco-e2e')

  await signInWithEmailOtp(page, email, /\/visits$/)
  await expect(page).not.toHaveURL(/\/auth/)
})

test('rocco email + otp rejects invalid verification code', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('rocco-invalid')

  await startEmailOtpFlow(page, email)
  await submitOtpCode(page, '111111')

  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30_000 })
  await expect(page.getByText('Verification failed. Please check your code and try again.')).toBeVisible({ timeout: 15_000 })
})

test('rocco authenticated surfaces expose passkey enrollment controls', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('rocco-passkey-surface')

  await signInWithEmailOtp(page, email, /\/visits$/)
  await expect(page).toHaveURL(/\/visits$/)

  await page.goto('/settings/security')
  await expect(page.getByRole('button', { name: /add a passkey/i })).toBeVisible({ timeout: 15000 })
})
