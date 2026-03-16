import { expect, test } from '@playwright/test'

import {
  createAuthTestEmail,
  signInWithEmailOtp,
} from './auth.flow-helpers'

test.describe('Notes: HomeView → chat.$chatId critical path', () => {
  test('authenticated user reaches HomeView with HyperForm', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-home-lifecycle')

    await signInWithEmailOtp(page, email, /\/home/)

    await page.goto('/home')
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })

    // HyperForm should be present
    const hyperFormInput = page.getByTestId('hyper-form-input')
    await expect(hyperFormInput).toBeVisible({ timeout: 10_000 })
  })

  test('HyperForm primary action creates a chat and navigates to it', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-think')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const hyperFormInput = page.getByTestId('hyper-form-input')
    await expect(hyperFormInput).toBeVisible({ timeout: 10_000 })
    await hyperFormInput.fill('What should I focus on today?')

    const primaryButton = page.getByTestId('hyper-form-primary')
    await expect(primaryButton).toBeVisible({ timeout: 5_000 })
    await primaryButton.click()

    // Should navigate to a chat session
    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Chat input (HyperForm in chat-continuation mode) should be present
    const chatInput = page.getByTestId('hyper-form-input')
    await expect(chatInput).toBeVisible({ timeout: 10_000 })
  })

  test('HyperForm secondary action saves note without navigating away', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-capture-save')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const hyperFormInput = page.getByTestId('hyper-form-input')
    await expect(hyperFormInput).toBeVisible({ timeout: 10_000 })
    await hyperFormInput.fill('Quick thought to save')

    // Focus the input to expand the form and reveal the secondary action
    await hyperFormInput.focus()
    const saveButton = page.getByTestId('hyper-form-secondary')
    await expect(saveButton).toBeVisible({ timeout: 5_000 })
    await saveButton.click()

    // Should stay on home after saving
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })

    // Input should be cleared after save
    await expect(hyperFormInput).toHaveValue('', { timeout: 5_000 })
  })

  test('voice input populates HyperForm input for review before sending', async ({ page, context }) => {
    await context.clearCookies()
    const email = createAuthTestEmail('notes-voice-confirm')

    await signInWithEmailOtp(page, email, /\/home/)
    await page.goto('/home')

    const hyperFormInput = page.getByTestId('hyper-form-input')
    await hyperFormInput.fill('Test session for voice input')

    const primaryButton = page.getByTestId('hyper-form-primary')
    await primaryButton.click()

    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

    // Voice mic button should be visible in HyperForm (chat-continuation mode)
    const micButton = page.getByTitle('Voice input')
    await expect(micButton).toBeVisible({ timeout: 10_000 })
    await expect(micButton).not.toBeDisabled()
  })
})
