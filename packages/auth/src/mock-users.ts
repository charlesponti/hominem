/**
 * Mock user fixtures for local development
 * These users can be used to test different authentication scenarios
 */

import type { User } from './auth.types'

export type { User }

export const MOCK_USERS: Record<string, User> = {
  developer: {
    id: 'dev-1',
    email: 'developer@ponti.local',
    name: 'Developer User',
    isAdmin: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  tester: {
    id: 'qa-1',
    email: 'tester@ponti.local',
    name: 'QA Tester',
    isAdmin: false,
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  user: {
    id: 'user-1',
    email: 'user@ponti.local',
    name: 'Standard User',
    isAdmin: false,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

/**
 * Default mock user for sign-in when no specific user is selected
 */
const DEFAULT_MOCK_USER_VALUE: User = {
  id: 'dev-1',
  email: 'developer@ponti.local',
  name: 'Developer User',
  isAdmin: true,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_MOCK_USER = DEFAULT_MOCK_USER_VALUE
