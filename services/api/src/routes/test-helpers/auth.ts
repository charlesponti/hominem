import { getSetCookieHeaders } from '@hominem/utils/headers'

export interface AppRequester {
  request: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>
}

interface OtpResponse {
  otp: string
}

export async function importServer() {
  const module = await import('../../server')
  return module.createServer
}

export async function requestOtp(app: AppRequester, email: string) {
  return app.request('http://localhost/api/auth/email-otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      type: 'sign-in',
    }),
  })
}

export async function fetchOtp(app: AppRequester, email: string) {
  const response = await app.request(
    `http://localhost/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
    {
      method: 'GET',
      headers: {
        'x-e2e-auth-secret': 'otp-secret',
      },
    },
  )

  return (await response.json()) as OtpResponse
}

export function toCookieHeader(setCookieValues: string[]) {
  return setCookieValues
    .map((value) => value.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('; ')
}

export async function signInWithEmailOtp(app: AppRequester, email: string) {
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

  return {
    response,
    cookieHeader: toCookieHeader(getSetCookieHeaders(response.headers)),
    otp,
  }
}

export function requestJson(input: {
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
