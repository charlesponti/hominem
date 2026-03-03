/**
 * Authentication configuration factory
 * Determines whether to use mock or real authentication based on environment
 */

import type { MockAuthConfig } from './auth.types'

/**
 * Get the authentication configuration based on environment variables
 */
export function getAuthConfig(): MockAuthConfig {
  const useMockAuth = process.env.VITE_USE_MOCK_AUTH === 'true'
  const appleAuthEnabled = process.env.VITE_APPLE_AUTH_ENABLED === 'true'

  return {
    useMockAuth,
    appleAuthEnabled,
    apiBaseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
  }
}

/**
 * Check if mock authentication is enabled
 */
export function isMockAuthEnabled(): boolean {
  return getAuthConfig().useMockAuth
}

/**
 * Check if real Apple authentication is enabled
 */
export function isAppleAuthEnabled(): boolean {
  return getAuthConfig().appleAuthEnabled
}

/**
 * Get the current auth provider name for logging/debugging
 */
export function getCurrentAuthProvider(): 'mock' | 'apple' {
  return isMockAuthEnabled() ? 'mock' : 'apple'
}
