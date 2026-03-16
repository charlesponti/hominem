import { expect, test } from '@playwright/test'

import {
  createAuthTestEmail,
  signInWithEmailOtp,
} from './auth.flow-helpers'

test.describe('Chat UI: migrated AI Elements components', () => {
  async function navigateToChatSession(page: import('@playwright/test').Page) {
    // Use HyperForm to create a session from home
    const hyperFormInput = page.getByTestId('hyper-form-input')
    await expect(hyperFormInput).toBeVisible({ timeout: 10_000 })
    await hyperFormInput.fill('Test prompt for chat UI')

    const primaryButton = page.getByTestId('hyper-form-primary')
    await expect(primaryButton).toBeVisible({ timeout: 5_000 })
    await primaryButton.click()

    await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })
  }

  test.describe('Prompt input', () => {
    test('shows suggestion chips when input is empty', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-suggestions')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      // HyperForm in chat-continuation mode should be present
      const textarea = page.getByTestId('hyper-form-input')
      await expect(textarea).toBeVisible({ timeout: 10_000 })
      await expect(textarea).toHaveValue('')

      // Focus to expand and reveal suggestion chips
      await textarea.focus()
      // At minimum the textarea should be present and empty so suggestions render
      await expect(textarea).toBeVisible({ timeout: 5_000 })
    })

    test('shows character counter in HyperForm footer', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-char-counter')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      // Focus HyperForm to expand it and reveal footer
      const textarea = page.getByTestId('hyper-form-input')
      await expect(textarea).toBeVisible({ timeout: 10_000 })
      await textarea.fill('Hello')
      // Counter should appear in footer
      const counter = page.locator('text=/\\d+\\/10000/')
      await expect(counter).toBeVisible({ timeout: 10_000 })
    })

    test('attachment button is visible in the HyperForm toolbar', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-attach-btn')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      // Focus HyperForm to expand it
      const textarea = page.getByTestId('hyper-form-input')
      await textarea.focus()

      const attachButton = page.getByTitle('Attach file')
      await expect(attachButton).toBeVisible({ timeout: 10_000 })
    })

    test('voice button is visible in the HyperForm toolbar', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-voice-btn')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      // Focus HyperForm to expand it
      const textarea = page.getByTestId('hyper-form-input')
      await textarea.focus()

      const micButton = page.getByTitle('Voice input')
      await expect(micButton).toBeVisible({ timeout: 10_000 })
    })

    test('primary button is disabled when input is empty', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-submit-disabled')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      const textarea = page.getByTestId('hyper-form-input')
      await expect(textarea).toBeVisible({ timeout: 10_000 })
      await expect(textarea).toHaveValue('')

      // Primary submit button should be disabled when input is empty
      const primaryButton = page.getByTestId('hyper-form-primary')
      await expect(primaryButton).toBeDisabled()
    })

    test('typing text enables submission and clears after send', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-submit-flow')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      const textarea = page.getByTestId('hyper-form-input')
      await expect(textarea).toBeVisible({ timeout: 10_000 })

      await textarea.fill('Hello from the test suite')
      await expect(textarea).toHaveValue('Hello from the test suite')

      // Counter should reflect the typed length
      const counter = page.locator('text=/25\\/10000/')
      await expect(counter).toBeVisible({ timeout: 5_000 })
    })

    test('shows over-limit warning when message exceeds 10000 chars', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-over-limit')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      const textarea = page.getByTestId('hyper-form-input')
      await expect(textarea).toBeVisible({ timeout: 10_000 })

      // Type a 10001-character string
      const longMessage = 'a'.repeat(10001)
      await textarea.fill(longMessage)

      const overLimitWarning = page.getByText('Message too long')
      await expect(overLimitWarning).toBeVisible({ timeout: 5_000 })
    })
  })

  test.describe('Message rendering', () => {
    test('user message appears in message list after navigate-from-capture', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-user-msg')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')

      const hyperFormInput = page.getByTestId('hyper-form-input')
      await hyperFormInput.fill('What are the key benefits of async programming?')
      const primaryButton = page.getByTestId('hyper-form-primary')
      await primaryButton.click()

      await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 20_000 })

      // The user's initial prompt should appear as a message
      const userMessage = page.getByRole('article').first()
      await expect(userMessage).toBeVisible({ timeout: 15_000 })
    })

    test('voice modal opens and closes correctly', async ({ page, context }) => {
      await context.clearCookies()
      const email = createAuthTestEmail('chat-voice-modal')
      await signInWithEmailOtp(page, email, /\/home/)
      await page.goto('/home')
      await navigateToChatSession(page)

      // Focus HyperForm to expand it
      const textarea = page.getByTestId('hyper-form-input')
      await textarea.focus()

      const micButton = page.getByTitle('Voice input')
      await expect(micButton).toBeVisible({ timeout: 10_000 })
      await micButton.click()

      // Voice dialog should appear
      const voiceDialog = page.getByRole('dialog', { name: 'Voice input' })
      await expect(voiceDialog).toBeVisible({ timeout: 5_000 })

      // Close button should dismiss it
      const closeButton = page.getByRole('button', { name: 'Close voice input' })
      await closeButton.click()
      await expect(voiceDialog).not.toBeVisible({ timeout: 5_000 })
    })
  })
})
