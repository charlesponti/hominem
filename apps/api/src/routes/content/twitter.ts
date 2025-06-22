import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { account, content } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { makeTwitterApiRequest, type TwitterAccount } from '../../lib/twitter-tokens.js'
import { requireAuth } from '../../middleware/auth.js'
import {
  TwitterPostSchema,
  type TwitterTweetResponse,
  type TwitterTweetsResponse,
} from '../oauth.twitter.utils.js'

export const contentTwitterRoutes = new Hono()

// Post a tweet
contentTwitterRoutes.post(
  '/post',
  requireAuth,
  zValidator('json', TwitterPostSchema),
  async (c) => {
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

      return c.json({
        success: true,
        tweet: tweetData,
        content: contentRecord,
      })
    } catch (error) {
      console.error('Failed to post tweet:', error)
      return c.json({ error: 'Failed to post tweet' }, 500)
    }
  }
)

// Sync user's tweets from Twitter
contentTwitterRoutes.post('/sync', requireAuth, async (c) => {
  const userId = c.get('userId')

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
      console.error('Failed to fetch tweets from Twitter', {
        status: tweetsResponse.status,
        error: errorData,
      })
      return c.json(
        {
          error: 'Failed to fetch tweets',
          status: tweetsResponse.status,
          details: errorData,
        },
        400
      )
    }

    const tweetsData = (await tweetsResponse.json()) as TwitterTweetsResponse

    if (!tweetsData.data || tweetsData.data.length === 0) {
      return c.json({
        success: true,
        message: 'No tweets found to sync',
        synced: 0,
      })
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
      createdAt: tweet.created_at,
      updatedAt: new Date().toISOString(),
    }))

    let insertedCount = 0
    if (contentToInsert.length > 0) {
      await db.insert(content).values(contentToInsert)
      insertedCount = contentToInsert.length
    }

    return c.json({
      success: true,
      message: `Successfully synced ${insertedCount} new tweets`,
      synced: insertedCount,
      total: tweetsData.data.length,
    })
  } catch (error) {
    console.error('Failed to sync tweets:', error)
    return c.json({ error: 'Failed to sync tweets' }, 500)
  }
})
