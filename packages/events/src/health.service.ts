import { and, desc, eq, gte, isNotNull, isNull, lte } from '@hominem/db';
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
  updateEvent,
} from './event-core.service';

export interface HealthActivityStats {
  totalActivities: number;
  totalDuration: number;
  totalCaloriesBurned: number;
  averageCaloriesPerSession: number;
  lastActivityDate: Date | null;
}

export async function getHealthActivityStats(
  userId: string,
  activityType?: string,
  startDate?: Date,
  endDate?: Date,
): Promise<HealthActivityStats> {
  const conditions = [
    eq(events.userId, userId),
    eq(events.type, 'Health'),
    isNull(events.deletedAt),
    isNotNull(events.activityType),
  ];

  if (activityType) {
    conditions.push(eq(events.activityType, activityType));
  }

  if (startDate) {
    conditions.push(gte(events.date, startDate));
  }

  if (endDate) {
    conditions.push(lte(events.date, endDate));
  }

  const activities = await db
    .select({
      duration: events.duration,
      caloriesBurned: events.caloriesBurned,
      date: events.date,
    })
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.date));

  const totalActivities = activities.length;
  const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
  const totalCaloriesBurned = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
  const averageCaloriesPerSession = totalActivities > 0 ? totalCaloriesBurned / totalActivities : 0;
  const lastActivityDate = activities[0]?.date || null;

  return {
    totalActivities,
    totalDuration,
    totalCaloriesBurned,
    averageCaloriesPerSession,
    lastActivityDate,
  };
}

export async function logHealthActivity(
  userId: string,
  activity: {
    title: string;
    description?: string;
    activityType: string;
    duration: number;
    caloriesBurned: number;
    date?: Date;
    tags?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  const healthEventInput = {
    title: activity.title,
    description: activity.description || null,
    date: activity.date || new Date(),
    type: 'Health' as EventTypeEnum,
    userId,
    activityType: activity.activityType,
    duration: activity.duration,
    caloriesBurned: activity.caloriesBurned,
    ...(activity.tags && { tags: activity.tags }),
  };

  return createEvent(
    healthEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );
}

export async function updateHealthActivity(
  activityId: string,
  userId: string,
  updates: {
    duration?: number;
    caloriesBurned?: number;
    activityType?: string;
    description?: string;
  },
): Promise<EventWithTagsAndPeople | null> {
  const activity = await getEventById(activityId);

  if (!activity || (activity as { userId?: string }).userId !== userId) {
    return null;
  }

  return updateEvent(activityId, {
    ...(updates.duration !== undefined && { duration: updates.duration }),
    ...(updates.caloriesBurned !== undefined && { caloriesBurned: updates.caloriesBurned }),
    ...(updates.activityType !== undefined && { activityType: updates.activityType }),
    ...(updates.description !== undefined && { description: updates.description }),
  });
}

export async function getHealthActivitiesByUser(
  userId: string,
  filters?: {
    activityType?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'date' | 'calories' | 'duration';
  },
): Promise<EventWithTagsAndPeople[]> {
  const conditions = [
    eq(events.userId, userId),
    eq(events.type, 'Health'),
    isNull(events.deletedAt),
    isNotNull(events.activityType),
  ];

  if (filters?.activityType) {
    conditions.push(eq(events.activityType, filters.activityType));
  }

  if (filters?.startDate) {
    conditions.push(gte(events.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(events.date, filters.endDate));
  }

  const orderByClause =
    filters?.sortBy === 'calories'
      ? desc(events.caloriesBurned)
      : filters?.sortBy === 'duration'
        ? desc(events.duration)
        : desc(events.date);

  const activitiesList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(orderByClause);

  const eventIds = activitiesList.map((event) => event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return activitiesList.map((activityItem) => ({
    ...activityItem,
    tags: tagsMap.get(activityItem.id) || [],
    people: peopleMap.get(activityItem.id) || [],
  })) as unknown as EventWithTagsAndPeople[];
}

export async function getHealthActivityById(
  activityId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const activity = await getEventById(activityId);
  const candidate = activity as (EventWithTagsAndPeople & { userId?: string; type?: string }) | null;
  if (!candidate || candidate.userId !== userId || candidate.type !== 'Health') {
    return null;
  }
  return candidate;
}

export async function deleteHealthActivity(activityId: string, userId: string): Promise<boolean> {
  const activity = await getHealthActivityById(activityId, userId);
  if (!activity) {
    return false;
  }
  return deleteEvent(activityId);
}
