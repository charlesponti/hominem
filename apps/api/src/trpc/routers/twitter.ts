import { db } from '@hominem/utils/db'
import { account, content } from '@hominem/utils/schema'
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '../../lib/env'
import { makeTwitterApiRequest, type TwitterAccount } from '../../lib/twitter-tokens'
import type { TwitterTweetResponse } from '../../routes/oauth.twitter.utils'
import { protectedProcedure, router } from '../index'

// Input schemas
const twitterPostSchema = z.object({
  text: z.string().min(1, 'Tweet text is required').max(280, 'Tweet must be 280 characters or less'),
  contentId: z.string().uuid().optional(),
  saveAsContent: z.boolean().default(true),
})

export const twitterRouter = router({
  // Get connected Twitter accounts
  accounts: protectedProcedure
    .query(async ({ ctx }) => {
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
  authorize: protectedProcedure
    .mutation(async () => {
      const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
      const TWITTER_REDIRECT_URI = `${env.API_URL}/api/oauth/twitter/callback`
      
      if (!TWITTER_CLIENT_ID) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Twitter client ID not configured',
        })
      }

      // Generate PKCE challenge
      const codeVerifier = crypto.randomUUID()
      const codeChallenge = codeVerifier // In a real implementation, you'd hash this

      const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI)
      authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access')
      authUrl.searchParams.set('state', crypto.randomUUID())
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'plain')

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

  // Post tweet
  post: protectedProcedure
    .input(twitterPostSchema)
    .mutation(async ({ input, ctx }) => {
      // Find user's Twitter account
      const userAccount = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, ctx.userId), eq(account.provider, 'twitter')))

      if (!userAccount.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Twitter account connected',
        })
      }

      const twitterAccount = userAccount[0] as TwitterAccount

      try {
        // Post tweet to Twitter
        const tweetResponse = await makeTwitterApiRequest(
          twitterAccount,
          'https://api.twitter.com/2/tweets',
          {
            method: 'POST',
            body: JSON.stringify({
              text: input.text,
            }),
          }
        )

        if (!tweetResponse.ok) {
          const errorData = await tweetResponse.json() as { detail?: string }
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Twitter API error: ${errorData.detail || 'Unknown error'}`,
          })
        }

        const tweetData = (await tweetResponse.json()) as TwitterTweetResponse
        const tweet = tweetData.data

        // Save as content if requested
        let savedContent = null
        if (input.saveAsContent) {
          const [savedContentRecord] = await db
            .insert(content)
            .values({
              type: 'tweet',
              title: `Tweet: ${input.text.substring(0, 50)}...`,
              content: input.text,
              userId: ctx.userId,
              socialMediaMetadata: {
                platform: 'twitter',
                externalId: tweet.id,
                url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
                publishedAt: new Date().toISOString(),
              },
            })
            .returning()
          savedContent = savedContentRecord
        }

        return {
          success: true,
          tweet: {
            data: {
              id: tweet.id,
              text: tweet.text,
              edit_history_tweet_ids: tweet.edit_history_tweet_ids,
            },
          },
          content: savedContent,
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to post tweet',
        })
      }
    }),

  // Sync tweets (placeholder for future implementation)
  sync: protectedProcedure
    .mutation(async ({ ctx }) => {
      // This would sync tweets from Twitter to the local database
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Tweet sync completed',
        synced: 0,
        total: 0,
      }
    }),
}) 
