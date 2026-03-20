import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STEP_UP_ACTIONS } from '@hominem/auth/step-up-actions'
import type { HominemUser } from '@hominem/auth/server'

import type { AppContext } from '../src/middleware/auth'
import { apiErrorHandler } from '../src/middleware/error'
import { accountsRoutes } from '../src/routes/finance.accounts'

const proofStore = vi.hoisted(() => new Map<string, string>())

vi.mock('@hominem/services/redis', () => ({
  redis: {
    get: vi.fn(async (key: string) => proofStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      proofStore.set(key, value)
      return 'OK'
    }),
  },
}))

const user: HominemUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'finance@example.com',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createAuthedApp() {
  return new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use('*', async (c, next) => {
      c.set('user', user)
      c.set('userId', user.id)
      c.set('auth', {
        sub: user.id,
        sid: 'session-1',
        scope: ['api:read', 'api:write'],
        role: 'user',
        amr: ['email_otp'],
        authTime: Math.floor(Date.now() / 1000) - 3600,
      })
      await next()
    })
    .route('/accounts', accountsRoutes)
}

describe('finance account delete step-up enforcement', () => {
  beforeEach(() => {
    proofStore.clear()
  })

  it('blocks account deletion without fresh passkey step-up', async () => {
    const app = createAuthedApp()

    const response = await app.request('http://localhost/accounts/delete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'step_up_required',
      action: STEP_UP_ACTIONS.FINANCE_ACCOUNT_DELETE,
    })
  })
})
