import { expect, test } from '@playwright/test'
import { fetchLatestSignInOtp, signInWithEmailOtp, startEmailOtpFlow } from './auth.flow-helpers'

test('email + otp app auth flow reaches authenticated finance view', async ({ page, context }) => {
  await context.clearCookies()
  const email = `finance-e2e-${Date.now()}@hominem.test`
  await signInWithEmailOtp(page, email)
  await expect(page.getByRole('heading', { name: 'Error' })).not.toBeVisible()
})

test('email + otp rejects invalid verification code', async ({ page, context }) => {
  await context.clearCookies()
  const email = `finance-e2e-invalid-${Date.now()}@hominem.test`
  await startEmailOtpFlow(page, email)

  const digitInputs = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill('1')
  }
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30000 })
  await expect(page.getByText('Verification failed. Please check your code and try again.')).toBeVisible({ timeout: 15000 })
  await expect(page).not.toHaveURL(/\/finance$/)
})
