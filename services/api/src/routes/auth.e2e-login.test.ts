import { beforeEach, describe, expect, test, vi } from 'vitest'

async function importServer() {
  const module = await import('../server')
  return module.createServer
}

describe('mobile e2e login guard', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.AUTH_E2E_ENABLED
    delete process.env.AUTH_E2E_SECRET
    delete process.env.NODE_ENV
  })

  test('returns 404 in production mode even when e2e auth flag is enabled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.AUTH_E2E_ENABLED = 'true'
    process.env.AUTH_E2E_SECRET = 'test-secret'

    const createServer = await importServer()
    const app = createServer()
    const response = await app.request('http://localhost/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-e2e-auth-secret': 'test-secret',
      },
      body: JSON.stringify({ email: 'mobile-e2e@hominem.local' }),
    })

    expect(response.status).toBe(404)
  }, 15000)

  test('returns 403 when secret is missing or invalid', async () => {
    process.env.NODE_ENV = 'development'
    process.env.AUTH_E2E_ENABLED = 'true'
    process.env.AUTH_E2E_SECRET = 'expected-secret'

    const createServer = await importServer()
    const app = createServer()
    const response = await app.request('http://localhost/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-e2e-auth-secret': 'wrong-secret',
      },
      body: JSON.stringify({ email: 'mobile-e2e@hominem.local' }),
    })

    expect(response.status).toBe(403)
  }, 15000)
})
