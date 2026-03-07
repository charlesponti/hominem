import { beforeEach, describe, expect, test, vi } from 'vitest'

async function importServer() {
  const module = await import('../server')
  return module.createServer
}

async function importTestOtpStore() {
  return import('../auth/test-otp-store')
}

describe('auth test otp route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NODE_ENV = 'test'
    process.env.AUTH_TEST_OTP_ENABLED = 'true'
    process.env.AUTH_E2E_SECRET = 'otp-secret'
  })

  test('returns latest otp with valid secret', async () => {
    const otpStore = await importTestOtpStore()
    otpStore.clearTestOtpStore()
    otpStore.recordTestOtp({ email: 'route-test@example.com', otp: '555111', type: 'sign-in' })

    const createServer = await importServer()
    const app = createServer()
    const response = await app.request(
      'http://localhost/api/auth/test/otp/latest?email=route-test%40example.com',
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': 'otp-secret',
        },
      },
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { otp: string; type: string }
    expect(body.otp).toBe('555111')
    expect(body.type).toBe('sign-in')
  }, 15000)

  test('returns forbidden with wrong secret', async () => {
    const otpStore = await importTestOtpStore()
    otpStore.clearTestOtpStore()
    otpStore.recordTestOtp({ email: 'route-test@example.com', otp: '555111', type: 'sign-in' })

    const createServer = await importServer()
    const app = createServer()
    const response = await app.request(
      'http://localhost/api/auth/test/otp/latest?email=route-test%40example.com',
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': 'wrong-secret',
        },
      },
    )

    expect(response.status).toBe(403)
  }, 15000)
})
