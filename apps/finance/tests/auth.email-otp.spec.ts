import { expect, test } from '@playwright/test'
import { fetchLatestSignInOtp, signInWithEmailOtp, startEmailOtpFlow } from './auth.flow-helpers'

test('email + otp app auth flow reaches authenticated finance view', async ({ page }) => {
  const email = `finance-e2e-${Date.now()}@hominem.test`
  await signInWithEmailOtp(page, email)
  await expect(page.getByRole('heading', { name: 'Error' })).not.toBeVisible()
})

test('email + otp rejects invalid verification code', async ({ page }) => {
  const email = `finance-e2e-invalid-${Date.now()}@hominem.test`
  await startEmailOtpFlow(page, email)

  await page.getByLabel('Verification code').fill('111111')
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()

  await expect(page).toHaveURL(/\/auth\/email\/verify\?email=/)
  await expect(page.getByText('Verification failed. Please check your code and try again.')).toBeVisible()
  await expect(page).not.toHaveURL(/\/finance$/)
})

test('email + otp rejects expired verification code', async ({ page }) => {
  const email = `finance-e2e-expired-${Date.now()}@hominem.test`
  await startEmailOtpFlow(page, email)

  const otp = await fetchLatestSignInOtp(email)
  await page.waitForTimeout(3500)
  await page.getByLabel('Verification code').fill(otp)
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()

  await expect(page).toHaveURL(/\/auth\/email\/verify\?email=/)
  await expect(page.getByText('Verification failed. Please check your code and try again.')).toBeVisible()
  await expect(page).not.toHaveURL(/\/finance$/)
})
