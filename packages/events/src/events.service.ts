import type {
  EventOutput as DbEventOutput,
  EventInput as DbEventInput,
  EventTypeEnum,
} from '@hominem/db/types/calendar';

import { db } from '@hominem/db';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or } from '@hominem/db';
import { events, eventsTags, eventsUsers } from '@hominem/db/schema/calendar';
import { contacts } from '@hominem/db/schema/contacts';
import { place } from '@hominem/db/schema/places';
import { tags } from '@hominem/db/schema/tags';
import {
  getPeopleForEvent,
  getPeopleForEvents,
  replacePeopleForEvent,
} from '@hominem/services/people';
import {
  addTagsToEvent,
  findOrCreateTagsByNames,
  getTagsForEvent,
  getTagsForEvents,
  removeTagsFromEvent,
  syncTagsForEvent,
} from '@hominem/services/tags';

export interface EventFilters {
  tagNames?: string[] | undefined;
  companion?: string | undefined;
  sortBy?: 'date-asc' | 'date-desc' | 'summary' | undefined;
}

export interface EventWithTagsAndPeople extends DbEventOutput {
  goalCategory: DbEventOutput['goalCategory'];
  tags: Array<{ id: string; name: string; color: string | null; description: string | null }>;
  people: Array<{ id: string; firstName: string; lastName: string | null }>;
}

