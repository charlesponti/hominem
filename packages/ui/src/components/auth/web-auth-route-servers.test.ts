import { describe, expect, it } from 'vitest'

import { createAuthEntryLoader, createAuthVerifyLoader } from './web-auth-route-servers'

describe('web auth route servers', () => {
  it('redirects authenticated auth entry requests to a safe next destination', async () => {
    const loader = createAuthEntryLoader(
      {
        title: 'Sign in',
        description: 'Continue',
        defaultRedirect: '/home',
        allowedRedirectPrefixes: ['/home', '/notes'],
      },
      async () => ({
        headers: new Headers(),
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    )

    const response = (await loader({
      request: new Request('http://localhost/auth?next=%2Fnotes%2F123'),
    })) as Response

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/notes/123')
  })

  it('redirects authenticated verify requests to a safe next destination', async () => {
    const loader = createAuthVerifyLoader(
      {
        defaultRedirect: '/home',
        allowedRedirectPrefixes: ['/home', '/notes'],
      },
      async () => ({
        headers: new Headers(),
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    )

    const response = (await loader({
      request: new Request('http://localhost/auth/verify?email=user%40example.com&next=%2Fnotes'),
    })) as Response

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/notes')
  })
})
