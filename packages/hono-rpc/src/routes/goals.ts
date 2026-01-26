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
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const milestoneSchema = z.object({
  description: z.string(),
  completed: z.boolean().default(false),
});

const createGoalSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).default('todo'),
  priority: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  milestones: z.array(milestoneSchema).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  milestones: z.array(milestoneSchema).optional(),
});

export const goalsRoutes = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query();

      const showArchived = query.showArchived === 'true';
      const sortBy = (query.sortBy as 'priority' | 'dueDate' | 'createdAt') || 'priority';
      const category = query.category;

      const goals = await listGoals({
        userId,
        showArchived,
        sortBy,
        category,
      });
      return c.json(success(goals));
    } catch (err) {
      console.error('[goals.list] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to list goals'), 500);
    }
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await getGoal(id, userId);
      if (!goal) {
        return c.json(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json(success(goal));
    } catch (err) {
      console.error('[goals.get] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to get goal'), 500);
    }
  })

  // Create goal
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = createGoalSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const goal = await createGoal({ ...parsed.data, userId });
      return c.json(success(goal), 201);
    } catch (err) {
      console.error('[goals.create] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create goal'), 500);
    }
  })

  // Update goal
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = updateGoalSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const goal = await updateGoal(id, userId, parsed.data);
      if (!goal) {
        return c.json(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json(success(goal));
    } catch (err) {
      console.error('[goals.update] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to update goal'), 500);
    }
  })

  // Archive goal
  .post('/:id/archive', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await archiveGoal(id, userId);
      if (!goal) {
        return c.json(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json(success(goal));
    } catch (err) {
      console.error('[goals.archive] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to archive goal'), 500);
    }
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const goal = await deleteGoal(id, userId);
      if (!goal) {
        return c.json(error('NOT_FOUND', 'Goal not found'), 404);
      }
      return c.json(success(goal));
    } catch (err) {
      console.error('[goals.delete] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete goal'), 500);
    }
  });
