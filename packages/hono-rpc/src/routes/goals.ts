import {
  archiveGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from '@hominem/services';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import {
  GoalCreateInputSchema,
  GoalUpdateInputSchema,
  GoalListQuerySchema,
  type GoalListOutput,
  type GoalGetOutput,
  type GoalCreateOutput,
  type GoalUpdateOutput,
  type GoalArchiveOutput,
  type GoalDeleteOutput,
  type GoalJson,
} from '../types/goals.types';

export const goalsRoutes = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, zValidator('query', GoalListQuerySchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.valid('query');

      const showArchived = query.showArchived === 'true';
      const sortBy = (query.sortBy as 'priority' | 'dueDate' | 'createdAt') || 'priority';
      const category = query.category;

      const goals = await listGoals({
        userId,
        showArchived,
        sortBy,
        category,
      });
      return c.json<GoalListOutput>(success(goals as GoalJson[]));
    } catch (err) {
      console.error('[goals.list] error:', err);
      return c.json<GoalListOutput>(error('INTERNAL_ERROR', 'Failed to list goals'), 500);
    }
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await getGoal(id, userId);
      if (!goal) {
        return c.json<GoalGetOutput>(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json<GoalGetOutput>(success(goal as GoalJson));
    } catch (err) {
      console.error('[goals.get] error:', err);
      return c.json<GoalGetOutput>(error('INTERNAL_ERROR', 'Failed to get goal'), 500);
    }
  })

  // Create goal
  .post('/', authMiddleware, zValidator('json', GoalCreateInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const data = c.req.valid('json');

      const goal = await createGoal({ ...data, userId });
      return c.json<GoalCreateOutput>(success(goal as GoalJson), 201);
    } catch (err) {
      console.error('[goals.create] error:', err);
      return c.json<GoalCreateOutput>(error('INTERNAL_ERROR', 'Failed to create goal'), 500);
    }
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', GoalUpdateInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const data = c.req.valid('json');

      const goal = await updateGoal(id, userId, data);
      if (!goal) {
        return c.json<GoalUpdateOutput>(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json<GoalUpdateOutput>(success(goal as GoalJson));
    } catch (err) {
      console.error('[goals.update] error:', err);
      return c.json<GoalUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update goal'), 500);
    }
  })

  // Archive goal
  .post('/:id/archive', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await archiveGoal(id, userId);
      if (!goal) {
        return c.json<GoalArchiveOutput>(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json<GoalArchiveOutput>(success(goal as GoalJson));
    } catch (err) {
      console.error('[goals.archive] error:', err);
      return c.json<GoalArchiveOutput>(error('INTERNAL_ERROR', 'Failed to archive goal'), 500);
    }
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await deleteGoal(id, userId);
      if (!goal) {
        return c.json<GoalDeleteOutput>(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json<GoalDeleteOutput>(success(goal as GoalJson));
    } catch (err) {
      console.error('[goals.delete] error:', err);
      return c.json<GoalDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete goal'), 500);
    }
  });
