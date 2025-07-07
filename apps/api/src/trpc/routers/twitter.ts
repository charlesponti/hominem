import { db } from '@hominem/data'
import { logger } from '@hominem/utils/logger'
import { account, content } from '@hominem/data/schema'
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { env } from '../../lib/env'
import {
  generateCodeChallenge,
  generateCodeVerifier,
  makeTwitterApiRequest,
  storePkceVerifier,
  TWITTER_SCOPES,
  TwitterPostSchema,
  type TwitterAccount,
  type TwitterTweetResponse,
  type TwitterTweetsResponse,
} from '../../lib/oauth.twitter.utils'
import { protectedProcedure, router } from '../index'

export const twitterRouter = router({
  // Get connected Twitter accounts
  accounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await db
      .select({
        id: account.id,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        expiresAt: account.expiresAt,
      })
      .from(account)
      .where(and(eq(account.userId, ctx.userId), eq(account.provider, 'twitter')))

    return accounts
  }),

  // Get Twitter authorization URL
  authorize: protectedProcedure.mutation(async ({ ctx }) => {
    const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
    const TWITTER_REDIRECT_URI = `${env.API_URL}/api/oauth/twitter/callback`

    if (!TWITTER_CLIENT_ID) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Twitter client ID not configured',
      })
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Generate state parameter for CSRF protection
    const state = `${randomUUID()}.${ctx.userId}`

    // Store PKCE verifier in Redis for later use in callback
    await storePkceVerifier(state, codeVerifier)

    const authUrl = new URL('https://x.com/i/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI)
    authUrl.searchParams.set('scope', TWITTER_SCOPES)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return { authUrl: authUrl.toString() }
  }),

  // Disconnect Twitter account
  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [deletedAccount] = await db
        .delete(account)
        .where(
          and(
            eq(account.id, input.accountId),
            eq(account.userId, ctx.userId),
            eq(account.provider, 'twitter')
          )
        )
        .returning()

      if (!deletedAccount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Twitter account not found',
        })
      }

      return { success: true, message: 'Twitter account disconnected' }
    }),

  // Post a tweet
  post: protectedProcedure.input(TwitterPostSchema).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId
    const { text, contentId, saveAsContent } = input

    try {
      // Find user's Twitter account
      const userAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
        .limit(1)

      if (userAccount.length === 0) {
        throw new Error('No Twitter account connected')
      }

      const twitterAccount = userAccount[0] as TwitterAccount

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
        throw new Error(`Failed to post tweet: ${tweetResponse.status}`)
      }

      const tweetData = (await tweetResponse.json()) as TwitterTweetResponse
      const tweet = tweetData.data

      let contentRecord = null

      // Save or update content record if requested
      if (saveAsContent) {
        const socialMediaMetadata = {
          platform: 'twitter',
          externalId: tweet.id,
          url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
          publishedAt: new Date().toISOString(),
        }

        if (contentId) {
          // Update existing content
          const updated = await db
            .update(content)
            .set({
              socialMediaMetadata,
              status: 'published',
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(and(eq(content.id, contentId), eq(content.userId, userId)))
            .returning()

          contentRecord = updated[0] || null
        } else {
          // Create new content record
          const newContent = await db
            .insert(content)
            .values({
              id: randomUUID(),
              type: 'tweet',
              title: `Tweet - ${new Date().toLocaleDateString()}`,
              content: text,
              status: 'published',
              socialMediaMetadata,
              userId,
              publishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .returning()

          contentRecord = newContent[0]
        }
      }

      return {
        success: true,
        tweet: tweetData,
        content: contentRecord,
      }
    } catch (error) {
      console.error('Failed to post tweet:', error)
      throw new Error('Failed to post tweet')
    }
  }),

  // Sync user's tweets from Twitter
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId

    try {
      // Find user's Twitter account
      const userAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
        .limit(1)

      if (userAccount.length === 0) {
        throw new Error('No Twitter account connected')
      }

      const twitterAccount = userAccount[0] as TwitterAccount

      // Fetch user's recent tweets (last 50)
      const params = new URLSearchParams({
        max_results: '50',
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'conversation_id',
          'in_reply_to_user_id',
        ].join(','),
      })

      const tweetsResponse = await makeTwitterApiRequest(
        twitterAccount,
        `https://api.twitter.com/2/users/${twitterAccount.providerAccountId}/tweets?${params.toString()}`,
        {
          method: 'GET',
        }
      )

      if (!tweetsResponse.ok) {
        const errorData = await tweetsResponse.json().catch(() => ({}))
        console.error('Failed to fetch tweets from Twitter', {
          status: tweetsResponse.status,
          error: errorData,
        })
        throw new Error(`Failed to fetch tweets: ${tweetsResponse.status}`)
      }

      const tweetsData = (await tweetsResponse.json()) as TwitterTweetsResponse

      if (!tweetsData.data || tweetsData.data.length === 0) {
        return { success: true, message: 'No tweets found to sync', synced: 0 }
      }

      // Check which tweets already exist in our database
      const existingTweets = await db
        .select({ socialMetadata: content.socialMediaMetadata })
        .from(content)
        .where(and(eq(content.userId, userId), eq(content.type, 'tweet')))

      const existingTweetIds = new Set(
        existingTweets
          .map((row) => {
            const metadata = row.socialMetadata as { externalId?: string } | null
            return metadata?.externalId
          })
          .filter(Boolean)
      )

      // Insert new tweets as content
      const newTweets = tweetsData.data.filter((tweet) => !existingTweetIds.has(tweet.id))
      const contentToInsert = newTweets.map((tweet) => ({
        id: randomUUID(),
        type: 'tweet' as const,
        title: `Tweet - ${new Date(tweet.created_at).toLocaleDateString()}`,
        content: tweet.text,
        status: 'published' as const,
        userId,
        socialMediaMetadata: {
          platform: 'twitter',
          externalId: tweet.id,
          url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
          publishedAt: tweet.created_at,
          metrics: tweet.public_metrics
            ? {
                reposts: tweet.public_metrics.retweet_count,
                likes: tweet.public_metrics.like_count,
                replies: tweet.public_metrics.reply_count,
                views: tweet.public_metrics.impression_count,
              }
            : undefined,
          inReplyTo: tweet.in_reply_to_user_id,
        },
        publishedAt: tweet.created_at,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      let insertedCount = 0
      if (contentToInsert.length > 0) {
        await db.insert(content).values(contentToInsert)
        insertedCount = contentToInsert.length
      }

      return {
        success: true,
        message: `Successfully synced ${insertedCount} new tweets`,
        synced: insertedCount,
        total: tweetsData.data.length,
      }
    } catch (error) {
      console.error('Failed to sync tweets:', error)
      throw new Error('Failed to sync tweets')
    }
  }),
})
