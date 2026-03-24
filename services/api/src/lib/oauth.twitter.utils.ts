import { cache } from './redis';

export async function getPkceVerifier(state: string): Promise<string | null> {
  const verifier = await cache.get(`pkce:${state}`);
  if (verifier) {
    // Delete after retrieval to prevent replay attacks
    await cache.del(`pkce:${state}`);
    return verifier;
  }
  return null;
}

// OAuth 2.0 scopes for Twitter API v2 - Request all available scopes for full functionality
export const TWITTER_SCOPES = [
  'tweet.read', // All the Tweets you can view, including Tweets from protected accounts
  'tweet.write', // Tweet and Retweet for you
  'tweet.moderate.write', // Hide and unhide replies to your Tweets
  'users.email', // Email from an authenticated user
  'users.read', // Any account you can view, including protected accounts
  'follows.read', // People who follow you and people who you follow
  'follows.write', // Follow and unfollow people for you
  'offline.access', // Stay connected to your account until you revoke access
  'space.read', // All the Spaces you can view
  'mute.read', // Accounts you've muted
  'mute.write', // Mute and unmute accounts for you
  'like.read', // Tweets you've liked and likes you can view
  'like.write', // Like and un-like Tweets for you
  'list.read', // Lists, list members, and list followers of lists you've created or are a member of, including private lists
  'list.write', // Create and manage Lists for you
  'block.read', // Accounts you've blocked
  'block.write', // Block and unblock accounts for you
  'bookmark.read', // Get Bookmarked Tweets from an authenticated user
  'bookmark.write', // Bookmark and remove Bookmarks from Tweets
  'media.write', // Upload media
].join(' ');

// Twitter API response types
export type TwitterTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope: string;
};

export type TwitterUserResponse = {
  data: {
    id: string;
    username: string;
    name: string;
  };
};
