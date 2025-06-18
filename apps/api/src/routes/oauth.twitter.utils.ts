import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'

// PKCE utilities
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

// In-memory store for PKCE verifiers (use Redis in production)
export const pkceStore = new Map<string, string>()

// Request schemas
export const TwitterCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
})

export const TwitterDisconnectSchema = z.object({
  accountId: z.string().uuid(),
})

export const TwitterPostSchema = z.object({
  text: z.string().min(1).max(280),
  contentId: z.string().uuid().optional(), // Optional: link to existing content
  saveAsContent: z.boolean().default(true), // Whether to save as content record
})

// Twitter API response types
export interface TwitterTweetResponse {
  data: {
    id: string
    text: string
    edit_history_tweet_ids: string[]
  }
}

export interface TwitterTweetsResponse {
  data: Array<{
    id: string
    text: string
    created_at: string
    public_metrics?: {
      retweet_count: number
      like_count: number
      reply_count: number
      impression_count: number
    }
    in_reply_to_user_id?: string
    conversation_id?: string
  }>
  meta: {
    result_count: number
    next_token?: string
  }
}
