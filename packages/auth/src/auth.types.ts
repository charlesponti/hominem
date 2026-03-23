/**
 * Authentication types for mock and real auth implementations
 * These types are shared between client and server
 */

import type { User, Session } from './types';

export type { User, Session };

/**
 * Request payload for sign-in endpoints
 */
export interface AuthRequest {
  provider: 'google' | 'passkey' | 'email_otp' | 'mock'
  mockUserId?: string
}

/**
 * Response payload from sign-in endpoints
 */
export interface AuthResponse {
  user: User
  session: Session
}

/**
 * Sign-out request (minimal payload, mainly for type safety)
 */
export interface SignOutRequest {}

/**
 * Configuration for authentication
 */
export interface MockAuthConfig {
  useMockAuth: boolean
  oauthEnabled: boolean
  apiBaseUrl?: string
}

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

export const DEFAULT_MOCK_USER: User = MOCK_USERS['developer']!
