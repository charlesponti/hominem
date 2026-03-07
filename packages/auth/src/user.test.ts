import { describe, expect, it } from 'vitest'

import type { UserSelect } from './contracts'
import { toHominemUser } from './user'

describe('toHominemUser', () => {
  it('maps snake_case user fields to HominemUser contract', () => {
    const source: UserSelect = {
      id: 'u_1',
      email: 'user@example.com',
      name: 'User One',
      image: 'https://cdn.example.com/u_1.png',
      is_admin: true,
      created_at: '2026-03-04T01:00:00.000Z',
      updated_at: '2026-03-04T02:00:00.000Z',
    }

    expect(toHominemUser(source)).toEqual({
      id: 'u_1',
      email: 'user@example.com',
      name: 'User One',
      image: 'https://cdn.example.com/u_1.png',
      isAdmin: true,
      createdAt: '2026-03-04T01:00:00.000Z',
      updatedAt: '2026-03-04T02:00:00.000Z',
    })
  })

  it('normalizes nullable fields to optional undefined values', () => {
    const source: UserSelect = {
      id: 'u_2',
      email: 'nullable@example.com',
      name: null,
      image: null,
      is_admin: false,
      created_at: '2026-03-04T03:00:00.000Z',
      updated_at: '2026-03-04T04:00:00.000Z',
    }

    expect(toHominemUser(source)).toEqual({
      id: 'u_2',
      email: 'nullable@example.com',
      name: undefined,
      image: undefined,
      isAdmin: false,
      createdAt: '2026-03-04T03:00:00.000Z',
      updatedAt: '2026-03-04T04:00:00.000Z',
    })
  })
})
