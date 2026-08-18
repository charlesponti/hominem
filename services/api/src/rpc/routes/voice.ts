import { randomUUID } from 'node:crypto';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import { VoiceCleanupInputSchema } from '../../schemas/voice.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { cleanupVoiceInput, shouldBypassVoiceCleanup } from './voice-cleanup.service';

const authenticatedVoiceRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .use('/cleanup', rateLimitMiddleware({ bucket: 'voice-cleanup', windowSec: 60, max: 30 }))
  .post('/cleanup', zValidator('json', VoiceCleanupInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');
    const bypassed = shouldBypassVoiceCleanup(input.rawText);

    if (!bypassed) {
      await assertUnderMonthlyUsageLimit(userId);
    }

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    const result = await cleanupVoiceInput(input);
    if (result.kind === 'provider-error') {
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'voice_cleanup',
        operation: 'structured_output',
        status: 'failed',
        error: result.error,
        durationMs: getDurationMs(),
        metadata: {
          source: input.source,
          locale: input.locale ?? null,
        },
      });
      return c.json({ message: result.message }, result.status);
    }

    if (!bypassed) {
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'voice_cleanup',
        operation: 'structured_output',
        usage: result.usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
        metadata: {
          source: input.source,
          locale: input.locale ?? null,
        },
      });
    }

    return c.json(result.output);
  });

export const voiceRoutes = authenticatedVoiceRoutes;
