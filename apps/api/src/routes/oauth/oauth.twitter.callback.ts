import { db } from '@hominem/data'
import { account } from '@hominem/data/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import z from 'zod'
import { env } from '../../lib/env.js'
import {
  TWITTER_SCOPES,
  type TwitterTokenResponse,
  type TwitterUserResponse,
  getPkceVerifier,
} from '../../lib/oauth.twitter.utils.js'

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = env.TWITTER_CLIENT_SECRET
const TWITTER_REDIRECT_URI = `${env.API_URL}/api/oauth/twitter/callback`

export const oauthTwitterCallbackRoutes = new Hono()

// Handle Twitter OAuth callback
oauthTwitterCallbackRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      code: z.string(),
      state: z.string(),
    })
  ),
  async (c) => {
    try {
      const { code, state } = c.req.valid('query')

      // Extract userId from state
      const [_stateValue, userId] = state.split('.')
      if (!userId) {
        return c.redirect(`${env.NOTES_URL}/account?twitter=error&reason=invalid_state`)
      }

      // Retrieve PKCE verifier from Redis
      const codeVerifier = await getPkceVerifier(state)
      if (!codeVerifier) {
        return c.redirect(`${env.NOTES_URL}/account?twitter=error&reason=invalid_verifier`)
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: TWITTER_REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenResponse.ok) {
        console.error('Twitter token exchange failed', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
        })
        return c.redirect(`${env.NOTES_URL}/account?twitter=error&reason=token_exchange`)
      }

      const tokenData = (await tokenResponse.json()) as TwitterTokenResponse
      const { access_token, refresh_token, expires_in } = tokenData

      // Get user info from Twitter
      const userResponse = await fetch('https://api.x.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!userResponse.ok) {
        console.error('Failed to fetch Twitter user info')
        return c.redirect(`${env.NOTES_URL}/account?twitter=error&reason=user_fetch`)
      }

      const twitterUser = (await userResponse.json()) as TwitterUserResponse
      const { id: twitterUserId } = twitterUser.data

      // Check if account already exists
      const existingAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.provider, 'twitter'), eq(account.providerAccountId, twitterUserId)))
        .limit(1)

      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

      if (existingAccount.length > 0) {
        // Update existing account
        await db
          .update(account)
          .set({
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt,
          })
          .where(eq(account.id, existingAccount[0].id))
      } else {
        // Create new account record
        await db.insert(account).values({
          id: randomUUID(),
          userId,
          type: 'oauth',
          provider: 'twitter',
          providerAccountId: twitterUserId,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          tokenType: 'bearer',
          scope: TWITTER_SCOPES,
        })
      }

      // Redirect to success page
      return c.redirect(`${env.NOTES_URL}/account?twitter=connected`)
    } catch (error) {
      console.error('Twitter OAuth callback error:', error)
      return c.redirect(`${env.NOTES_URL}/account?twitter=error`)
    }
  }
)
