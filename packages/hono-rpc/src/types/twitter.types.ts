import * as z from 'zod';

// ============================================================================
// Data Types
// ============================================================================

export type TwitterAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  expiresAt: Date | null;
  // Note: accessToken intentionally excluded from API response for security
};

export type TwitterTweet = {
  id: string;
  text: string;
};

// ============================================================================
// ACCOUNTS
// ============================================================================

export type TwitterAccountsListOutput = TwitterAccount[];

// ============================================================================
// AUTHORIZE
// ============================================================================

export type TwitterAuthorizeOutput = { authUrl: string };

// ============================================================================
// DISCONNECT
// ============================================================================

export type TwitterDisconnectOutput = { success: boolean; message: string };

// ============================================================================
// POST TWEET
// ============================================================================

export type TwitterPostInput = {
  text: string;
  contentId?: string | undefined;
  saveAsContent?: boolean;
};

export const twitterPostSchema = z.object({
  text: z.string().min(1).max(280),
  contentId: z.string().uuid().optional(),
  saveAsContent: z.boolean().default(false),
});

export type TwitterPostOutput = {
  success: boolean;
  tweet: { data: TwitterTweet };
  content: any | null;
};

// ============================================================================
// SYNC TWEETS
// ============================================================================

export type TwitterSyncOutput = {
  success: boolean;
  message: string;
  synced: number;
  total: number;
};
