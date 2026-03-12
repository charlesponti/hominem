import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { createTestCommandContext } from '../../../test/helpers/command-context'

const getStoredTokensMock = mock()
const hasValidStoredSessionMock = mock()

mock.module('@/utils/auth', () => ({
  getStoredTokens: getStoredTokensMock,
  hasValidStoredSession: hasValidStoredSessionMock,
}))

const commandModule = await import('./status')

describe('auth status command', () => {
  beforeEach(() => {
    getStoredTokensMock.mockReset()
    hasValidStoredSessionMock.mockReset()
  })

  test('reports stored token separately from remote authenticated state', async () => {
    getStoredTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stored-bearer',
      issuerBaseUrl: 'http://localhost:4040',
      provider: 'better-auth',
      scopes: ['cli:read'],
    })
    hasValidStoredSessionMock.mockResolvedValueOnce(false)

    const result = await commandModule.default.run({
      args: {},
      flags: {},
      context: createTestCommandContext(),
    })

    expect(result).toMatchObject({
      tokenStored: true,
      authenticated: false,
      issuerBaseUrl: 'http://localhost:4040',
      scopes: ['cli:read'],
    })
  })
})
