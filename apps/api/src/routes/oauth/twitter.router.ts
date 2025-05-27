import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { env } from '../../lib/env.js'
import {
  makeTwitterApiRequest,
  type TwitterAccount,
  type TwitterTokenResponse,
  type TwitterUserResponse,
} from '../../lib/twitter-tokens.js'
import { verifyAuth } from '../../middleware/auth.js'
import { rateLimit } from '../../middleware/rate-limit.js'

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
const TWITTER_CLIENT_SECRET = env.TWITTER_CLIENT_SECRET
const TWITTER_REDIRECT_URI = `${env.API_URL}/api/oauth/twitter/callback`

// OAuth 2.0 scopes for Twitter API v2
const TWITTER_SCOPES = 'tweet.read tweet.write users.read offline.access'

// PKCE utilities
function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

// In-memory store for PKCE verifiers (use Redis in production)
const pkceStore = new Map<string, string>()

// Request schemas
const TwitterCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
})

const TwitterDisconnectSchema = z.object({
  accountId: z.string().uuid(),
})

const TwitterPostSchema = z.object({
  text: z.string().min(1).max(280),
})

const twitterOAuthPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get Twitter OAuth authorization URL
  fastify.get(
    '/authorize',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        // Generate state parameter for CSRF protection
        const state = randomUUID()

        // Generate PKCE parameters
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = generateCodeChallenge(codeVerifier)

        // Store state in session or cache (for production, use Redis)
        // For now, we'll include userId in state and verify on callback
        const stateWithUser = `${state}.${userId}`

        // Store PKCE verifier for later use in callback
        pkceStore.set(stateWithUser, codeVerifier)

        const authUrl = new URL('https://x.com/i/oauth2/authorize')
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI)
        authUrl.searchParams.set('scope', TWITTER_SCOPES)
        authUrl.searchParams.set('state', stateWithUser)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')

        fastify.log.info(`Generated Twitter OAuth URL for user ${userId}`)
        return {
          success: true,
          authUrl: authUrl.toString(),
        }
      } catch (error) {
        fastify.log.error('Failed to generate Twitter OAuth URL', { error })
        return reply.code(500).send({ error: 'Failed to generate authorization URL' })
      }
    }
  )

  // Handle Twitter OAuth callback
  fastify.get('/callback', async (request, reply) => {
    try {
      const { code, state } = TwitterCallbackSchema.parse(request.query)

      // Extract userId from state
      const [stateValue, userId] = state.split('.')
      if (!userId) {
        return reply.code(400).send({ error: 'Invalid state parameter' })
      }

      // Retrieve PKCE verifier from store
      const codeVerifier = pkceStore.get(state)
      if (!codeVerifier) {
        return reply.code(400).send({ error: 'Invalid or expired state parameter' })
      }

      // Clean up the stored verifier
      pkceStore.delete(state)

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
        fastify.log.error('Twitter token exchange failed', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
        })
        return reply.code(400).send({ error: 'Token exchange failed' })
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
        fastify.log.error('Failed to fetch Twitter user info')
        return reply.code(400).send({ error: 'Failed to fetch user info' })
      }

      const twitterUser = (await userResponse.json()) as TwitterUserResponse
      const { id: twitterUserId, username, name } = twitterUser.data

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

        fastify.log.info(`Updated Twitter account for user ${userId}`)
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

        fastify.log.info(`Created Twitter account for user ${userId}`)
      }

      // Redirect to success page
      return reply.redirect(`${env.NOTES_URL}/account?twitter=connected`)
    } catch (error) {
      fastify.log.error('Twitter OAuth callback error', { error })
      return reply.redirect(`${env.NOTES_URL}/account?twitter=error`)
    }
  })

  // Get connected Twitter accounts
  fastify.get(
    '/accounts',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const accounts = await db
          .select({
            id: account.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            expiresAt: account.expiresAt,
          })
          .from(account)
          .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))

        return {
          success: true,
          accounts,
        }
      } catch (error) {
        fastify.log.error('Failed to fetch Twitter accounts', { error })
        return reply.code(500).send({ error: 'Failed to fetch accounts' })
      }
    }
  )

  // Disconnect Twitter account
  fastify.post('/disconnect', { preHandler: [verifyAuth, rateLimit] }, async (request, reply) => {
    const { userId } = request
    const { accountId } = TwitterDisconnectSchema.parse(request.body)

    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      // Verify account belongs to user
      const userAccount = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.id, accountId),
            eq(account.userId, userId),
            eq(account.provider, 'twitter')
          )
        )
        .limit(1)

      if (userAccount.length === 0) {
        return reply.code(404).send({ error: 'Account not found' })
      }

      // Delete the account
      await db.delete(account).where(eq(account.id, accountId))

      fastify.log.info(`Disconnected Twitter account ${accountId} for user ${userId}`)
      return {
        success: true,
        message: 'Twitter account disconnected',
      }
    } catch (error) {
      fastify.log.error('Failed to disconnect Twitter account', { error })
      return reply.code(500).send({ error: 'Failed to disconnect account' })
    }
  })

  // Post a tweet
  fastify.post('/post', { preHandler: [verifyAuth, rateLimit] }, async (request, reply) => {
    const { userId } = request
    const { text } = TwitterPostSchema.parse(request.body)

    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      // Find user's Twitter account
      const userAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
        .limit(1)

      if (userAccount.length === 0) {
        return reply.code(404).send({ error: 'No Twitter account connected' })
      }

      const twitterAccount = userAccount[0] as TwitterAccount // Type assertion for compatibility with utility function

      // Post the tweet using the utility function that handles token refresh automatically
      const tweetResponse = await makeTwitterApiRequest(
        twitterAccount,
        'https://api.x.com/2/tweets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
          }),
        }
      )

      if (!tweetResponse.ok) {
        const errorData = await tweetResponse.json().catch(() => ({}))
        fastify.log.error('Failed to post tweet', {
          status: tweetResponse.status,
          statusText: tweetResponse.statusText,
          error: errorData,
        })
        return reply.code(400).send({ error: 'Failed to post tweet' })
      }

      const tweetData = await tweetResponse.json()
      fastify.log.info(`Successfully posted tweet for user ${userId}`)

      return {
        success: true,
        tweet: tweetData,
      }
    } catch (error) {
      fastify.log.error('Failed to post tweet', { error })
      return reply.code(500).send({ error: 'Failed to post tweet' })
    }
  })
}

export default twitterOAuthPlugin
