import { describe, expect, test } from 'vitest'

import { formatAuthStatusLines } from './auth'

describe('formatAuthStatusLines', () => {
  test('returns metadata-rich active status lines for authenticated tokens', () => {
    const lines = formatAuthStatusLines(
      {
        accessToken: 'token',
        provider: 'better-auth',
        expiresAt: '2026-02-24T12:10:00.000Z',
        scopes: ['cli:read', 'cli:write'],
        sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        refreshFamilyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        issuedAt: '2026-02-24T12:00:00.000Z',
      },
      new Date('2026-02-24T12:00:00.000Z').getTime(),
    )

    expect(lines.some((line) => line.includes('Authenticated'))).toBe(true)
    expect(lines).toContain('Provider: better-auth')
    expect(lines).toContain('Expires at: 2026-02-24T12:10:00.000Z')
    expect(lines).toContain('TTL seconds: 600')
    expect(lines).toContain('Scopes: cli:read cli:write')
    expect(lines).toContain('Session ID: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(lines).toContain('Refresh Family ID: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(lines).toContain('Issued at: 2026-02-24T12:00:00.000Z')
  })

  test('returns not-authenticated line when no token exists', () => {
    const lines = formatAuthStatusLines(null)
    expect(lines.some((line) => line.includes('Not authenticated'))).toBe(true)
  })
})
