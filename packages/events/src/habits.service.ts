import { and, asc, desc, eq, isNull } from '@hominem/db';
import { db } from '@hominem/db';
import { events } from '@hominem/db/schema/calendar';
import type {
  EventInput as DbEventInput,
  EventTypeEnum,
} from '@hominem/db/types/calendar';

import {
  createEvent,
  deleteEvent,
  getEventById,
  getPeopleForEvents,
  getTagsForEvents,
  type EventWithTagsAndPeople,
  type UpdateEventInput,
  updateEvent,
} from './event-core.service';

export interface HabitStats {
  streakCount: number;
  totalCompletions: number;
  completionRate: number;
  lastCompletedDate: Date | null;
}

export async function getHabitStats(userId: string, habitId: string): Promise<HabitStats> {
  const habit = await db
    .select({
      streakCount: events.streakCount,
      completedInstances: events.completedInstances,
    })
    .from(events)
    .where(and(eq(events.id, habitId), eq(events.userId, userId)))
    .limit(1);

  if (!habit || !habit[0]) {
    return {
      streakCount: 0,
      totalCompletions: 0,
      completionRate: 0,
      lastCompletedDate: null,
    };
  }

  const streakCount = habit[0].streakCount || 0;
  const totalCompletions = habit[0].completedInstances || 0;
  const completionRate = totalCompletions > 0 ? (totalCompletions / (streakCount + 1)) * 100 : 0;

  return {
    streakCount,
    totalCompletions,
    completionRate,
    lastCompletedDate: null,
  };
}

export async function createHabit(
  userId: string,
  habit: {
    title: string;
    description?: string;
    interval?: string;
    recurrenceRule?: string;
    tags?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  const habitEventInput = {
    title: habit.title,
    description: habit.description || null,
    date: new Date(),
    type: 'Habit' as EventTypeEnum,
    userId,
    interval: habit.interval || null,
    recurrenceRule: habit.recurrenceRule || null,
    streakCount: 0,
    completedInstances: 0,
    ...(habit.tags && { tags: habit.tags }),
  };

  return createEvent(
    habitEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );
}

export async function updateHabit(
  habitId: string,
  userId: string,
  updates: {
    title?: string | undefined;
    description?: string | undefined;
    interval?: 'daily' | 'weekly' | 'monthly' | 'custom' | undefined;
    recurrenceRule?: string | undefined;
  },
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);
  if (
    !habit ||
    (habit as { userId?: string }).userId !== userId ||
    (habit as { type?: string }).type !== 'Habit'
  ) {
    return null;
  }

  const updateData: UpdateEventInput = {};

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.interval !== undefined) {
    updateData.interval = updates.interval;
  }
  if (updates.recurrenceRule !== undefined) {
    updateData.recurrenceRule = updates.recurrenceRule;
  }

  return updateEvent(habitId, updateData);
}

export async function markHabitComplete(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);

  if (!habit || (habit as { userId?: string }).userId !== userId) {
    return null;
  }

  const currentStreak = (habit as { streakCount?: number }).streakCount || 0;
  const completedInstances = (habit as { completedInstances?: number }).completedInstances || 0;

  return updateEvent(habitId, {
    streakCount: currentStreak + 1,
    completedInstances: completedInstances + 1,
    isCompleted: true,
  });
}

export async function resetHabitStreak(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);

  if (!habit || (habit as { userId?: string }).userId !== userId) {
    return null;
  }

  return updateEvent(habitId, {
    streakCount: 0,
    isCompleted: false,
  });
}

export async function getHabitsByUser(
  userId: string,
  filters?: {
    active?: boolean;
    sortBy?: 'streak' | 'completions' | 'name';
  },
): Promise<EventWithTagsAndPeople[]> {
  const conditions = [
    eq(events.userId, userId),
    eq(events.type, 'Habit'),
    isNull(events.deletedAt),
  ];

  if (filters?.active) {
    conditions.push(eq(events.isCompleted, true));
  }

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
  switch (filters?.sortBy) {
    case 'streak':
      orderByClause = desc(events.streakCount);
      break;
    case 'completions':
      orderByClause = desc(events.completedInstances);
      break;
    case 'name':
    default:
      orderByClause = asc(events.title);
  }

  const habitsList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(orderByClause);

  const eventIds = habitsList.map((event) => event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return habitsList.map((habitItem) => ({
    ...habitItem,
    tags: tagsMap.get(habitItem.id) || [],
    people: peopleMap.get(habitItem.id) || [],
  })) as unknown as EventWithTagsAndPeople[];
}

export async function getHabitById(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);
  const candidate = habit as (EventWithTagsAndPeople & { userId?: string; type?: string }) | null;
  if (!candidate || candidate.userId !== userId || candidate.type !== 'Habit') {
    return null;
  }
  return candidate;
}

export async function deleteHabit(habitId: string, userId: string): Promise<boolean> {
  const habit = await getHabitById(habitId, userId);
  if (!habit) {
    return false;
  }
  return deleteEvent(habitId);
}
