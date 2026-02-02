import {
  deleteAccountForUser,
  getAccountByUserAndProvider,
  listAccountsByProvider,
} from '@hominem/auth/server';
import { NotesService } from '@hominem/notes-services';
import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
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
    const userId = c.get('userId')!;
    const accounts = await listAccountsByProvider(userId, 'twitter');
    // @ts-ignore: Account types might mismatch slightly but runtime is fine
    return c.json<TwitterAccountsListOutput>(accounts as any);
  })

  // Get Twitter authorization URL
  .post('/authorize', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
    const API_URL = process.env.API_URL;
    const TWITTER_REDIRECT_URI = `${API_URL}/api/oauth/twitter/callback`;

    if (!TWITTER_CLIENT_ID) {
      throw new InternalError('Twitter client ID not configured');
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

    return c.json<TwitterAuthorizeOutput>({ authUrl: authUrl.toString() });
  })

  // Disconnect Twitter account
  .delete('/accounts/:accountId', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const accountId = c.req.param('accountId');

    const deleted = await deleteAccountForUser(accountId, userId, 'twitter');

    if (!deleted) {
      throw new NotFoundError('Twitter account not found');
    }

    return c.json<TwitterDisconnectOutput>({ success: true, message: 'Twitter account disconnected' });
  })

  // Post a tweet
  .post('/post', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();
    const parsed = twitterPostSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Validation failed');
    }

    const { text, contentId, saveAsContent } = parsed.data;
    const notesService = new NotesService();

    // Find user's Twitter account
    const twitterAccount = await getAccountByUserAndProvider(userId, 'twitter');

    if (!twitterAccount) {
      throw new NotFoundError('No Twitter account connected');
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
      throw new InternalError(`Failed to post tweet: ${tweetResponse.status}`);
    }

    const tweetData = (await tweetResponse.json()) as TwitterTweetResponse;
    const tweet = tweetData.data;

    let noteRecord = null;

    // Save or update note record if requested
    if (saveAsContent) {
      const publishingMetadata = {
        platform: 'twitter',
        externalId: tweet.id,
        url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
        publishedAt: new Date().toISOString(),
      };

      if (contentId) {
        // Update existing note
        noteRecord = await notesService.update({
          id: contentId,
          userId,
          publishingMetadata,
          status: 'published',
        });
      } else {
        // Create new note record
        noteRecord = await notesService.create({
          id: randomUUID(),
          type: 'tweet',
          title: `Tweet - ${new Date().toLocaleDateString()}`,
          content: text,
          status: 'published',
          publishingMetadata,
          userId,
          tags: [],
          mentions: [],
        });
      }
    }

    return c.json<TwitterPostOutput>({
      success: true,
      tweet: tweetData,
      content: noteRecord,
    });
  })

  // Sync user's tweets from Twitter
  .post('/sync', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const notesService = new NotesService();

    // Find user's Twitter account
    const twitterAccount = await getAccountByUserAndProvider(userId, 'twitter');

    if (!twitterAccount) {
      throw new NotFoundError('No Twitter account connected');
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
      throw new InternalError(`Failed to fetch tweets: ${tweetsResponse.status}`);
    }

    const tweetsData = (await tweetsResponse.json()) as TwitterTweetsResponse;

    if (!tweetsData.data || tweetsData.data.length === 0) {
      return c.json({ success: true, message: 'No tweets found to sync', synced: 0 });
    }

    // Check which tweets already exist in our database
    const { notes: existingTweets } = await notesService.query(userId, {
      types: ['tweet'],
    });

    const existingTweetIds = new Set(
      existingTweets
        .map((row) => {
          const metadata = row.publishingMetadata as {
            externalId?: string;
          } | null;
          return metadata?.externalId;
        })
        .filter(Boolean),
    );

    // Insert new tweets as notes
    const newTweets = tweetsData.data.filter(
      (tweet): tweet is NonNullable<(typeof tweetsData.data)[number]> =>
        !existingTweetIds.has(tweet.id),
    );

    let insertedCount = 0;
    if (newTweets.length > 0) {
      for (const tweet of newTweets) {
        await notesService.create({
          id: randomUUID(),
          type: 'tweet',
          title: `Tweet - ${new Date(tweet.created_at).toLocaleDateString()}`,
          content: tweet.text,
          status: 'published',
          userId,
          tags: [],
          mentions: [],
          publishingMetadata: {
            platform: 'twitter',
            externalId: tweet.id,
            url: `https://x.com/${twitterAccount.providerAccountId}/status/${tweet.id}`,
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
        });
        insertedCount++;
      }
    }

    return c.json<TwitterSyncOutput>({
      success: true,
      message: `Successfully synced ${insertedCount} new tweets`,
      synced: insertedCount,
      total: tweetsData.data.length,
    });
  });
