import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { account, content } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { makeTwitterApiRequest, type TwitterAccount } from '../lib/twitter-tokens.js'
import { requireAuth } from '../middleware/auth.js'
import { TwitterPostSchema, type TwitterTweetResponse } from './oauth.twitter.utils.js'

export const oauthTwitterPostRoutes = new Hono()

// Post a tweet
oauthTwitterPostRoutes.post('/', requireAuth, zValidator('json', TwitterPostSchema), async (c) => {
  const userId = c.get('userId')
  const { text, contentId, saveAsContent } = c.req.valid('json')

  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // Find user's Twitter account
    const userAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
      .limit(1)

    if (userAccount.length === 0) {
      return c.json({ error: 'No Twitter account connected' }, 404)
    }

    const twitterAccount = userAccount[0] as TwitterAccount

    console.log('Attempting to post tweet', {
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
      return c.json(
        {
          error: 'Failed to post tweet',
          status: tweetResponse.status,
          details: errorData,
        },
        400
      )
    }

    const tweetData = (await tweetResponse.json()) as TwitterTweetResponse
    const tweet = tweetData.data
    console.log(`Successfully posted tweet for user ${userId}`)

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
        console.log(`Updated content record ${contentId} with tweet data`)
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
        console.log(`Created content record ${contentRecord.id} for tweet`)
      }
    }

    return c.json({
      success: true,
      tweet: tweetData,
      content: contentRecord,
    })
  } catch (error) {
    console.error('Failed to post tweet:', error)
    return c.json({ error: 'Failed to post tweet' }, 500)
  }
})
