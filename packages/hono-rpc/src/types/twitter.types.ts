import { z } from 'zod';
import type { ApiResult } from '@hominem/services';

// ============================================================================
// Data Types
// ============================================================================

export type TwitterAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  accessToken: string | null;
  // Add other fields as needed from Account service
};

export type TwitterTweet = {
  id: string;
  text: string;
};

// ============================================================================
// ACCOUNTS
// ============================================================================

export type TwitterAccountsListOutput = ApiResult<TwitterAccount[]>;

// ============================================================================
// AUTHORIZE
// ============================================================================

export type TwitterAuthorizeOutput = ApiResult<{ authUrl: string }>;

// ============================================================================
// DISCONNECT
// ============================================================================

export type TwitterDisconnectOutput = ApiResult<{ success: boolean; message: string }>;

// ============================================================================
// POST TWEET
// ============================================================================

export type TwitterPostInput = {
  text: string;
  contentId?: string;
  saveAsContent?: boolean;
};

export const twitterPostSchema = z.object({
  text: z.string().min(1).max(280),
  contentId: z.string().uuid().optional(),
  saveAsContent: z.boolean().default(false),
});

export type TwitterPostOutput = ApiResult<{
  success: boolean;
  tweet: { data: TwitterTweet };
  content: any | null;
}>;

// ============================================================================
// SYNC TWEETS
// ============================================================================

export type TwitterSyncOutput = ApiResult<{
  success: boolean;
  message: string;
  synced: number;
  total: number;
}>;
