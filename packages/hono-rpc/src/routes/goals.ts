import {
  createConsolidatedGoal,
  getConsolidatedGoalStats,
  updateConsolidatedGoal,
  getConsolidatedGoalsByUser,
  getEventById,
  deleteEvent,
} from '@hominem/events-services';
import { NotFoundError, ValidationError } from '@hominem/services';
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
  type GoalOutput,
} from '../types/goals.types';

/**
 * Goals Routes
 *
 * Consolidated goals management. All goals are stored as events with type='Goal'.
 */
export const goalsRoutes = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, zValidator('query', GoalListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const goals = await getConsolidatedGoalsByUser(userId, {
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      sortBy: (query.sortBy as any) || 'priority',
    });

    return c.json<GoalListOutput>(goals as any);
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getEventById(goalId);
    if (!goal || (goal as any).userId !== userId || (goal as any).type !== 'Goal') {
      throw new NotFoundError('Goal not found');
    }

    return c.json<GoalGetOutput>(goal as any);
  })

  // Get goal statistics
  .get('/:id/stats', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getEventById(goalId);
    if (!goal || (goal as any).userId !== userId || (goal as any).type !== 'Goal') {
      throw new NotFoundError('Goal not found');
    }

    const stats = await getConsolidatedGoalStats(goalId, userId);
    return c.json<GoalStatsOutput>(stats as any);
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

    return c.json<GoalCreateOutput>(goal as any, 201);
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', GoalUpdateInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');
    const data = c.req.valid('json');

    const goal = await getEventById(goalId);
    if (!goal || (goal as any).userId !== userId || (goal as any).type !== 'Goal') {
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

    return c.json<GoalUpdateOutput>(updated as any);
  })

  // Delete goal
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getEventById(goalId);
    if (!goal || (goal as any).userId !== userId || (goal as any).type !== 'Goal') {
      throw new NotFoundError('Goal not found');
    }

    const deleted = await deleteEvent(goalId);
    if (!deleted) {
      throw new NotFoundError('Failed to delete goal');
    }

    return c.json<GoalDeleteOutput>({ success: true, id: goalId });
  });
