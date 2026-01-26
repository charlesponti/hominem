import {
  deleteAccountForUser,
  getAccountByUserAndProvider,
  listAccountsByProvider,
} from '@hominem/auth/server';
import { ContentService } from '@hominem/notes-services';
import { error, success } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  twitterPostSchema,
  type TwitterAccountsListOutput,
  type TwitterAuthorizeOutput,
  type TwitterDisconnectOutput,
  type TwitterPostOutput,
  type TwitterPostInput,
  type TwitterSyncOutput,
  type TwitterTweet,
} from '../types/twitter.types';

// Twitter OAuth and API utilities
const TWITTER_SCOPES = 'tweet.read tweet.write users.read offline.access';

interface TwitterTweetResponse {
  data: TwitterTweet;
}

interface TwitterTweetsResponse {
  data: {
    id: string;
    text: string;
    created_at: string;
    public_metrics?: {
      retweet_count: number;
      like_count: number;
      reply_count: number;
      impression_count: number;
    };
    conversation_id?: string;
    in_reply_to_user_id?: string;
  }[];
}

const TwitterPostSchema = z.object({
  text: z.string().min(1).max(280),
  contentId: z.string().uuid().optional(),
  saveAsContent: z.boolean().default(false),
});

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateCodeChallenge(verifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  // For S256, we need to hash with SHA-256 and base64url encode
  // This is a simplified version - in production, use proper crypto
  return Buffer.from(data).toString('base64url');
}

// Simple in-memory store for PKCE verifiers (in production, use Redis)
const pkceStore = new Map<string, string>();

async function storePkceVerifier(state: string, verifier: string): Promise<void> {
  pkceStore.set(state, verifier);
  // Clean up after 10 minutes
  setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);
}

