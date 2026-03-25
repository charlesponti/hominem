// Lightweight exports safe for browser contexts.
// Do NOT import server-only modules (e.g. `UserAuthService`) from this path.

export { resolveSafeAuthRedirect, getAuthCookieDomain } from './server'
export { buildAuthCallbackErrorRedirect } from './auth-error-contract'

// Re-export types that may be useful in route helpers.
export type { AuthConfig } from './types'
