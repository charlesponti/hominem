import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { account, content } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { env } from '../../lib/env.js'
import {
  isTokenExpired,
  makeTwitterApiRequest,
  TWITTER_SCOPES,
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
  contentId: z.string().uuid().optional(), // Optional: link to existing content
  saveAsContent: z.boolean().default(true), // Whether to save as content record
})

// Twitter API response types
interface TwitterTweetResponse {
  data: {
    id: string
    text: string
    edit_history_tweet_ids: string[]
  }
}

interface TwitterTweetsResponse {
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

  // Test Twitter API access
  fastify.get('/test', { preHandler: [verifyAuth] }, async (request, reply) => {
    const { userId } = request

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

      const twitterAccount = userAccount[0] as TwitterAccount

      // Test with a simple user info request
      const testResponse = await makeTwitterApiRequest(
        twitterAccount,
        'https://api.twitter.com/2/users/me',
        {
          method: 'GET',
        }
      )

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}))
        return reply.code(testResponse.status).send({
          error: 'Twitter API test failed',
          status: testResponse.status,
          details: errorData,
          scopes: twitterAccount.scope,
        })
      }

      const userData = await testResponse.json()
      return {
        success: true,
        user: userData,
        scopes: twitterAccount.scope,
      }
    } catch (error) {
      fastify.log.error('Failed to test Twitter API', { error })
      return reply.code(500).send({ error: 'Failed to test Twitter API' })
    }
  })

  // Post a tweet
  fastify.post('/post', { preHandler: [verifyAuth, rateLimit] }, async (request, reply) => {
    const { userId } = request
    const { text, contentId, saveAsContent } = TwitterPostSchema.parse(request.body)

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

      fastify.log.info('Attempting to post tweet', {
        userId,
        accountId: twitterAccount.id,
        hasAccessToken: !!twitterAccount.accessToken,
        hasRefreshToken: !!twitterAccount.refreshToken,
        expiresAt: twitterAccount.expiresAt,
        scopes: twitterAccount.scope,
        textLength: text.length,
        contentId,
        saveAsContent,
      })

      // Post the tweet using the utility function that handles token refresh automatically
      const tweetResponse = await makeTwitterApiRequest(
        twitterAccount,
        'https://api.twitter.com/2/tweets',
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
        console.error(tweetResponse)
        logger.error(
          {
            status: tweetResponse.status,
            statusText: tweetResponse.statusText,
            error: errorData,
            userId,
            accountId: twitterAccount.id,
            textLength: text.length,
          },
          'Failed to post tweet'
        )
        return reply.code(400).send({
          error: 'Failed to post tweet',
          status: tweetResponse.status,
          details: errorData,
        })
      }

      const tweetData = (await tweetResponse.json()) as TwitterTweetResponse
      const tweet = tweetData.data
      fastify.log.info(`Successfully posted tweet for user ${userId}`)

      let contentRecord = null

      // Save or update content record if requested
      if (saveAsContent) {
        const tweetMetadata = {
          tweetId: tweet.id,
          url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
          status: 'posted' as const,
          postedAt: new Date().toISOString(),
        }

        if (contentId) {
          // Update existing content
          const updated = await db
            .update(content)
            .set({
              tweetMetadata,
              updatedAt: new Date().toISOString(),
            })
            .where(and(eq(content.id, contentId), eq(content.userId, userId)))
            .returning()

          contentRecord = updated[0] || null
          fastify.log.info(`Updated content record ${contentId} with tweet data`)
        } else {
          // Create new content record
          const newContent = await db
            .insert(content)
            .values({
              id: randomUUID(),
              type: 'tweet',
              title: `Tweet - ${new Date().toLocaleDateString()}`,
              content: text,
              userId,
              tweetMetadata,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .returning()

          contentRecord = newContent[0]
          fastify.log.info(`Created content record ${contentRecord.id} for tweet`)
        }
      }

      return {
        success: true,
        tweet: tweetData,
        content: contentRecord,
      }
    } catch (error) {
      fastify.log.error('Failed to post tweet', { error })
      return reply.code(500).send({ error: 'Failed to post tweet' })
    }
  })

  // Sync user's tweets from Twitter
  fastify.post('/sync', { preHandler: [verifyAuth, rateLimit] }, async (request, reply) => {
    const { userId } = request

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

      const twitterAccount = userAccount[0] as TwitterAccount

      fastify.log.info('Syncing tweets for user', {
        userId,
        accountId: twitterAccount.id,
        providerAccountId: twitterAccount.providerAccountId,
      })

      // Fetch user's recent tweets (last 50)
      const tweetsResponse = await makeTwitterApiRequest(
        twitterAccount,
        `https://api.twitter.com/2/users/${twitterAccount.providerAccountId}/tweets?max_results=50&tweet.fields=created_at,public_metrics,conversation_id,in_reply_to_user_id`,
        {
          method: 'GET',
        }
      )

      if (!tweetsResponse.ok) {
        const errorData = await tweetsResponse.json().catch(() => ({}))
        fastify.log.error('Failed to fetch tweets from Twitter', {
          status: tweetsResponse.status,
          error: errorData,
        })
        return reply.code(400).send({
          error: 'Failed to fetch tweets',
          status: tweetsResponse.status,
          details: errorData,
        })
      }

      const tweetsData = (await tweetsResponse.json()) as TwitterTweetsResponse

      if (!tweetsData.data || tweetsData.data.length === 0) {
        return {
          success: true,
          message: 'No tweets found to sync',
          synced: 0,
        }
      }

      // Check which tweets already exist in our database
      const existingTweets = await db
        .select({ tweetId: content.tweetMetadata })
        .from(content)
        .where(and(eq(content.userId, userId), eq(content.type, 'tweet')))

      const existingTweetIds = new Set(
        existingTweets
          .map(row => {
            const metadata = row.tweetId as { tweetId?: string } | null
            return metadata?.tweetId
          })
          .filter(Boolean)
      )

      // Insert new tweets as content
      const newTweets = tweetsData.data.filter(tweet => !existingTweetIds.has(tweet.id))
      const contentToInsert = newTweets.map(tweet => ({
        id: randomUUID(),
        type: 'tweet' as const,
        title: `Tweet - ${new Date(tweet.created_at).toLocaleDateString()}`,
        content: tweet.text,
        userId,
        tweetMetadata: {
          tweetId: tweet.id,
          url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
          status: 'posted' as const,
          postedAt: tweet.created_at,
          importedAt: new Date().toISOString(),
          metrics: tweet.public_metrics ? {
            retweets: tweet.public_metrics.retweet_count,
            likes: tweet.public_metrics.like_count,
            replies: tweet.public_metrics.reply_count,
            views: tweet.public_metrics.impression_count,
          } : undefined,
          inReplyTo: tweet.in_reply_to_user_id,
        },
        createdAt: tweet.created_at,
        updatedAt: new Date().toISOString(),
      }))

      let insertedCount = 0
      if (contentToInsert.length > 0) {
        await db.insert(content).values(contentToInsert)
        insertedCount = contentToInsert.length
        fastify.log.info(`Synced ${insertedCount} new tweets for user ${userId}`)
      }

      return {
        success: true,
        message: `Successfully synced ${insertedCount} new tweets`,
        synced: insertedCount,
        total: tweetsData.data.length,
      }
    } catch (error) {
      fastify.log.error('Failed to sync tweets', { error })
      return reply.code(500).send({ error: 'Failed to sync tweets' })
    }
  })

  // Debug endpoint to check token scopes
  fastify.get('/debug', { preHandler: [verifyAuth] }, async (request, reply) => {
    const { userId } = request

    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      const userAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
        .limit(1)

      if (userAccount.length === 0) {
        return reply.code(404).send({ error: 'No Twitter account connected' })
      }

      const twitterAccount = userAccount[0]

      return {
        hasAccessToken: !!twitterAccount.accessToken,
        hasRefreshToken: !!twitterAccount.refreshToken,
        scopes: twitterAccount.scope,
        expiresAt: twitterAccount.expiresAt,
        isExpired: isTokenExpired(twitterAccount.expiresAt),
      }
    } catch (error) {
      fastify.log.error('Failed to check Twitter account', { error })
      return reply.code(500).send({ error: 'Failed to check account' })
    }
  })
}

export default twitterOAuthPlugin
