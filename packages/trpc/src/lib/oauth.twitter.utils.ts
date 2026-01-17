import { createHash, randomBytes } from 'node:crypto'
import { type AccountRecord, updateAccount } from '@hominem/auth'
import { logger } from '@hominem/utils/logger'
import { z } from 'zod'
import { env } from './env.js'
import { cache } from './redis'

// PKCE utilities
export function generateCodeVerifier() {
  return randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

// Redis-based PKCE store functions
export async function storePkceVerifier(state: string, codeVerifier: string): Promise<void> {
  // Store with 10 minute expiration (OAuth flows typically complete within 5-10 minutes)
  await cache.setex(`pkce:${state}`, 600, codeVerifier)
}

export async function getPkceVerifier(state: string): Promise<string | null> {
  const verifier = await cache.get(`pkce:${state}`)
  if (verifier) {
    // Delete after retrieval to prevent replay attacks
    await cache.del(`pkce:${state}`)
    return verifier
  }
  return null
}

// Request schemas

export const TwitterDisconnectSchema = z.object({
  accountId: z.uuid(),
})

export const TwitterPostSchema = z.object({
  text: z.string().min(1).max(280),
  contentId: z.uuid().optional(), // Optional: link to existing content
  saveAsContent: z.boolean().default(true), // Whether to save as content record
})

// Twitter API response types
export interface TwitterTweetResponse {
  data: {
    id: string
    text: string
    edit_history_tweet_ids: string[]
  }
}

export interface TwitterTweetsResponse {
  data: Array<{
    id: string
    text: string
    created_at: string
    public_metrics?: {
      retweet_count: number
      like_count: number
      reply_count: number
      impression_count: number
    }
    in_reply_to_user_id?: string
    conversation_id?: string
  }>
  meta: {
    result_count: number
    next_token?: string
  }
}

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = env.TWITTER_CLIENT_SECRET

// OAuth 2.0 scopes for Twitter API v2 - Request all available scopes for full functionality
export const TWITTER_SCOPES = [
  'tweet.read', // All the Tweets you can view, including Tweets from protected accounts
  'tweet.write', // Tweet and Retweet for you
  'tweet.moderate.write', // Hide and unhide replies to your Tweets
  'users.email', // Email from an authenticated user
  'users.read', // Any account you can view, including protected accounts
  'follows.read', // People who follow you and people who you follow
  'follows.write', // Follow and unfollow people for you
  'offline.access', // Stay connected to your account until you revoke access
  'space.read', // All the Spaces you can view
  'mute.read', // Accounts you've muted
  'mute.write', // Mute and unmute accounts for you
  'like.read', // Tweets you've liked and likes you can view
  'like.write', // Like and un-like Tweets for you
  'list.read', // Lists, list members, and list followers of lists you've created or are a member of, including private lists
  'list.write', // Create and manage Lists for you
  'block.read', // Accounts you've blocked
  'block.write', // Block and unblock accounts for you
  'bookmark.read', // Get Bookmarked Tweets from an authenticated user
  'bookmark.write', // Bookmark and remove Bookmarks from Tweets
  'media.write', // Upload media
].join(' ')

// Twitter API response types
export type TwitterTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope: string
}

export type TwitterUserResponse = {
  data: {
    id: string
    username: string
    name: string
  }
}

export type TwitterAccount = AccountRecord

/**
 * Checks if a Twitter token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: Date | null, bufferMinutes = 5): boolean {
  if (!expiresAt) {
    return false
  }
  const bufferTime = bufferMinutes * 60 * 1000 // Convert to milliseconds
  return Date.now() >= expiresAt.getTime() - bufferTime
}

/**
 * Refreshes an expired Twitter access token using the refresh token
 */
export async function refreshTwitterToken(twitterAccount: TwitterAccount): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}> {
  if (!twitterAccount.refreshToken) {
    throw new Error('No refresh token available')
  }

  const refreshResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString(
        'base64'
      )}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: twitterAccount.refreshToken,
    }),
  })

  if (!refreshResponse.ok) {
    const errorData = await refreshResponse.json().catch(() => ({}))
    throw new Error(
      `Failed to refresh Twitter token: ${refreshResponse.status} ${refreshResponse.statusText}`,
      {
        cause: errorData,
      }
    )
  }

  const refreshData = (await refreshResponse.json()) as TwitterTokenResponse
  const { access_token, refresh_token, expires_in } = refreshData

  // Calculate new expiration time
  const newExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

  // Update the account in the database
  await updateAccount(twitterAccount.id, {
    accessToken: access_token,
    refreshToken: refresh_token || twitterAccount.refreshToken,
    expiresAt: newExpiresAt,
  })

  return {
    accessToken: access_token,
    refreshToken: refresh_token || twitterAccount.refreshToken,
    expiresAt: newExpiresAt,
  }
}

/**
 * Gets a valid access token for a Twitter account, refreshing if necessary
 */
export async function getValidTwitterToken(twitterAccount: TwitterAccount): Promise<string> {
  // Check if token is expired or will expire soon
  if (isTokenExpired(twitterAccount.expiresAt)) {
    const { accessToken } = await refreshTwitterToken(twitterAccount)
    return accessToken
  }

  if (!twitterAccount.accessToken) {
    throw new Error('No access token available')
  }

  return twitterAccount.accessToken
}

/**
 * Makes an authenticated request to the Twitter API with automatic token refresh
 *
 * @example
 * // Post a tweet
 * const response = await makeTwitterApiRequest(
 *   twitterAccount,
 *   'https://api.x.com/2/tweets',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'Hello world!' })
 *   }
 * )
 *
 * @example
 * // Get user's tweets
 * const response = await makeTwitterApiRequest(
 *   twitterAccount,
 *   'https://api.x.com/2/users/me/tweets'
 * )
 *
 * @example
 * // Follow a user
 * const response = await makeTwitterApiRequest(
 *   twitterAccount,
 *   'https://api.x.com/2/users/{id}/following',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ target_user_id: 'target_user_id' })
 *   }
 * )
 */
export async function makeTwitterApiRequest(
  twitterAccount: TwitterAccount,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const accessToken = await getValidTwitterToken(twitterAccount)

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    logger.info('Twitter API response', {
      status: response.status,
      statusText: response.statusText,
      url,
    })

    // If we get a 401, the token might be invalid - try refreshing once
    if (response.status === 401 && twitterAccount.refreshToken) {
      try {
        const { accessToken: newToken } = await refreshTwitterToken(twitterAccount)

        // Retry the request with the new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        })
      } catch (refreshError) {
        // If refresh fails, return the original 401 response
        logger.error('Failed to refresh token:', { refreshError })
        return response
      }
    }

    return response
  } catch (error) {
    logger.error('Error in makeTwitterApiRequest:', { error })
    throw error
  }
}
