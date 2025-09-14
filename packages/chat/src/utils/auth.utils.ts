class ChatError extends Error {
  constructor(
    public code: string,
    public message: string
  ) {
    super(message)
  }
}

/**
 * Authentication utilities for chat service
 */
export class AuthUtils {
  /**
   * Validate user ID
   */
  static validateUserId(userId: string | undefined | null): string {
    if (!userId || userId === 'anonymous') {
      throw new ChatError('UNAUTHORIZED', 'User ID is required')
    }
    return userId
  }

  /**
   * Validate chat ownership
   */
  static validateChatOwnership(chatUserId: string, requestingUserId: string): void {
    if (chatUserId !== requestingUserId) {
      throw new ChatError('UNAUTHORIZED', 'Access denied to this chat')
    }
  }

  /**
   * Validate message ownership
   */
  static validateMessageOwnership(messageUserId: string, requestingUserId: string): void {
    if (messageUserId !== requestingUserId) {
      throw new ChatError('UNAUTHORIZED', 'Access denied to this message')
    }
  }

  /**
   * Check if user is anonymous
   */
  static isAnonymousUser(userId: string | undefined | null): boolean {
    return !userId || userId === 'anonymous'
  }

  /**
   * Extract user ID from request headers
   */
  static extractUserIdFromHeaders(headers: Record<string, string>): string | null {
    // Check for test mode header
    if (process.env.NODE_ENV === 'test') {
      return headers['x-user-id'] || null
    }

    // Check for authorization header
    const authHeader = headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // In a real implementation, you would validate the token here
    // For now, we'll return null to indicate no valid user
    return null
  }

  /**
   * Validate request authentication
   */
  static validateRequest(
    headers: Record<string, string>,
    requireAuth = true
  ): { userId: string | null; isAuthenticated: boolean } {
    const userId = AuthUtils.extractUserIdFromHeaders(headers)
    const isAuthenticated = !!userId

    if (requireAuth && !isAuthenticated) {
      throw new ChatError('UNAUTHORIZED', 'Authentication required')
    }

    return { userId, isAuthenticated }
  }
}
