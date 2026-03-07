import { expect, test } from '@playwright/test'

import { createAuthTestEmail, fetchLatestSignInOtp, signInWithEmailOtp, startEmailOtpFlow } from './auth.flow-helpers'

test('notes auth falls back from passkey entry to email otp successfully', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('notes-passkey-fallback')

  await page.goto('/auth')
  await page.getByRole('button', { name: /passkey/i }).click()

  const emailInput = page.getByLabel('Email address')
  await expect(async () => {
    await emailInput.fill(email)
    await expect(emailInput).toHaveValue(email)
  }).toPass({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30_000 })

  const otp = await fetchLatestSignInOtp(email)
  const digitInputs = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < otp.length; i++) {
    await digitInputs.nth(i).fill(otp[i])
  }

  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL(/\/notes$/, { timeout: 30_000 })
})

test('notes email + otp auth flow reaches authenticated notes view', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('notes-e2e')

  await signInWithEmailOtp(page, email, /\/notes$/)
  await expect(page).not.toHaveURL(/\/auth/)
})

test('notes email + otp rejects invalid verification code', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('notes-invalid')

  await startEmailOtpFlow(page, email)
  const digitInputs = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill('1')
  }

  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30_000 })
  await expect(page.getByText('Verification failed. Please check your code and try again.')).toBeVisible({ timeout: 15_000 })
})

test('notes authenticated surfaces expose passkey enrollment controls', async ({ page, context }) => {
  await context.clearCookies()
  const email = createAuthTestEmail('notes-passkey-surface')

  await signInWithEmailOtp(page, email, /\/notes$/)
  await expect(page).toHaveURL(/\/notes$/)

  await page.goto('/settings/security')
  await expect(page.getByRole('button', { name: /add a passkey/i })).toBeVisible({ timeout: 15000 })
})