export async function getEvents(filters: EventFilters = {}): Promise<EventWithTagsAndPeople[]> {
  const conditions = [];

  if (filters.tagNames && filters.tagNames.length > 0) {
    const tagResults = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.name, filters.tagNames));

    const tagIds = tagResults.map((t) => t.id);

    if (tagIds.length > 0) {
      const eventIds = await db
        .select({ eventId: eventsTags.eventId })
        .from(eventsTags)
        .where(inArray(eventsTags.tagId, tagIds));

      const eventIdsList = eventIds.map((e) => e.eventId).filter((id): id is string => id !== null);

      if (eventIdsList.length > 0) {
        conditions.push(inArray(events.id, eventIdsList));
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  if (filters.companion) {
    const contactResults = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        or(
          like(contacts.firstName, `%${filters.companion}%`),
          like(contacts.lastName, `%${filters.companion}%`),
        ),
      );

    const contactIds = contactResults.map((c) => c.id);

    if (contactIds.length > 0) {
      const eventIds = await db
        .select({ eventId: eventsUsers.eventId })
        .from(eventsUsers)
        .where(inArray(eventsUsers.personId, contactIds));

      const eventIdsList = eventIds.map((e) => e.eventId).filter((id): id is string => id !== null);

      if (eventIdsList.length > 0) {
        conditions.push(inArray(events.id, eventIdsList));
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
  switch (filters.sortBy) {
    case 'date-asc':
      orderByClause = asc(events.date);
      break;
    case 'date-desc':
      orderByClause = desc(events.date);
      break;
    case 'summary':
      orderByClause = asc(events.title);
      break;
    default:
      orderByClause = desc(events.date);
  }

  const eventsList =
    conditions.length > 0
      ? await db
          .select()
          .from(events)
          .where(and(...conditions))
          .orderBy(orderByClause)
      : await db.select().from(events).orderBy(orderByClause);

  const eventIds = eventsList.map((event) => event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return eventsList.map((eventItem) => ({
    ...eventItem,
    tags: tagsMap.get(eventItem.id) || [],
    people: peopleMap.get(eventItem.id) || [],
  })) as EventWithTagsAndPeople[];
}

export async function createEvent(
  event: Omit<DbEventInput, 'id'> & {
    tags?: string[];
    people?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  const now = new Date().toISOString();
  const insertEvent: typeof events.$inferInsert = {
    id: crypto.randomUUID(),
    title: event.title,
    description: event.description ?? null,
    date: event.date ?? new Date(),
    dateStart: event.dateStart ?? null,
    dateEnd: event.dateEnd ?? null,
    dateTime: event.dateTime ?? null,
    type: (event.type || 'Events') as EventTypeEnum,
    userId: event.userId,
    source: event.source ?? 'manual',
    externalId: event.externalId ?? null,
    calendarId: event.calendarId ?? null,
    placeId: event.placeId ?? null,
    lastSyncedAt: event.lastSyncedAt ?? null,
    syncError: event.syncError ?? null,
    visitNotes: event.visitNotes ?? null,
    visitRating: event.visitRating ?? null,
    visitReview: event.visitReview ?? null,
    visitPeople: event.visitPeople ?? null,
    interval: event.interval ?? null,
    recurrenceRule: event.recurrenceRule ?? null,
    score: event.score ?? null,
    priority: event.priority ?? null,
    goalCategory: event.goalCategory ?? null,
    targetValue: event.targetValue ?? null,
    currentValue: event.currentValue ?? 0,
    unit: event.unit ?? null,
    isCompleted: event.isCompleted ?? false,
    streakCount: event.streakCount ?? 0,
    totalCompletions: event.totalCompletions ?? 0,
    completedInstances: event.completedInstances ?? 0,
    lastCompletedAt: event.lastCompletedAt ?? null,
    expiresInDays: event.expiresInDays ?? null,
    reminderTime: event.reminderTime ?? null,
    reminderSettings: event.reminderSettings ?? null,
    parentEventId: event.parentEventId ?? null,
    status: event.status ?? 'active',
    deletedAt: event.deletedAt ?? null,
    activityType: event.activityType ?? null,
    duration: event.duration ?? null,
    caloriesBurned: event.caloriesBurned ?? null,
    isTemplate: event.isTemplate ?? false,
    nextOccurrence: event.nextOccurrence ?? null,
    dependencies: event.dependencies ?? null,
    resources: event.resources ?? null,
    milestones: event.milestones ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const [result] = await db.insert(events).values(insertEvent).returning();

  if (!result) {
    throw new Error('Failed to create event');
  }

  if (event.people) {
    await replacePeopleForEvent(result.id, event.people);
  }

  if (event.tags) {
    const tagObjects = await findOrCreateTagsByNames(event.tags);
    const tagIds = tagObjects.map((tag) => tag.id);
    await addTagsToEvent(result.id, tagIds);
  }

  const [people, tagsList] = await Promise.all([
    getPeopleForEvent(result.id),
    getTagsForEvent(result.id),
  ]);

  return {
    ...result,
    tags: tagsList,
    people,
  } as unknown as EventWithTagsAndPeople;
}

export type UpdateEventInput = Partial<
  Omit<DbEventInput, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
> & {
  tags?: string[];
  people?: string[];
  // Additional fields for goals and activities
  currentValue?: number;
  targetValue?: number;
  completedInstances?: number;
  duration?: number;
  caloriesBurned?: number;
  goalCategory?: string;
  unit?: string;
};

export async function updateEvent(
  id: string,
  event: UpdateEventInput,
): Promise<EventWithTagsAndPeople | null> {
  const { tags: tagsInput, people: peopleInput, type, ...eventData } = event;
  const updateData = {
    ...(eventData as Partial<typeof events.$inferInsert>),
    ...(type !== undefined ? { type: type as EventTypeEnum } : {}),
    updatedAt: new Date().toISOString(),
  } satisfies Partial<typeof events.$inferInsert>;

  const result = await db.update(events).set(updateData).where(eq(events.id, id)).returning();

  if (result.length === 0) {
    return null;
  }

  const updatedEvent = result[0];

  if (peopleInput !== undefined) {
    await replacePeopleForEvent(id, peopleInput);
  }

  if (tagsInput !== undefined) {
    const tagObjects = await findOrCreateTagsByNames(tagsInput);
    const tagIds = tagObjects.map((tag) => tag.id);
    await syncTagsForEvent(id, tagIds);
  }

  const [people, tagsList] = await Promise.all([getPeopleForEvent(id), getTagsForEvent(id)]);

  return {
    ...(updatedEvent as DbEventOutput),
    tags: tagsList,
    people,
  };
}

export async function deleteEvent(id: string) {
  await Promise.all([
    db.delete(eventsUsers).where(eq(eventsUsers.eventId, id)),
    removeTagsFromEvent(id),
  ]);

  const result = await db.delete(events).where(eq(events.id, id)).returning();

  return result.length > 0;
}

export async function getEventById(id: string): Promise<EventWithTagsAndPeople | null> {
  const [result] = await db.select().from(events).where(eq(events.id, id)).limit(1);

  if (!result) {
    return null;
  }

  const [people, tagsList] = await Promise.all([getPeopleForEvent(id), getTagsForEvent(id)]);

  return {
    ...result,
    tags: tagsList,
    people,
  } as unknown as EventWithTagsAndPeople;
}

export async function getEventByExternalId(
  externalId: string,
  calendarId: string,
): Promise<EventWithTagsAndPeople | null> {
  const [result] = await db
    .select()
    .from(events)
    .where(and(eq(events.externalId, externalId), eq(events.calendarId, calendarId)))
    .limit(1);

  if (!result) {
    return null;
  }

  const [people, tagsList] = await Promise.all([
    getPeopleForEvent(result.id),
    getTagsForEvent(result.id),
  ]);

  return {
    ...result,
    tags: tagsList,
    people,
  } as unknown as EventWithTagsAndPeople;
}

export interface SyncStatus {
  lastSyncedAt: Date | null;
  syncError: string | null;
  eventCount: number;
}

export async function getSyncStatus(userId: string): Promise<SyncStatus> {
  const syncedEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.source, 'google_calendar')))
    .orderBy(events.lastSyncedAt);

  const lastEvent = syncedEvents[syncedEvents.length - 1];

  return {
    lastSyncedAt: lastEvent?.lastSyncedAt || null,
    syncError: lastEvent?.syncError || null,
    eventCount: syncedEvents.length,
  };
}

export interface VisitFilters {
  placeId?: string;
  startDate?: Date;
  endDate?: Date;
}

export type VisitWithPlaceAndTags = typeof events.$inferSelect & {
  place: typeof place.$inferSelect | null;
  tags: Array<{ id: string; name: string; color: string | null; description: string | null }>;
  people: Array<{ id: string; firstName: string; lastName: string | null }>;
};

export async function getVisitsByUser(
  userId: string,
  filters?: VisitFilters,
): Promise<VisitWithPlaceAndTags[]> {
  const conditions = [
    eq(events.userId, userId),
    isNull(events.deletedAt),
    isNotNull(events.placeId), // Only events with a placeId (visits)
  ];

  if (filters?.placeId) {
    conditions.push(eq(events.placeId, filters.placeId));
  }

  if (filters?.startDate) {
    conditions.push(gte(events.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(events.date, filters.endDate));
  }

  const visits = await db
    .select({
      event: events,
      place: place,
    })
    .from(events)
    .leftJoin(place, eq(events.placeId, place.id))
    .where(and(...conditions))
    .orderBy(desc(events.date));

  const eventIds = visits.map((v) => v.event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return visits.map((row) => ({
    ...row.event,
    place: row.place,
    tags: tagsMap.get(row.event.id) || [],
    people: peopleMap.get(row.event.id) || [],
  }));
}

export async function getVisitsByPlace(
  placeId: string,
  userId?: string,
): Promise<VisitWithPlaceAndTags[]> {
  const conditions = [eq(events.placeId, placeId), isNull(events.deletedAt)];

  if (userId) {
    conditions.push(eq(events.userId, userId));
  }

  const visits = await db
    .select({
      event: events,
      place: place,
    })
    .from(events)
    .leftJoin(place, eq(events.placeId, place.id))
    .where(and(...conditions))
    .orderBy(desc(events.date));

  const eventIds = visits.map((v) => v.event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return visits.map((row) => ({
    ...row.event,
    place: row.place,
    tags: tagsMap.get(row.event.id) || [],
    people: peopleMap.get(row.event.id) || [],
  }));
}

export interface VisitStats {
  visitCount: number;
  lastVisitDate: Date | null;
  averageRating: number | null;
}

export async function getVisitStatsByPlace(placeId: string, userId: string): Promise<VisitStats> {
  const visits = await db
    .select({
      date: events.date,
      visitRating: events.visitRating,
    })
    .from(events)
    .where(and(eq(events.placeId, placeId), eq(events.userId, userId), isNull(events.deletedAt)))
    .orderBy(desc(events.date));

  const visitCount = visits.length;
  const lastVisitDate = visits[0]?.date || null;

  const ratings = visits
    .map((v) => v.visitRating)
    .filter((r): r is number => r !== null && r !== undefined);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

  return {
    visitCount,
    lastVisitDate,
    averageRating,
  };
}

/**
 * Habit/Goal Tracking Functions
 */

export interface HabitStats {
  streakCount: number;
  totalCompletions: number;
  completionRate: number; // percentage
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

  // Assuming the habit's date represents when it was created, and we calculate completions
  // based on the interval and dates
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
    interval?: string; // 'daily', 'weekly', 'monthly', etc.
    recurrenceRule?: string; // RRULE format
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

  const habitEvent = await createEvent(
    habitEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );

  return habitEvent;
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
  // Verify the habit exists and belongs to the user
  const habit = await getEventById(habitId);
  if (!habit || (habit as { userId?: string }).userId !== userId || (habit as { type?: string }).type !== 'Habit') {
    return null;
  }

  // Build update object with only provided fields
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

  // Use the generic updateEvent function
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

export interface GoalStats {
  progress: number; // percentage
  currentValue: number;
  targetValue: number;
  remaining: number;
}

export async function getGoalStats(goalId: string, userId: string): Promise<GoalStats> {
  const goal = await db
    .select({
      currentValue: events.currentValue,
      targetValue: events.targetValue,
    })
    .from(events)
    .where(and(eq(events.id, goalId), eq(events.userId, userId)))
    .limit(1);

  if (!goal || !goal[0]) {
    return {
      progress: 0,
      currentValue: 0,
      targetValue: 0,
      remaining: 0,
    };
  }

  const currentValue = goal[0].currentValue || 0;
  const targetValue = goal[0].targetValue || 0;
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const remaining = Math.max(0, targetValue - currentValue);

  return {
    progress,
    currentValue,
    targetValue,
    remaining,
  };
}

export async function createGoal(
  userId: string,
  goal: {
    title: string;
    description?: string;
    targetValue: number;
    unit?: string;
    category?: string;
    priority?: number;
    tags?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  const goalEventInput = {
    title: goal.title,
    description: goal.description || null,
    date: new Date(),
    type: 'Goal' as EventTypeEnum,
    userId,
    targetValue: goal.targetValue,
    currentValue: 0,
    unit: goal.unit || null,
    goalCategory: goal.category || null,
    priority: goal.priority || null,
    ...(goal.tags && { tags: goal.tags }),
  };

  const goalEvent = await createEvent(
    goalEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );

  return goalEvent;
}

export async function updateGoalProgress(
  goalId: string,
  userId: string,
  increment: number,
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);

  if (!goal || (goal as { userId?: string }).userId !== userId) {
    return null;
  }

  const currentValue = ((goal as { currentValue?: number }).currentValue || 0) + increment;
  const targetValue = (goal as { targetValue?: number }).targetValue || 0;

  return updateEvent(goalId, {
    currentValue: Math.min(currentValue, targetValue), // Don't exceed target
    isCompleted: currentValue >= targetValue,
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

export async function getGoalsByUser(
  userId: string,
  filters?: {
    active?: boolean;
    category?: string;
    sortBy?: 'progress' | 'priority' | 'name';
  },
): Promise<EventWithTagsAndPeople[]> {
  const conditions = [eq(events.userId, userId), eq(events.type, 'Goal'), isNull(events.deletedAt)];

  if (filters?.active) {
    conditions.push(eq(events.isCompleted, false));
  }

  if (filters?.category) {
    conditions.push(eq(events.goalCategory, filters.category));
  }

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
  switch (filters?.sortBy) {
    case 'progress':
      orderByClause = desc(events.currentValue);
      break;
    case 'priority':
      orderByClause = asc(events.priority);
      break;
    case 'name':
    default:
      orderByClause = asc(events.title);
  }

  const goalsList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(orderByClause);

  const eventIds = goalsList.map((event) => event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return goalsList.map((goalItem) => ({
    ...goalItem,
    tags: tagsMap.get(goalItem.id) || [],
    people: peopleMap.get(goalItem.id) || [],
  })) as unknown as EventWithTagsAndPeople[];
}

/**
 * Health Activity Tracking Functions
 */

export interface HealthActivityStats {
  totalActivities: number;
  totalDuration: number; // in minutes
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
    duration: number; // in minutes
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

  const healthEvent = await createEvent(
    healthEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );

  return healthEvent;
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

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
  switch (filters?.sortBy) {
    case 'calories':
      orderByClause = desc(events.caloriesBurned);
      break;
    case 'duration':
      orderByClause = desc(events.duration);
      break;
    case 'date':
    default:
      orderByClause = desc(events.date);
  }

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

/**
 * Consolidated Goals Functions (migrated from standalone goals table)
 */

export interface ConsolidatedGoalStats {
  status: string;
  progress: number; // percentage
  currentValue: number;
  targetValue: number;
  remaining: number;
  milestones?: unknown;
}

export async function getConsolidatedGoalStats(
  goalId: string,
  userId: string,
): Promise<ConsolidatedGoalStats> {
  const goal = await db
    .select({
      status: events.status,
      currentValue: events.currentValue,
      targetValue: events.targetValue,
      milestones: events.milestones,
    })
    .from(events)
    .where(and(eq(events.id, goalId), eq(events.userId, userId)))
    .limit(1);

  if (!goal || !goal[0]) {
    return {
      status: 'todo',
      progress: 0,
      currentValue: 0,
      targetValue: 0,
      remaining: 0,
    };
  }

  const currentValue = goal[0].currentValue || 0;
  const targetValue = goal[0].targetValue || 0;
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const remaining = Math.max(0, targetValue - currentValue);

  return {
    status: goal[0].status || 'todo',
    progress,
    currentValue,
    targetValue,
    remaining,
    milestones: goal[0].milestones,
  };
}

export async function createConsolidatedGoal(
  userId: string,
  goal: {
    title: string;
    description?: string;
    targetValue?: number;
    unit?: string;
    category?: string;
    priority?: number;
    status?: string;
    milestones?: unknown;
    tags?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  const goalEventInput = {
    title: goal.title,
    description: goal.description || null,
    date: new Date(),
    type: 'Goal' as EventTypeEnum,
    userId,
    targetValue: goal.targetValue || null,
    currentValue: 0,
    unit: goal.unit || null,
    goalCategory: goal.category || null,
    priority: goal.priority || null,
    status: goal.status || 'todo',
    milestones: goal.milestones || null,
    ...(goal.tags && { tags: goal.tags }),
  };

  const goalEvent = await createEvent(
    goalEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );

  return goalEvent;
}

export async function updateConsolidatedGoal(
  goalId: string,
  userId: string,
  updates: {
    status?: string;
    progress?: number;
    title?: string;
    description?: string;
    priority?: number;
    milestones?: unknown;
  },
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);

  if (!goal || (goal as { userId?: string }).userId !== userId) {
    return null;
  }

  return updateEvent(goalId, {
    ...(updates.status !== undefined && { status: updates.status }),
    ...(updates.title !== undefined && { title: updates.title }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.priority !== undefined && { priority: updates.priority }),
    ...(updates.milestones !== undefined && { milestones: updates.milestones }),
  });
}

export async function getConsolidatedGoalsByUser(
  userId: string,
  filters?: {
    status?: string;
    category?: string;
    sortBy?: 'priority' | 'createdAt' | 'status';
  },
): Promise<EventWithTagsAndPeople[]> {
  const conditions = [eq(events.userId, userId), eq(events.type, 'Goal'), isNull(events.deletedAt)];

  if (filters?.status) {
    conditions.push(eq(events.status, filters.status));
  }

  if (filters?.category) {
    conditions.push(eq(events.goalCategory, filters.category));
  }

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
  switch (filters?.sortBy) {
    case 'priority':
      orderByClause = asc(events.priority);
      break;
    case 'status':
      orderByClause = asc(events.status);
      break;
    case 'createdAt':
    default:
      orderByClause = desc(events.createdAt);
  }

  const goalsList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(orderByClause);

  const eventIds = goalsList.map((event) => event.id);
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForEvents(eventIds),
    getTagsForEvents(eventIds),
  ]);

  return goalsList.map((goalItem) => ({
    ...goalItem,
    tags: tagsMap.get(goalItem.id) || [],
    people: peopleMap.get(goalItem.id) || [],
  })) as unknown as EventWithTagsAndPeople[];
}
