import {
  archiveGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
  NotFoundError,
  ValidationError,
  InternalError,
} from '@hominem/services';
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
  type Goal,
} from '../types/goals.types';

export const goalsRoutes = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, zValidator('query', GoalListQuerySchema), async (c) => {
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
    return c.json<GoalListOutput>(goals as Goal[]);
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await getGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    return c.json<GoalGetOutput>(goal as Goal);
  })

  // Create goal
  .post('/', authMiddleware, zValidator('json', GoalCreateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const goal = await createGoal({ ...data, userId });
    return c.json<GoalCreateOutput>(goal as Goal, 201);
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', GoalUpdateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const goal = await updateGoal(id, userId, data);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    return c.json<GoalUpdateOutput>(goal as Goal);
  })

  // Archive goal
  .post('/:id/archive', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await archiveGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    return c.json<GoalArchiveOutput>(goal as Goal);
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await deleteGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    return c.json<GoalDeleteOutput>(goal as Goal);
  });
