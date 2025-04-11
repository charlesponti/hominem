import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import type { Credentials } from 'google-auth-library'

interface GoogleToken {
  access_token: string
  refresh_token?: string
  expires_at?: string
}

/**
 * Manages Google OAuth tokens for users
 */
export class GoogleTokenManager {
  /**
   * Get cached Redis key for user's Google tokens
   */
  private getTokenKey(userId: string): string {
    return `user:${userId}:google:tokens`
  }

  /**
   * Store Google tokens for a user
   */
  async storeTokens(userId: string, tokens: GoogleToken): Promise<void> {
    try {
      const tokenKey = this.getTokenKey(userId)
      await redis.set(tokenKey, JSON.stringify(tokens), 'EX', this.getExpirySeconds(tokens))

      logger.debug(`Stored Google tokens for user: ${userId}`)
    } catch (error) {
      logger.error('Failed to store Google tokens:', error)
      throw new Error('Failed to store authentication tokens')
    }
  }

  /**
   * Retrieve Google tokens for a user
   */
  async getTokens(userId: string): Promise<GoogleToken | null> {
    try {
      const tokenKey = this.getTokenKey(userId)
      const tokensJson = await redis.get(tokenKey)

      if (!tokensJson) {
        return null
      }

      return JSON.parse(tokensJson) as GoogleToken
    } catch (error) {
      logger.error('Failed to retrieve Google tokens:', error)
      return null
    }
  }

  /**
   * Update tokens with refreshed credentials
   */
  async updateTokens(userId: string, credentials: Credentials): Promise<void> {
    try {
      const existingTokens = await this.getTokens(userId)

      if (!existingTokens) {
        throw new Error('No existing tokens found')
      }

      const updatedTokens = {
        ...existingTokens,
        access_token: credentials.access_token || existingTokens.access_token,
        expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : existingTokens.expires_at,
      }

      await this.storeTokens(userId, updatedTokens)
    } catch (error) {
      logger.error('Failed to update Google tokens:', error)
      throw new Error('Failed to update authentication tokens')
    }
  }

  /**
   * Delete tokens for a user
   */
  async deleteTokens(userId: string): Promise<void> {
    try {
      const tokenKey = this.getTokenKey(userId)
      await redis.del(tokenKey)
      logger.debug(`Deleted Google tokens for user: ${userId}`)
    } catch (error) {
      logger.error('Failed to delete Google tokens:', error)
      throw new Error('Failed to delete authentication tokens')
    }
  }

  /**
   * Calculate token expiry time in seconds
   * Default to 1 hour if no expiry is provided
   */
  private getExpirySeconds(tokens: GoogleToken): number {
    if (!tokens.expires_at) {
      return 3600 // Default 1 hour
    }

    const expiresAt = new Date(tokens.expires_at).getTime()
    const now = Date.now()
    const ttlMs = expiresAt - now

    // Use token expiry or 1 hour, whichever is greater
    return Math.max(Math.floor(ttlMs / 1000), 3600)
  }
}

// Singleton instance
export const tokenManager = new GoogleTokenManager()
