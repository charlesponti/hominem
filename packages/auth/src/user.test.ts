import { describe, expect, it } from 'vitest'

import type { UserRow } from './contracts'
import { toUser } from './user'

describe('toUser', () => {
  it('maps snake_case user fields to User contract', () => {
    const source: UserRow = {
      id: 'u_1',
      email: 'user@example.com',
      name: 'User One',
      avatar_url: 'https://cdn.example.com/u_1.png',
      email_verified_at: null,
      createdat: new Date('2026-03-04T01:00:00.000Z'),
      updatedat: new Date('2026-03-04T02:00:00.000Z'),
    }

    expect(toUser(source)).toEqual({
      id: 'u_1',
      email: 'user@example.com',
      name: 'User One',
      image: 'https://cdn.example.com/u_1.png',
      createdAt: '2026-03-04T01:00:00.000Z',
      updatedAt: '2026-03-04T02:00:00.000Z',
    })
  })

  it('normalizes nullable fields to optional undefined values', () => {
    const source: UserRow = {
      id: 'u_2',
      email: 'nullable@example.com',
      name: null,
      avatar_url: null,
      email_verified_at: null,
      createdat: new Date('2026-03-04T03:00:00.000Z'),
      updatedat: new Date('2026-03-04T04:00:00.000Z'),
    }

    expect(toUser(source)).toEqual({
      id: 'u_2',
      email: 'nullable@example.com',
      name: undefined,
      image: undefined,
      createdAt: '2026-03-04T03:00:00.000Z',
      updatedAt: '2026-03-04T04:00:00.000Z',
    })
  })
})
