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
  updateEvent,
} from './event-core.service';

export interface GoalStats {
  progress: number;
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

  return createEvent(
    goalEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );
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
    currentValue: Math.min(currentValue, targetValue),
    isCompleted: currentValue >= targetValue,
  });
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

export interface ConsolidatedGoalStats {
  status: string;
  progress: number;
  currentValue: number;
  targetValue: number;
  remaining: number;
  milestones?: { description: string; isCompleted: boolean }[] | null;
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
    milestones?: { description: string; isCompleted: boolean }[] | null;
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

  return createEvent(
    goalEventInput as Omit<DbEventInput, 'id'> & {
      tags?: string[];
      people?: string[];
    },
  );
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
    milestones?: { description: string; isCompleted: boolean }[] | null;
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

export async function getGoalById(
  goalId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);
  const candidate = goal as (EventWithTagsAndPeople & { userId?: string; type?: string }) | null;
  if (!candidate || candidate.userId !== userId || candidate.type !== 'Goal') {
    return null;
  }
  return candidate;
}

export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const goal = await getGoalById(goalId, userId);
  if (!goal) {
    return false;
  }
  return deleteEvent(goalId);
}
