import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import { env } from './env.js'

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = env.TWITTER_CLIENT_SECRET

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

export type TwitterAccount = {
  id: string
  userId: string
  provider: string
  providerAccountId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
  tokenType: string | null
  scope: string | null
}

/**
 * Checks if a Twitter token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: Date | null, bufferMinutes = 5): boolean {
  if (!expiresAt) return false
  const bufferTime = bufferMinutes * 60 * 1000 // Convert to milliseconds
  return new Date().getTime() >= expiresAt.getTime() - bufferTime
}

/**
 * Refreshes an expired Twitter access token using the refresh token
 */
export async function refreshTwitterToken(
  twitterAccount: TwitterAccount
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  if (!twitterAccount.refreshToken) {
    throw new Error('No refresh token available')
  }

  const refreshResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
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
  await db
    .update(account)
    .set({
      accessToken: access_token,
      refreshToken: refresh_token || twitterAccount.refreshToken,
      expiresAt: newExpiresAt,
    })
    .where(eq(account.id, twitterAccount.id))

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
  const accessToken = await getValidTwitterToken(twitterAccount)

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
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
      return response
    }
  }

  return response
}
