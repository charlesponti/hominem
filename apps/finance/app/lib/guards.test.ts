import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetServerAuth } = vi.hoisted(() => ({
  mockGetServerAuth: vi.fn(),
}))

vi.mock('./auth.server', () => ({
  getServerAuth: mockGetServerAuth,
}))

import { requireAuth } from './guards'

describe('requireAuth', () => {
  beforeEach(() => {
    mockGetServerAuth.mockReset()
  })

  it('allows cookie-authenticated users without a bearer session', async () => {
    const headers = new Headers([['set-cookie', 'session=abc']])

    mockGetServerAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'finance@hominem.test' },
      session: null,
      headers,
    })

    await expect(requireAuth(new Request('http://finance.lvh.me:4444/finance'))).resolves.toEqual({
      user: { id: 'user-1', email: 'finance@hominem.test' },
      session: null,
      headers,
    })
  })

  it('redirects unauthenticated users to auth', async () => {
    mockGetServerAuth.mockResolvedValue({
      user: null,
      session: null,
      headers: new Headers(),
    })

    await expect(
      requireAuth(new Request('http://finance.lvh.me:4444/finance?view=month')),
    ).rejects.toMatchObject({
      status: 302,
      headers: expect.objectContaining({
        get: expect.any(Function),
      }),
    })

    await requireAuth(new Request('http://finance.lvh.me:4444/finance?view=month')).catch(
      (response: Response) => {
        expect(response.headers.get('Location')).toBe('/auth?next=%2Ffinance%3Fview%3Dmonth')
      },
    )
  })
})
