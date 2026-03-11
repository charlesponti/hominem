import { expect, test } from '@playwright/test'

import {
  createAuthTestEmail,
  signInWithEmailOtp,
} from './auth.flow-helpers'

test.describe('Notes: HomeView → chat.$chatId critical path', () => {
  test('authenticated user reaches HomeView with CaptureBar', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-home-lifecycle')

    await signInWithEmailOtp(page, email, /\/home/)

    await page.goto('/home')
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })

    // CaptureBar should be present
    const captureInput = page.getByTestId('capture-bar-input')
    await expect(captureInput).toBeVisible({ timeout: 10_000 })
  })

  test('CaptureBar Think button creates a chat and navigates to it', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-think')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const captureInput = page.getByTestId('capture-bar-input')
    await expect(captureInput).toBeVisible({ timeout: 10_000 })
    await captureInput.fill('What should I focus on today?')

    const thinkButton = page.getByTestId('capture-bar-think')
    await expect(thinkButton).toBeVisible({ timeout: 5_000 })
    await thinkButton.click()

    // Should navigate to a chat session
    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Chat input should be present
    const chatInput = page.locator('textarea').first()
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })

  test('CaptureBar Save button persists note without navigating away', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-save')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const captureInput = page.getByTestId('capture-bar-input')
    await expect(captureInput).toBeVisible({ timeout: 10_000 })
    await captureInput.fill('Quick thought to save')

    const saveButton = page.getByTestId('capture-bar-save')
    await expect(saveButton).toBeVisible({ timeout: 5_000 })
    await saveButton.click()

    // Should stay on home after saving
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })

    // Input should be cleared after save
    await expect(captureInput).toHaveValue('', { timeout: 5_000 })
  })

  test('voice input populates chat input for review before sending', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-voice-confirm')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const captureInput = page.getByTestId('capture-bar-input')
    await captureInput.fill('Test session for voice input')

    const thinkButton = page.getByTestId('capture-bar-think')
    await thinkButton.click()

    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Voice mic button should be visible in chat input toolbar
    const micButton = page.getByTitle('Record audio')
    await expect(micButton).toBeVisible({ timeout: 10_000 })
    await expect(micButton).not.toBeDisabled()
  })
})
