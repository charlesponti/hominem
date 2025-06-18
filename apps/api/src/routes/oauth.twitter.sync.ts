import { db } from '@hominem/utils/db'
import { account, content } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { makeTwitterApiRequest, type TwitterAccount } from '../lib/twitter-tokens.js'
import { requireAuth } from '../middleware/auth.js'
import type { TwitterTweetsResponse } from './oauth.twitter.utils.js'

export const oauthTwitterSyncRoutes = new Hono()

// Sync user's tweets from Twitter
oauthTwitterSyncRoutes.post('/', requireAuth, async (c) => {
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

    console.log('Syncing tweets for user', {
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
      .select({ tweetId: content.tweetMetadata })
      .from(content)
      .where(and(eq(content.userId, userId), eq(content.type, 'tweet')))

    const existingTweetIds = new Set(
      existingTweets
        .map((row) => {
          const metadata = row.tweetId as { tweetId?: string } | null
          return metadata?.tweetId
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
      userId,
      tweetMetadata: {
        tweetId: tweet.id,
        url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
        status: 'posted' as const,
        postedAt: tweet.created_at,
        importedAt: new Date().toISOString(),
        metrics: tweet.public_metrics
          ? {
              retweets: tweet.public_metrics.retweet_count,
              likes: tweet.public_metrics.like_count,
              replies: tweet.public_metrics.reply_count,
              views: tweet.public_metrics.impression_count,
            }
          : undefined,
        inReplyTo: tweet.in_reply_to_user_id,
      },
      createdAt: tweet.created_at,
      updatedAt: new Date().toISOString(),
    }))

    let insertedCount = 0
    if (contentToInsert.length > 0) {
      await db.insert(content).values(contentToInsert)
      insertedCount = contentToInsert.length
      console.log(`Synced ${insertedCount} new tweets for user ${userId}`)
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
