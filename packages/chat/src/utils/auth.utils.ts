import { env } from '@hominem/services/env';

import { ChatError } from '../service/chat.service';

/**
 * Authentication utilities for chat service
 */
export class AuthUtils {
  /**
   * Validate user ID
   */
  static validateUserId(userId: string | undefined | null) {
    if (!userId || userId === 'anonymous') {
      throw new ChatError('AUTH_ERROR', 'User ID is required');
    }
    return userId;
  }

  /**
   * Validate chat ownership
   */
  static validateChatOwnership(chatUserId: string, requestingUserId: string) {
    if (chatUserId !== requestingUserId) {
      throw new ChatError('AUTH_ERROR', 'Access denied to this chat');
    }
  }

  /**
   * Validate message ownership
   */
  static validateMessageOwnership(messageUserId: string, requestingUserId: string) {
    if (messageUserId !== requestingUserId) {
      throw new ChatError('AUTH_ERROR', 'Access denied to this message');
    }
  }

  /**
   * Check if user is anonymous
   */
  static isAnonymousUser(userId: string | undefined | null): boolean {
    return !userId || userId === 'anonymous';
  }

  /**
   * Extract user ID from request headers
   */
  static extractUserIdFromHeaders(headers: Record<string, string>) {
    // Check for test mode header
    if (env.NODE_ENV === 'test') {
      return headers['x-user-id'] || null;
    }

    // Check for authorization header
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // In a real implementation, you would validate the token here
    // For now, we'll return null to indicate no valid user
    return null;
  }

  /**
   * Validate request authentication
   */
  static validateRequest(
    headers: Record<string, string>,
    requireAuth = true,
  ): { userId: string | null; isAuthenticated: boolean } {
    const userId = AuthUtils.extractUserIdFromHeaders(headers);
    const isAuthenticated = !!userId;

    if (requireAuth && !isAuthenticated) {
      throw new ChatError('AUTH_ERROR', 'Authentication required');
    }

    return { userId, isAuthenticated };
  }
}
