import { z } from 'zod';

// ============================================================================
// GENERATE TWEET
// ============================================================================

export type TweetGenerateInput = {
  content: string;
  strategyType: 'default' | 'custom';
  strategy: string;
};

export const tweetGenerateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  strategyType: z.enum(['default', 'custom']).default('default'),
  strategy: z
    .union([
      z.enum([
        'storytelling',
        'question',
        'statistic',
        'quote',
        'tip',
        'behind-the-scenes',
        'thread-starter',
        'controversy',
        'listicle',
        'education',
      ]),
      z.string(), // Allowing generic string for UUID validation flexibility here
    ])
    .default('storytelling'),
});

export type TweetGenerateOutput = {
  text: string;
  hashtags: string[];
  characterCount: number;
  isOverLimit: boolean;
};
