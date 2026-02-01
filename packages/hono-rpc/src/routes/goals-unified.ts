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
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Validation Schemas
 */
const goalCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().int().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
  milestones: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
});

const goalUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.number().int().optional(),
  milestones: z.unknown().optional(),
});

const goalListQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
  category: z.string().optional(),
  sortBy: z.enum(['priority', 'createdAt', 'status']).optional(),
});

/**
 * Response Types
 */
type GoalResponse = Awaited<ReturnType<typeof getConsolidatedGoalsByUser>>[number];
type GoalStatsResponse = Awaited<ReturnType<typeof getConsolidatedGoalStats>>;

/**
 * Unified Goals Routes
 * Uses the consolidated goals in the events table
 */
export const goalsUnifiedRoutes = new Hono<AppContext>()
  // List goals
  .get('/', authMiddleware, zValidator('query', goalListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const goals = await getConsolidatedGoalsByUser(userId, {
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      sortBy: (query.sortBy as 'priority' | 'createdAt' | 'status') || 'priority',
    });

    return c.json<GoalResponse[]>(goals);
  })

  // Get goal by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const goalId = c.req.param('id');

    const goal = await getEventById(goalId);
    if (!goal || (goal as any).userId !== userId || (goal as any).type !== 'Goal') {
      throw new NotFoundError('Goal not found');
    }

    return c.json<GoalResponse>(goal);
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
    return c.json<GoalStatsResponse>(stats);
  })

  // Create goal
  .post('/', authMiddleware, zValidator('json', goalCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    if (!data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const goal = await createConsolidatedGoal(userId, {
      title: data.title.trim(),
      ...(data.description && { description: data.description }),
      ...(data.targetValue && { targetValue: data.targetValue }),
      ...(data.unit && { unit: data.unit }),
      ...(data.category && { category: data.category }),
      ...(data.priority && { priority: data.priority }),
      ...(data.status && { status: data.status }),
      milestones: data.milestones || null,
      ...(data.tags && { tags: data.tags }),
    });

    return c.json<GoalResponse>(goal, 201);
  })

  // Update goal
  .patch('/:id', authMiddleware, zValidator('json', goalUpdateSchema), async (c) => {
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

    return c.json<GoalResponse>(updated);
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

    return c.json({ success: true, id: goalId });
  });
