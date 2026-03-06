/**
 * Authentication types for mock and real auth implementations
 * These types are shared between client and server
 */

/**
 * User object returned by authentication
 * This matches the HominemUser structure from the existing auth package
 */
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Authentication session containing the access token
 */
export interface Session {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  expires_at: string
  refresh_token?: string
}

/**
 * Request payload for sign-in endpoints
 */
export interface AuthRequest {
  provider: 'google' | 'passkey' | 'email_otp' | 'mock'
  // For mock auth, optional user ID to specify which mock user to sign in as
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
export interface SignOutRequest {
  // Currently empty, but defined for future extensibility
}

/**
 * Configuration for authentication
 */
export interface MockAuthConfig {
  useMockAuth: boolean
  oauthEnabled: boolean
  apiBaseUrl?: string
}
