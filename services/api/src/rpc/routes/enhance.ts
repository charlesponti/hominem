import { randomUUID } from 'node:crypto';

import {
  createChatCompletion,
  ENHANCE_MODEL,
  getChatCompletionText,
  getChatCompletionUsage,
} from '@hominem/ai';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import { EnhanceTextInputSchema } from '../../schemas/enhance.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { TEXT_ENHANCE_PROMPT } from '../prompts';

export const enhanceRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .use('/enhance', rateLimitMiddleware({ bucket: 'ai-enhance', windowSec: 60, max: 30 }))
  .post('/enhance', zValidator('json', EnhanceTextInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { text, instruction } = c.req.valid('json');

    await assertUnderMonthlyUsageLimit(userId);

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    try {
      const response = await createChatCompletion({
        model: ENHANCE_MODEL,
        messages: [
          { role: 'system', content: TEXT_ENHANCE_PROMPT },
          {
            role: 'user',
            content: instruction ? `Instruction: ${instruction}\n\nText:\n${text}` : text,
          },
        ],
        temperature: 0.2,
        maxCompletionTokens: 2000,
      });
      const enhanced = {
        text: getChatCompletionText(response, text).trim() || text,
        usage: getChatCompletionUsage(response),
      };
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'text_enhance',
        operation: 'chat_completion',
        usage: enhanced.usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
        metadata: {
          instructionProvided: Boolean(instruction),
        },
      });
      return c.json({ text: enhanced.text });
    } catch (error) {
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'text_enhance',
        operation: 'chat_completion',
        status: 'failed',
        error,
        durationMs: getDurationMs(),
      });
      logger.error('[ai/enhance] OpenRouter error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json({ error: 'Enhancement failed' }, 500);
    }
  });
