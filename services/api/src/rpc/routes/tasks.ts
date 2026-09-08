import { db } from '@hominem/db/core';
import { NotFoundError } from '@hominem/db/errors';
import { TaskRepository } from '@hominem/db/tasks';
import { runInTransaction } from '@hominem/db/transaction';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { persistExtractedTasks } from '../../application/tasks.service';
import {
  CreateTaskBatchSchema,
  CreateTaskSchema,
  TaskParamSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
} from '../../schemas/tasks.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { taskExtractRoutes } from './tasks.extract';
import { timeBlockRoutes } from './tasks.parse';

const taskCoreRoutes = new Hono<AppContext>()
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
  .post('/batch', zValidator('json', CreateTaskBatchSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { tasks } = c.req.valid('json');

    const result = await persistExtractedTasks(userId, tasks);
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

// Composition root for everything mounted at /tasks (see app.ts).
// AI endpoints live in their own modules; paths and behavior are unchanged.
export const tasksRoutes = new Hono<AppContext>()
  .route('/', taskCoreRoutes)
  .route('/', taskExtractRoutes)
  .route('/', timeBlockRoutes);
