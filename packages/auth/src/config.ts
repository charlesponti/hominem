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
  const oauthEnabled = process.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

  return {
    useMockAuth,
    oauthEnabled,
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
 * Check if OAuth authentication is enabled
 */
export function isOAuthEnabled(): boolean {
  return getAuthConfig().oauthEnabled
}

/**
 * Get the current auth provider name for logging/debugging
 */
export function getCurrentAuthProvider(): 'mock' | 'google' {
  return isMockAuthEnabled() ? 'mock' : 'google'
}