async function makeTwitterApiRequest(
  account: { accessToken: string | null },
  url: string,
  options: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${account.accessToken}`,
    },
  });
}

export const twitterRoutes = new Hono<AppContext>()
  // Get connected Twitter accounts
  .get('/accounts', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const accounts = await listAccountsByProvider(userId, 'twitter');
      // @ts-ignore: Account types might mismatch slightly but runtime is fine
      return c.json<TwitterAccountsListOutput>(success(accounts as any));
    } catch (err) {
      console.error('[twitter.accounts] error:', err);
      return c.json<TwitterAccountsListOutput>(error('INTERNAL_ERROR', 'Failed to get Twitter accounts'), 500);
    }
  })

  // Get Twitter authorization URL
  .post('/authorize', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
      const API_URL = process.env.API_URL;
      const TWITTER_REDIRECT_URI = `${API_URL}/api/oauth/twitter/callback`;

      if (!TWITTER_CLIENT_ID) {
        return c.json<TwitterAuthorizeOutput>(error('INTERNAL_ERROR', 'Twitter client ID not configured'), 500);
      }

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Generate state parameter for CSRF protection
      const state = `${randomUUID()}.${userId}`;

      // Store PKCE verifier for later use in callback
      await storePkceVerifier(state, codeVerifier);

      const authUrl = new URL('https://x.com/i/oauth2/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI);
      authUrl.searchParams.set('scope', TWITTER_SCOPES);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      return c.json<TwitterAuthorizeOutput>(success({ authUrl: authUrl.toString() }));
    } catch (err) {
      console.error('[twitter.authorize] error:', err);
      return c.json<TwitterAuthorizeOutput>(error('INTERNAL_ERROR', 'Failed to generate authorization URL'), 500);
    }
  })

  // Disconnect Twitter account
  .delete('/accounts/:accountId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const accountId = c.req.param('accountId');

      const deleted = await deleteAccountForUser(accountId, userId, 'twitter');

      if (!deleted) {
        return c.json<TwitterDisconnectOutput>(error('NOT_FOUND', 'Twitter account not found'), 404);
      }

      return c.json<TwitterDisconnectOutput>(success({ success: true, message: 'Twitter account disconnected' }));
    } catch (err) {
      console.error('[twitter.disconnect] error:', err);
      return c.json<TwitterDisconnectOutput>(error('INTERNAL_ERROR', 'Failed to disconnect Twitter account'), 500);
    }
  })

  // Post a tweet
  .post('/post', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = twitterPostSchema.safeParse(body);

      if (!parsed.success) {
        return c.json<TwitterPostOutput>(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const { text, contentId, saveAsContent } = parsed.data;
      const contentService = new ContentService();

      // Find user's Twitter account
      const twitterAccount = await getAccountByUserAndProvider(userId, 'twitter');

      if (!twitterAccount) {
        return c.json<TwitterPostOutput>(error('NOT_FOUND', 'No Twitter account connected'), 404);
      }

      // Post the tweet
      const tweetResponse = await makeTwitterApiRequest(
        twitterAccount,
        'https://api.twitter.com/2/tweets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        },
      );

      if (!tweetResponse.ok) {
        const errorData = await tweetResponse.json().catch(() => ({}));
        logger.error('Failed to post tweet', {
          status: tweetResponse.status,
          statusText: tweetResponse.statusText,
          error: errorData,
          userId,
          accountId: twitterAccount.id,
          textLength: text.length,
        });
        return c.json<TwitterPostOutput>(error('INTERNAL_ERROR', `Failed to post tweet: ${tweetResponse.status}`), 500);
      }

      const tweetData = (await tweetResponse.json()) as TwitterTweetResponse;
      const tweet = tweetData.data;

      let contentRecord = null;

      // Save or update content record if requested
      if (saveAsContent) {
        const socialMediaMetadata = {
          platform: 'twitter',
          externalId: tweet.id,
          url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
          publishedAt: new Date().toISOString(),
        };

        if (contentId) {
          // Update existing content
          contentRecord = await contentService.update({
            id: contentId,
            userId,
            socialMediaMetadata,
            status: 'published',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Create new content record
          contentRecord = await contentService.create({
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
          });
        }
      }

      return c.json<TwitterPostOutput>(
        success({
          success: true,
          tweet: tweetData,
          content: contentRecord,
        }),
      );
    } catch (err) {
      console.error('[twitter.post] error:', err);
      return c.json<TwitterPostOutput>(error('INTERNAL_ERROR', 'Failed to post tweet'), 500);
    }
  })

  // Sync user's tweets from Twitter
  .post('/sync', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const contentService = new ContentService();

      // Find user's Twitter account
      const twitterAccount = await getAccountByUserAndProvider(userId, 'twitter');

      if (!twitterAccount) {
        return c.json(error('NOT_FOUND', 'No Twitter account connected'), 404);
      }

      // Fetch user's recent tweets (last 50)
      const params = new URLSearchParams({
        max_results: '50',
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'conversation_id',
          'in_reply_to_user_id',
        ].join(','),
      });

      const tweetsResponse = await makeTwitterApiRequest(
        twitterAccount,
        `https://api.twitter.com/2/users/${twitterAccount.providerAccountId}/tweets?${params.toString()}`,
        {
          method: 'GET',
        },
      );

      if (!tweetsResponse.ok) {
        const errorData = await tweetsResponse.json().catch(() => ({}));
        console.error('Failed to fetch tweets from Twitter', {
          status: tweetsResponse.status,
          error: errorData,
        });
        return c.json(error('INTERNAL_ERROR', `Failed to fetch tweets: ${tweetsResponse.status}`), 500);
      }

      const tweetsData = (await tweetsResponse.json()) as TwitterTweetsResponse;

      if (!tweetsData.data || tweetsData.data.length === 0) {
        return c.json(success({ success: true, message: 'No tweets found to sync', synced: 0 }));
      }

      // Check which tweets already exist in our database
      const existingTweets = await contentService.list(userId, {
        types: ['tweet'],
      });

      const existingTweetIds = new Set(
        existingTweets
          .map((row) => {
            const metadata = row.socialMediaMetadata as {
              externalId?: string;
            } | null;
            return metadata?.externalId;
          })
          .filter(Boolean),
      );

      // Insert new tweets as content
      const newTweets = tweetsData.data.filter(
        (tweet): tweet is NonNullable<(typeof tweetsData.data)[number]> =>
          !existingTweetIds.has(tweet.id),
      );

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
      }));

      let insertedCount = 0;
      if (contentToInsert.length > 0) {
        for (const item of contentToInsert) {
          await contentService.create(item);
        }
        insertedCount = contentToInsert.length;
      }

      return c.json<TwitterSyncOutput>(
        success({
          success: true,
          message: `Successfully synced ${insertedCount} new tweets`,
          synced: insertedCount,
          total: tweetsData.data.length,
        }),
      );
    } catch (err) {
      console.error('[twitter.sync] error:', err);
      return c.json<TwitterSyncOutput>(error('INTERNAL_ERROR', 'Failed to sync tweets'), 500);
    }
  });
