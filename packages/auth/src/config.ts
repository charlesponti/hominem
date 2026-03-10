/**
 * Authentication configuration factory
 * Determines whether to use mock or real authentication based on environment
 */

import type { MockAuthConfig } from './auth.types'

interface ProcessEnvShape {
  VITE_USE_MOCK_AUTH?: string
  VITE_GOOGLE_AUTH_ENABLED?: string
  VITE_API_BASE_URL?: string
}

interface GlobalWithProcess {
  process?: {
    env?: ProcessEnvShape
  }
}

function getProcessEnv(): ProcessEnvShape {
  const globalWithProcess = globalThis as GlobalWithProcess
  return globalWithProcess.process?.env ?? {}
}

/**
 * Get the authentication configuration based on environment variables
 */
export function getAuthConfig(): MockAuthConfig {
  const env = getProcessEnv()
  const useMockAuth = env.VITE_USE_MOCK_AUTH === 'true'
  const oauthEnabled = env.VITE_GOOGLE_AUTH_ENABLED === 'true'

  return {
    useMockAuth,
    oauthEnabled,
    apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:5000',
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
