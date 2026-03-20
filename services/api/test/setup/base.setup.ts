import { afterAll, beforeAll, vi } from 'vitest'

// ESM interop fix for Zod in Vitest/Bun
vi.mock('zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>()
  const z = actual.z || actual
  return {
    ...actual,
    z,
    default: z,
  }
})

process.env.NODE_ENV = 'test'
process.env.AUTH_CAPTCHA_SECRET_KEY = ''
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key'
process.env.R2_BUCKET_NAME = 'test-bucket'
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_key'
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hominem.test'
process.env.RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'Hominem Test'
process.env.SEND_EMAILS = process.env.SEND_EMAILS || 'false'
process.env.AUTH_TEST_OTP_ENABLED = process.env.AUTH_TEST_OTP_ENABLED || 'true'
process.env.AUTH_E2E_SECRET = process.env.AUTH_E2E_SECRET || 'otp-secret'

beforeAll(async () => {
  // Shared test setup lives in lane-specific files.
})

afterAll(async () => {
  // Shared test cleanup lives in lane-specific files.
})