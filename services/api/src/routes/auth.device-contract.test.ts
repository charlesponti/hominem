import { getSetCookieHeaders } from '@hominem/utils/headers'
import { beforeEach, describe, expect, test, vi } from 'vitest'

interface AppRequester {
  request: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>
}

interface OtpResponse {
  otp: string
}

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
}

function requestJson(input: {
  app: AppRequester
  path: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Record<string, unknown>
}) {
  return input.app.request(`http://localhost${input.path}`, {
    method: input.method ?? 'GET',
    ...(input.headers ? { headers: input.headers } : {}),
    ...(input.body
      ? {
          body: JSON.stringify(input.body),
          headers: {
            'content-type': 'application/json',
            ...input.headers,
          },
        }
      : {}),
  })
}

async function importServer() {
  const module = await import('../server')
  return module.createServer
}

async function requestOtp(app: AppRequester, email: string) {
  return app.request('http://localhost/api/auth/email-otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      type: 'sign-in',
    }),
  })
}

async function fetchOtp(app: AppRequester, email: string) {
  const response = await app.request(
    `http://localhost/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
    {
      method: 'GET',
      headers: {
        'x-e2e-auth-secret': 'otp-secret',
      },
    },
  )

  expect(response.status).toBe(200)
  return (await response.json()) as OtpResponse
}

function toCookieHeader(setCookieValues: string[]) {
  return setCookieValues
    .map((value) => value.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('; ')
}

async function signInWithEmailOtp(app: AppRequester, email: string) {
  await requestOtp(app, email)
  const otp = await fetchOtp(app, email)
  const response = await app.request('http://localhost/api/auth/email-otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      otp: otp.otp,
    }),
  })

  expect(response.status).toBe(200)
  return toCookieHeader(getSetCookieHeaders(response.headers))
}

describe('auth device contract', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NODE_ENV = 'test'
    process.env.AUTH_E2E_SECRET = 'otp-secret'
    process.env.AUTH_TEST_OTP_ENABLED = 'true'
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300'
  })

  test('device authorization uses stable auth routes and forwards set-auth-token', async () => {
    const createServer = await importServer()
    const app = createServer()
    const email = `cli-device-${Date.now()}@hominem.test`
    const cookieHeader = await signInWithEmailOtp(app, email)

    const codeResponse = await requestJson({
      app,
      path: '/api/auth/device/code',
      method: 'POST',
      body: {
        client_id: 'hominem-cli',
        scope: 'cli:read',
      },
    })

    expect(codeResponse.status).toBe(200)
    const deviceCode = (await codeResponse.json()) as DeviceCodeResponse
    expect(new URL(deviceCode.verification_uri).pathname).toBe('/api/auth/device')
    expect(new URL(deviceCode.verification_uri_complete).pathname).toBe('/api/auth/device')
    expect(new URL(deviceCode.verification_uri_complete).searchParams.get('user_code')).toBe(
      deviceCode.user_code,
    )

    const verifyResponse = await requestJson({
      app,
      path: `/api/auth/device?user_code=${encodeURIComponent(deviceCode.user_code)}`,
    })

    expect(verifyResponse.status).toBe(200)
    await expect(verifyResponse.json()).resolves.toMatchObject({
      user_code: deviceCode.user_code,
      status: 'pending',
    })

    const approveResponse = await requestJson({
      app,
      path: '/api/auth/device/approve',
      method: 'POST',
      headers: {
        cookie: cookieHeader,
      },
      body: {
        userCode: deviceCode.user_code,
      },
    })

    expect(approveResponse.status).toBe(200)
    await expect(approveResponse.json()).resolves.toEqual({ success: true })

    const tokenResponse = await requestJson({
      app,
      path: '/api/auth/device/token',
      method: 'POST',
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode.device_code,
        client_id: 'hominem-cli',
      },
    })

    expect(tokenResponse.status).toBe(200)
    const bearerToken = tokenResponse.headers.get('set-auth-token')
    expect(bearerToken).toBeTruthy()

    const sessionResponse = await requestJson({
      app,
      path: '/api/auth/session',
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
    })

    expect(sessionResponse.status).toBe(200)
    await expect(sessionResponse.json()).resolves.toMatchObject({
      isAuthenticated: true,
      user: {
        email,
      },
    })
  })

  test('device approval requires an authenticated browser session', async () => {
    const createServer = await importServer()
    const app = createServer()

    const response = await requestJson({
      app,
      path: '/api/auth/device/approve',
      method: 'POST',
      body: {
        userCode: 'ABCDEFGH',
      },
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: 'unauthorized',
    })
  })

  test('device verification requires a user_code query param', async () => {
    const createServer = await importServer()
    const app = createServer()

    const response = await requestJson({
      app,
      path: '/api/auth/device',
    })

    expect(response.status).toBe(400)
  })
})
