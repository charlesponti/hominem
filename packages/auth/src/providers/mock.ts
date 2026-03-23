/**
 * Mock Authentication Provider for local development
 * This provider simulates sign-in without requiring real credentials
 */

import type { AuthResponse, Session, User } from '../auth.types'
import { MOCK_USERS, DEFAULT_MOCK_USER } from '../mock-users'

function toBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value)
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = new TextEncoder().encode(value)
  let encoded = ''

  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    encoded += chars[(chunk >> 18) & 63] ?? ''
    encoded += chars[(chunk >> 12) & 63] ?? ''
    encoded += i + 1 < bytes.length ? (chars[(chunk >> 6) & 63] ?? '') : '='
    encoded += i + 2 < bytes.length ? (chars[chunk & 63] ?? '') : '='
  }

  return encoded
}

/**
 * Generates a simple mock token (not cryptographically valid)
 * In production, tokens are validated server-side
 */
function generateMockToken(userId: string): string {
  // Simple base64-encoded token that includes the user ID
  // Format: "mock_" + base64(userId + timestamp)
  const data = `${userId}:${Date.now()}`
  return `mock_${toBase64(data)}`
}

/**
 * Generates an expiration timestamp for the mock session
 * Mock sessions expire in 24 hours
 */
function generateExpiresAt(): string {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return expiresAt.toISOString()
}

/**
 * Mock Authentication Provider
 * Simulates sign-in for local development
 */
export class MockAuthProvider {
  private selectedUser: User

  constructor(userId?: string) {
    // If a specific user ID is provided, use it; otherwise use the default
    const user = this.getUserById(userId)
    this.selectedUser = user || DEFAULT_MOCK_USER
  }

  private getUserById(userId?: string): User | undefined {
    if (!userId) return undefined
    const user = MOCK_USERS[userId as keyof typeof MOCK_USERS]
    return user
  }

  /**
   * Sign in with mock auth
   * Returns a user object and session token
   */
  async signIn(): Promise<AuthResponse> {
    // Simulate a brief network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const token = generateMockToken(this.selectedUser.id)
    const expiresAt = generateExpiresAt()

    const session: Session = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
      expires_at: expiresAt,
    }

    return {
      user: this.selectedUser,
      session,
    }
  }

  /**
   * Validate a mock token
   * Returns the user if valid, null if invalid
   */
  validateToken(token: string): User | null {
    // Simple validation: just check if it's a mock token
    if (!token.startsWith('mock_')) {
      return null
    }

    // In a real scenario, you'd decode the token and verify the signature
    // For mock auth, we just return the user since we generated the token
    return this.selectedUser
  }

  /**
   * Sign out (clears the session)
   * In a real implementation, this would also invalidate the token on the server
   */
  async signOut(): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // In mock auth, there's nothing to clean up server-side
    // Client will handle clearing localStorage
  }

  /**
   * Get the currently selected mock user
   */
  getCurrentUser(): User {
    return this.selectedUser
  }

  /**
   * Switch to a different mock user (useful for testing)
   */
  switchUser(userId: string): User {
    if (userId in MOCK_USERS) {
      const user = MOCK_USERS[userId as keyof typeof MOCK_USERS]
      if (user) {
        this.selectedUser = user
        return this.selectedUser
      }
    }
    throw new Error(`Mock user '${userId}' not found`)
  }
}

/**
 * Get available mock users for selection
 */
export function getAvailableMockUsers(): Record<string, User> {
  return { ...MOCK_USERS }
}

/**
 * Create a mock auth provider instance
 */
export function createMockAuthProvider(userId?: string): MockAuthProvider {
  return new MockAuthProvider(userId)
}
