import { randomUUID } from 'node:crypto';

import {
  extractTasks,
  extractTimeBlock,
  extractVoiceTasks,
  getStructuredOutputUsage,
} from '@hominem/ai';
import { db, NotFoundError, runInTransaction, TaskRepository } from '@hominem/db';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import {
  CreateTaskBatchSchema,
  CreateTaskSchema,
  ExtractTasksInputSchema,
  ParseTimeBlockInputSchema,
  TaskParamSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  VoiceTasksInputSchema,
} from '../../schemas/tasks.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import {
  TASK_EXTRACTION_PROMPT,
  TIME_BLOCK_EXTRACTION_PROMPT,
  VOICE_TASK_EXTRACTION_PROMPT,
} from '../prompts';

function buildTaskListTitle(tasks: { title: string }[]): string {
  return tasks.length === 1 ? tasks[0].title : `${tasks.length} tasks`;
}

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const tasks = await TaskRepository.list(db, { userId });
    return c.json({ tasks });
  })
  .post('/', zValidator('json', CreateTaskSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    if (input.parentTaskId) {
      const parent = await TaskRepository.getOwned(db, input.parentTaskId, userId);
      if (!parent) {
        throw new NotFoundError('Task', { taskId: input.parentTaskId });
      }
    }

    const task = await runInTransaction(async (trx) => {
      const created = await TaskRepository.create(trx, {
        artifactType: input.artifactType,
        description: input.description ?? null,
        title: input.title,
        userId,
        priority: input.priority,
        dueAt: input.dueAt,
        durationMinutes: input.durationMinutes,
        schedulingWindowStartAt: input.schedulingWindowStartAt,
        schedulingWindowEndAt: input.schedulingWindowEndAt,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        timeZone: input.timeZone,
        location: input.location,
        parentTaskId: input.parentTaskId ?? null,
      });
      if (input.participants) {
        await TaskRepository.replaceParticipants(trx, {
          taskId: created.id,
          userId,
          participants: input.participants,
        });
      }
      return created;
    });

    return c.json(task, 201);
  })
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
  .use('/parse', rateLimitMiddleware({ bucket: 'ai-time-block-parse', windowSec: 60, max: 30 }))
  .post('/parse', zValidator('json', ParseTimeBlockInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    await assertUnderMonthlyUsageLimit(userId);

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();
    try {
      const result = await extractTimeBlock(
        {
          transcript: input.transcript,
          referenceDate: input.referenceDate ?? new Date().toISOString(),
          timezone: input.timezone,
          conversationContext: input.conversationContext,
          calendarContext: input.calendarContext,
        },
        TIME_BLOCK_EXTRACTION_PROMPT,
      );
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'time_block_extract',
        operation: 'structured_output',
        usage: result.usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
      });
      return c.json({ block: result.block });
    } catch (error) {
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'time_block_extract',
        operation: 'structured_output',
        usage: getStructuredOutputUsage(error),
        status: 'failed',
        error,
        durationMs: getDurationMs(),
      });
      logger.error('[ai/tasks/parse] OpenRouter error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json({ error: 'Time block extraction failed' }, 500);
    }
  })
  .post('/batch', zValidator('json', CreateTaskBatchSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { tasks } = c.req.valid('json');

    if (tasks.length === 1) {
      const task = await TaskRepository.create(db, {
        artifactType: 'task',
        description: tasks[0].description ?? null,
        title: tasks[0].title,
        userId,
      });
      return c.json({ parent: null, tasks: [task] }, 201);
    }

    const result = await runInTransaction((trx) =>
      TaskRepository.createBatch(trx, {
        userId,
        parentTitle: buildTaskListTitle(tasks),
        tasks,
      }),
    );

    return c.json(result, 201);
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

    if (tasks.length === 0) {
      return c.json({ parent: null, tasks: [] }, 201);
    }

    if (tasks.length === 1) {
      const task = await TaskRepository.create(db, {
        artifactType: 'task',
        description: tasks[0].description ?? null,
        title: tasks[0].title,
        userId,
        priority: tasks[0].priority,
        dueAt: tasks[0].dueAt,
      });
      return c.json({ parent: null, tasks: [task] }, 201);
    }

    const result = await runInTransaction((trx) =>
      TaskRepository.createBatch(trx, {
        userId,
        parentTitle: buildTaskListTitle(tasks),
        tasks,
      }),
    );

    return c.json(result, 201);
  })
  .get('/:id', zValidator('param', TaskParamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id } = c.req.valid('param');

    const task = await TaskRepository.load(db, id, userId);
    const children =
      task.artifactType === 'task_list'
        ? await TaskRepository.listChildren(db, { parentId: id, userId })
        : [];

    const participants = await TaskRepository.listParticipants(db, { taskId: id, userId });
    return c.json({ task, participants, children });
  })
  .patch(
    '/:id/complete',
    zValidator('param', TaskParamSchema),
    zValidator('json', UpdateTaskStatusSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id } = c.req.valid('param');
      const { completed } = c.req.valid('json');

      const task = await TaskRepository.setCompleted(db, id, userId, completed);
      return c.json(task);
    },
  )
  .patch(
    '/:id',
    zValidator('param', TaskParamSchema),
    zValidator('json', UpdateTaskSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id } = c.req.valid('param');
      const patch = c.req.valid('json');

      const task = await runInTransaction(async (trx) => {
        const updated = await TaskRepository.update(trx, id, userId, patch);
        if (patch.participants) {
          await TaskRepository.replaceParticipants(trx, {
            taskId: id,
            userId,
            participants: patch.participants,
          });
        }
        return updated;
      });
      return c.json(task);
    },
  )
  .delete('/:id', zValidator('param', TaskParamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id } = c.req.valid('param');

    const task = await TaskRepository.remove(db, id, userId);
    return c.json(task);
  });
