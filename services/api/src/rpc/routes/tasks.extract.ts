import { randomUUID } from 'node:crypto';

import { getStructuredOutputUsage } from '@hominem/ai';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import { extractTasks, extractVoiceTasks } from '../../application/task-extraction.service';
import { persistExtractedTasks } from '../../application/tasks.service';
import { ExtractTasksInputSchema, VoiceTasksInputSchema } from '../../schemas/tasks.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { TASK_EXTRACTION_PROMPT, VOICE_TASK_EXTRACTION_PROMPT } from '../prompts';

// AI task-extraction endpoints. Mounted under /tasks by tasks.ts.
export const taskExtractRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .use('/extract', rateLimitMiddleware({ bucket: 'ai-task-extract', windowSec: 60, max: 20 }))
  .post('/extract', zValidator('json', ExtractTasksInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { transcript } = c.req.valid('json');

    await assertUnderMonthlyUsageLimit(userId);

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    try {
      const { tasks, usage } = await extractTasks({ transcript }, TASK_EXTRACTION_PROMPT);
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'task_extract',
        operation: 'structured_output',
        usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
      });
      return c.json({ tasks });
    } catch (error) {
      const usage = getStructuredOutputUsage(error);
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'task_extract',
        operation: 'structured_output',
        usage,
        status: 'failed',
        error,
        durationMs: getDurationMs(),
      });

      logger.error('[ai/tasks/extract] OpenRouter error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json({ error: 'Task extraction failed' }, 500);
    }
  })
  .use('/voice', rateLimitMiddleware({ bucket: 'ai-task-voice', windowSec: 60, max: 20 }))
  .post('/voice', zValidator('json', VoiceTasksInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { transcript, referenceDate, timezone } = c.req.valid('json');

    await assertUnderMonthlyUsageLimit(userId);

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    let tasks: Awaited<ReturnType<typeof extractVoiceTasks>>['tasks'];
    try {
      const result = await extractVoiceTasks(
        { transcript, referenceDate: referenceDate ?? new Date().toISOString(), timezone },
        VOICE_TASK_EXTRACTION_PROMPT,
      );
      tasks = result.tasks;
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'voice_task_extract',
        operation: 'structured_output',
        usage: result.usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
        metadata: {
          timezone: timezone ?? null,
        },
      });
    } catch (error) {
      const usage = getStructuredOutputUsage(error);
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'voice_task_extract',
        operation: 'structured_output',
        usage,
        status: 'failed',
        error,
        durationMs: getDurationMs(),
        metadata: {
          timezone: timezone ?? null,
        },
      });

      logger.error('[ai/tasks/voice] OpenRouter error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json({ error: 'Voice task extraction failed' }, 500);
    }

    const result = await persistExtractedTasks(userId, tasks);
    return c.json(result, 201);
  });
