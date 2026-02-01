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
  type GoalOutput,
} from '../types/goals.types';

export const goalsRoutes = new Hono<AppContext>()
  // ListOutput goals
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
      ...(category && { category }),
    });
    return c.json<GoalListOutput>(goals as GoalOutput[]);
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await getGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('GoalOutput not found');
    }
    return c.json<GoalGetOutput>(goal as GoalOutput);
  })

  // Create goal
  .post('/', authMiddleware, zValidator('json', GoalCreateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const goal = await createGoal({ ...data, userId });
    return c.json<GoalCreateOutput>(goal as GoalOutput, 201);
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', GoalUpdateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const goal = await updateGoal(id, userId, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.goalCategory !== undefined && { goalCategory: data.goalCategory }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.milestones !== undefined && { milestones: data.milestones }),
    });
    if (!goal) {
      throw new NotFoundError('GoalOutput not found');
    }
    return c.json<GoalUpdateOutput>(goal as GoalOutput);
  })

  // Archive goal
  .post('/:id/archive', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await archiveGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('GoalOutput not found');
    }
    return c.json<GoalArchiveOutput>(goal as GoalOutput);
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const goal = await deleteGoal(id, userId);
    if (!goal) {
      throw new NotFoundError('GoalOutput not found');
    }
    return c.json<GoalDeleteOutput>(goal as GoalOutput);
  });
