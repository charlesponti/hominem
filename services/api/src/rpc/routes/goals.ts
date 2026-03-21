import {
  createConsolidatedGoal,
  getConsolidatedGoalStats,
  updateConsolidatedGoal,
  getConsolidatedGoalsByUser,
  getGoalById,
  deleteGoal,
} from '@hominem/events-services';
import { NotFoundError } from '../errors';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

import {
  GoalCreateInputSchema,
  GoalUpdateInputSchema,
  GoalListQuerySchema,
  type GoalListOutput,
  type GoalGetOutput,
  type GoalCreateOutput,
  type GoalUpdateOutput,
  type GoalDeleteOutput,
  type GoalStatsOutput,
} from '@hominem/rpc/types/goals.types';

/**
 * Type predicate to check if an event is a Goal owned by a specific user
 */
function isUserGoal(event: Awaited<ReturnType<typeof getGoalById>>, userId: string): event is NonNullable<Awaited<ReturnType<typeof getGoalById>>> {
  const candidate = event as (NonNullable<Awaited<ReturnType<typeof getGoalById>>> & {
    userId?: string
    type?: string
  }) | null
  return candidate !== null && candidate.userId === userId && candidate.type === 'Goal'
}

/**
 * Goals Routes
 *
 * Consolidated goals management. All goals are stored as events with type='Goal'.
 */
export const goalsRoutes: Hono<AppContext> = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, zValidator('query', GoalListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const goals = await getConsolidatedGoalsByUser(userId, {
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.sortBy && { sortBy: query.sortBy }),
    });

    return c.json(goals);
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getGoalById(goalId, userId);
    if (!isUserGoal(goal, userId)) {
      throw new NotFoundError('Goal not found');
    }

    return c.json(goal);
  })

  // Get goal statistics
  .get('/:id/stats', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getGoalById(goalId, userId);
    if (!isUserGoal(goal, userId)) {
      throw new NotFoundError('Goal not found');
    }

    const stats = await getConsolidatedGoalStats(goalId, userId);
    return c.json(stats);
  })

  // Create goal
  .post('/', authMiddleware, zValidator('json', GoalCreateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const goal = await createConsolidatedGoal(userId, {
      title: data.title.trim(),
      ...(data.description && { description: data.description }),
      ...(data.targetValue && { targetValue: data.targetValue }),
      ...(data.unit && { unit: data.unit }),
      ...(data.goalCategory && { category: data.goalCategory }),
      ...(data.priority && { priority: data.priority }),
      ...(data.status && { status: data.status }),
      milestones: data.milestones || null,
      ...(data.tags && { tags: data.tags }),
    });

    return c.json(goal, 201);
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', GoalUpdateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');
    const data = c.req.valid('json');

    const goal = await getGoalById(goalId, userId);
    if (!isUserGoal(goal, userId)) {
      throw new NotFoundError('Goal not found');
    }

    const updated = await updateConsolidatedGoal(goalId, userId, {
      ...(data.status && { status: data.status }),
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.priority && { priority: data.priority }),
      milestones: data.milestones || null,
    });

    if (!updated) {
      throw new NotFoundError('Failed to update goal');
    }

    return c.json(updated);
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getGoalById(goalId, userId);
    if (!isUserGoal(goal, userId)) {
      throw new NotFoundError('Goal not found');
    }

    const deleted = await deleteGoal(goalId, userId);
    if (!deleted) {
      throw new NotFoundError('Failed to delete goal');
    }

    return c.json({ success: true, id: goalId });
  });
