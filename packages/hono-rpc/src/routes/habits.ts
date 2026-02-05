import {
  createHabit,
  markHabitComplete,
  resetHabitStreak,
  getHabitStats,
  getHabitsByUser,
  getEventById,
  deleteEvent,
  updateHabit,
  type EventWithTagsAndPeople,
} from '@hominem/events-services';
import { NotFoundError, ValidationError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Type predicate to check if an event is a Habit owned by a specific user
 */
function isUserHabit(event: EventWithTagsAndPeople | null, userId: string): event is EventWithTagsAndPeople & { type: 'Habit'; userId: string } {
  return event !== null && event.userId === userId && event.type === 'Habit';
}

/**
 * Validation Schemas
 */
const habitCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  interval: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  recurrenceRule: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const habitUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  interval: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  recurrenceRule: z.string().optional(),
});

const habitListQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['streak', 'completions', 'name']).optional(),
});

/**
 * Response Types
 */
type HabitResponse = Awaited<ReturnType<typeof getHabitsByUser>>[number];
type HabitStatsResponse = Awaited<ReturnType<typeof getHabitStats>>;

/**
 * Habits Routes
 */
export const habitsRoutes = new Hono<AppContext>()
  // List habits
  .get('/', authMiddleware, zValidator('query', habitListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const habits = await getHabitsByUser(userId, {
      active: query.active === 'true',
      sortBy: (query.sortBy as 'streak' | 'completions' | 'name') || 'name',
    });

    return c.json<HabitResponse[]>(habits);
  })

  // Get habit by ID
  .get('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');

    const habit = await getEventById(habitId);
    if (!isUserHabit(habit, userId)) {
      throw new NotFoundError('Habit not found');
    }

    return c.json<HabitResponse>(habit);
  })

  // Get habit statistics
  .get('/:id/stats', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');

    const habit = await getEventById(habitId);
    if (!isUserHabit(habit, userId)) {
      throw new NotFoundError('Habit not found');
    }

    const stats = await getHabitStats(userId, habitId);
    return c.json<HabitStatsResponse>(stats);
  })

  // Create habit
  .post('/', authMiddleware, zValidator('json', habitCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    if (!data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const habit = await createHabit(userId, {
      title: data.title.trim(),
      ...(data.description && { description: data.description }),
      ...(data.interval && { interval: data.interval }),
      ...(data.recurrenceRule && { recurrenceRule: data.recurrenceRule }),
      ...(data.tags && { tags: data.tags }),
    });

    return c.json<HabitResponse>(habit, 201);
  })

  // Update habit
  .patch('/:id', authMiddleware, zValidator('json', habitUpdateSchema), async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');
    const data = c.req.valid('json');

    const habit = await getEventById(habitId);
    if (!isUserHabit(habit, userId)) {
      throw new NotFoundError('Habit not found');
    }

    const updatedHabit = await updateHabit(habitId, userId, data);
    if (!updatedHabit) {
      throw new NotFoundError('Habit not found');
    }

    return c.json<HabitResponse>(updatedHabit);
  })

  // Mark habit as complete
  .post('/:id/complete', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');

    const habit = await markHabitComplete(habitId, userId);
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    return c.json<HabitResponse>(habit);
  })

  // Reset habit streak
  .post('/:id/reset-streak', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');

    const habit = await resetHabitStreak(habitId, userId);
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    return c.json<HabitResponse>(habit);
  })

  // Delete habit
  .delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const habitId = c.req.param('id');

    const habit = await getEventById(habitId);
    if (!isUserHabit(habit, userId)) {
      throw new NotFoundError('Habit not found');
    }

    const deleted = await deleteEvent(habitId);
    if (!deleted) {
      throw new NotFoundError('Failed to delete habit');
    }

    return c.json({ success: true, id: habitId });
  });
