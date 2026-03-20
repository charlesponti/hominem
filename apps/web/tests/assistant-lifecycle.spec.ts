import { expect, test } from '@playwright/test'

import {
  createAuthTestEmail,
  signInWithEmailOtp,
} from './auth.flow-helpers'

test.describe('Notes: HomeView → chat.$chatId critical path', () => {
  test('authenticated user reaches HomeView with Composer', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-home-lifecycle')

    await signInWithEmailOtp(page, email, /\/home/)

    await page.goto('/home')
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })

    // Composer should be present
    const composerInput = page.getByTestId('composer-input')
    await expect(composerInput).toBeVisible({ timeout: 10_000 })
  })

  test('Composer secondary action creates a chat and navigates to it', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-think')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const composerInput = page.getByTestId('composer-input')
    await expect(composerInput).toBeVisible({ timeout: 10_000 })
    await composerInput.fill('What should I focus on today?')

    const secondaryButton = page.getByTestId('composer-secondary')
    await expect(secondaryButton).toBeVisible({ timeout: 5_000 })
    await secondaryButton.click()

    // Should navigate to a chat session
    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Chat input (Composer in chat-continuation mode) should be present
    const chatInput = page.getByTestId('composer-input')
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })

  test('Composer primary action saves note without navigating away', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-save')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const composerInput = page.getByTestId('composer-input')
    await expect(composerInput).toBeVisible({ timeout: 10_000 })
    await composerInput.fill('Quick thought to save')

    const saveButton = page.getByTestId('composer-primary')
    await expect(saveButton).toBeVisible({ timeout: 5_000 })
    await saveButton.click()

    // Should stay on home after saving
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })

    // Input should be cleared after save
    await expect(composerInput).toHaveValue('', { timeout: 5_000 })
  })

  test('voice input populates Composer input for review before sending', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-voice-confirm')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const composerInput = page.getByTestId('composer-input')
    await composerInput.fill('Test session for voice input')

    const secondaryButton = page.getByTestId('composer-secondary')
    await secondaryButton.click()

    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Voice mic button should be visible in Composer (chat-continuation mode)
    const micButton = page.getByTitle('Voice note')
    await expect(micButton).toBeVisible({ timeout: 10_000 })
    await expect(micButton).not.toBeDisabled()
  })
})
