import { google } from '@ai-sdk/google';
import { ContentStrategiesService } from '@hominem/services';
import { error, success } from '@hominem/services';
import { generateText } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  tweetGenerateSchema,
  type TweetGenerateOutput,
  type TweetGenerateInput,
} from '../types/tweet.types';

const TWEET_CHARACTER_LIMIT = 280;

// Helper function to get default strategy prompts
function getDefaultStrategyPrompt(strategy: string) {
  const defaultStrategies: Record<string, string> = {
    storytelling:
      'CONTENT STRATEGY: Storytelling - Create a narrative arc with beginning, middle, and end',
    question:
      'CONTENT STRATEGY: Question - Start with a thought-provoking question to drive engagement',
    statistic: 'CONTENT STRATEGY: Statistic - Lead with a compelling statistic or data point',
    quote: 'CONTENT STRATEGY: Quote - Transform key insights into quotable, shareable statements',
    tip: 'CONTENT STRATEGY: Tip - Present actionable advice or quick wins',
    'behind-the-scenes':
      'CONTENT STRATEGY: Behind-the-scenes - Share process, journey, or insider perspective',
    'thread-starter':
      'CONTENT STRATEGY: Thread-starter - Create intrigue to encourage thread continuation',
    controversy:
      'CONTENT STRATEGY: Controversy - Present a contrarian or debate-worthy perspective (respectfully)',
    listicle: 'CONTENT STRATEGY: Listicle - Break down content into numbered points or quick list',
    education: 'CONTENT STRATEGY: Education - Focus on teaching a concept or sharing knowledge',
  };

  return defaultStrategies[strategy] || defaultStrategies.storytelling;
}

export const tweetRoutes = new Hono<AppContext>()
  // Generate tweet
  .post('/generate', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = tweetGenerateSchema.safeParse(body);

      if (!parsed.success) {
        return c.json<TweetGenerateOutput>(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const { content, strategyType, strategy } = parsed.data;
      const contentStrategiesService = new ContentStrategiesService();

      let strategyPrompt = '';
      let strategyName = '';

      if (strategyType === 'custom') {
        // Fetch custom strategy from database
        const customStrategy = await contentStrategiesService.getById(strategy as string, userId);

        if (!customStrategy) {
          return c.json<TweetGenerateOutput>(error('NOT_FOUND', 'Custom content strategy not found'), 404);
        }

        strategyName = customStrategy.title;
        strategyPrompt = `
CUSTOM CONTENT STRATEGY: ${customStrategy.title}
Description: ${customStrategy.description || 'No description provided'}

Strategy Details:
- Topic: ${customStrategy.strategy.topic}
- Target Audience: ${customStrategy.strategy.targetAudience}
- Key Insights: ${customStrategy.strategy.keyInsights?.join(', ') || 'None specified'}

Apply this custom strategy when creating the tweet, focusing on the target audience and incorporating the strategic approach outlined above.`;
      } else {
        // Use default strategy
        strategyName = strategy as string;
        strategyPrompt = getDefaultStrategyPrompt(strategy as string);
      }

      // Create system prompt based on strategy
      const systemPrompt = `You are a social media expert specializing in creating engaging Twitter content.

TASK: Convert the provided content into a compelling tweet using the specified content strategy.

REQUIREMENTS:
- Keep it under ${TWEET_CHARACTER_LIMIT} characters
- Use an engaging and professional tone
- Follow the content strategy guidelines below
- Make it engaging and shareable
- Preserve the core message and key insights
- Use proper Twitter formatting (line breaks, emojis where appropriate)

${strategyPrompt}

Return only the tweet text, nothing else.`;

      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        system: systemPrompt,
        prompt: `Convert this content into an engaging tweet using the ${strategyName} strategy:\n\n${content}`,
        maxTokens: 100,
        temperature: 0.7,
      });

      const tweetText = result.text.trim();

      // Extract hashtags for metadata
      const hashtagRegex = /#(\w+)/g;
      const hashtags = [...tweetText.matchAll(hashtagRegex)].map((match) => match[0]);

      // Check character count
      const characterCount = tweetText.length;

      return c.json<TweetGenerateOutput>(
        success({
          text: tweetText,
          hashtags,
          characterCount,
          isOverLimit: characterCount > TWEET_CHARACTER_LIMIT,
        }),
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json<TweetGenerateOutput>(
          error('VALIDATION_ERROR', `Invalid input: ${err.issues.map((i) => i.message).join(', ')}`),
          400,
        );
      }
      console.error('[tweet.generate] error:', err);
      return c.json<TweetGenerateOutput>(error('INTERNAL_ERROR', 'Failed to generate tweet'), 500);
    }
  });
