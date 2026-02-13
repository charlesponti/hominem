import {
  logHealthActivity,
  getHealthActivityStats,
  updateHealthActivity,
  getHealthActivitiesByUser,
  getEventById,
  deleteEvent,
  type EventWithTagsAndPeople,
} from '@hominem/events-services';
import { NotFoundError, ValidationError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Type predicate to check if an event is a Health activity owned by a specific user
 */
function isUserHealthActivity(
  event: EventWithTagsAndPeople | null,
  userId: string,
): event is EventWithTagsAndPeople & { type: 'Health'; userId: string } {
  return event !== null && event.userId === userId && event.type === 'Health';
}

/**
 * Validation Schemas
 */
const healthActivityCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  activityType: z.string().min(1, 'Activity type is required'),
  duration: z.number().int().positive('Duration must be positive'),
  caloriesBurned: z.number().int().nonnegative('Calories cannot be negative'),
  date: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

const healthActivityUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  activityType: z.string().optional(),
  duration: z.number().int().positive().optional(),
  caloriesBurned: z.number().int().nonnegative().optional(),
});

const healthActivityListQuerySchema = z.object({
  activityType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['date', 'calories', 'duration']).optional(),
});

/**
 * Response Types
 */
type HealthActivityResponse = Awaited<ReturnType<typeof getHealthActivitiesByUser>>[number];
type HealthActivityStatsResponse = Awaited<ReturnType<typeof getHealthActivityStats>>;

/**
 * Health Activities Routes
 */
export const healthRoutes = new Hono<AppContext>()
  // List health activities
  .get('/', authMiddleware, zValidator('query', healthActivityListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const activities = await getHealthActivitiesByUser(userId, {
      ...(query.activityType && { activityType: query.activityType }),
      ...(query.startDate && { startDate: new Date(query.startDate) }),
      ...(query.endDate && { endDate: new Date(query.endDate) }),
      sortBy: (query.sortBy as 'date' | 'calories' | 'duration') || 'date',
    });

    return c.json<HealthActivityResponse[]>(activities);
  })

  // Get activity by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const activityId = c.req.param('id');

    const activity = await getEventById(activityId);
    if (!isUserHealthActivity(activity, userId)) {
      throw new NotFoundError('Health activity not found');
    }

    return c.json<HealthActivityResponse>(activity);
  })

  // Get health statistics
  .get(
    '/stats/summary',
    authMiddleware,
    zValidator(
      'query',
      z.object({
        activityType: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    ),
    async (c) => {
      const userId = c.get('userId')!;
      const query = c.req.valid('query');

      const stats = await getHealthActivityStats(
        userId,
        query.activityType,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined,
      );

      return c.json<HealthActivityStatsResponse>(stats);
    },
  )

  // Log new health activity
  .post('/', authMiddleware, zValidator('json', healthActivityCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    if (!data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    if (!data.activityType.trim()) {
      throw new ValidationError('Activity type is required');
    }

    const activity = await logHealthActivity(userId, {
      title: data.title.trim(),
      ...(data.description && { description: data.description }),
      activityType: data.activityType.trim(),
      duration: data.duration,
      caloriesBurned: data.caloriesBurned,
      ...(data.date && { date: new Date(data.date) }),
      ...(data.tags && { tags: data.tags }),
    });

    return c.json<HealthActivityResponse>(activity, 201);
  })

  // Update health activity
  .patch('/:id', authMiddleware, zValidator('json', healthActivityUpdateSchema), async (c) => {
    const userId = c.get('userId')!;
    const activityId = c.req.param('id');
    const data = c.req.valid('json');

    const activity = await getEventById(activityId);
    if (!isUserHealthActivity(activity, userId)) {
      throw new NotFoundError('Health activity not found');
    }

    const updated = await updateHealthActivity(activityId, userId, {
      ...(data.duration && { duration: data.duration }),
      ...(data.caloriesBurned && { caloriesBurned: data.caloriesBurned }),
      ...(data.activityType && { activityType: data.activityType }),
      ...(data.description && { description: data.description }),
    });

    if (!updated) {
      throw new NotFoundError('Failed to update health activity');
    }

    return c.json<HealthActivityResponse>(updated);
  })

  // Delete health activity
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const activityId = c.req.param('id');

    const activity = await getEventById(activityId);
    if (!isUserHealthActivity(activity, userId)) {
      throw new NotFoundError('Health activity not found');
    }

    const deleted = await deleteEvent(activityId);
    if (!deleted) {
      throw new NotFoundError('Failed to delete health activity');
    }

    return c.json({ success: true, id: activityId });
  });
