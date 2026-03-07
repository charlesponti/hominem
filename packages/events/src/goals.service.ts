import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  type EventWithTagsAndPeople,
  updateEvent,
} from './event-core.service';

export interface GoalStats {
  progress: number;
  currentValue: number;
  targetValue: number;
  remaining: number;
}

function toGoalProgress(goal: {
  currentValue: number | null;
  targetValue: number | null;
}): GoalStats {
  const currentValue = goal.currentValue ?? 0;
  const targetValue = goal.targetValue ?? 0;
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const remaining = Math.max(0, targetValue - currentValue);

  return {
    progress,
    currentValue,
    targetValue,
    remaining,
  };
}

export async function getGoalStats(goalId: string, userId: string): Promise<GoalStats> {
  const goal = await getEventById(goalId);
  if (!goal || goal.userId !== userId || goal.type !== 'Goal') {
    return { progress: 0, currentValue: 0, targetValue: 0, remaining: 0 };
  }
  return toGoalProgress(goal);
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
  return createEvent({
    title: goal.title,
    description: goal.description ?? null,
    date: new Date(),
    type: 'Goal',
    userId,
    targetValue: goal.targetValue,
    currentValue: 0,
    unit: goal.unit ?? null,
    goalCategory: goal.category ?? null,
    priority: goal.priority ?? null,
    ...(goal.tags !== undefined ? { tags: goal.tags } : {}),
  });
}

export async function updateGoalProgress(
  goalId: string,
  userId: string,
  increment: number,
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);
  if (!goal || goal.userId !== userId || goal.type !== 'Goal') {
    return null;
  }

  const nextCurrent = (goal.currentValue ?? 0) + increment;
  const target = goal.targetValue ?? 0;

  return updateEvent(goalId, {
    currentValue: Math.min(nextCurrent, target),
    isCompleted: nextCurrent >= target,
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
  let goals = (await getEvents()).filter(
    (event) => event.userId === userId && event.type === 'Goal',
  );

  if (filters?.active) {
    goals = goals.filter((goal) => !goal.isCompleted);
  }

  if (filters?.category) {
    goals = goals.filter((goal) => goal.goalCategory === filters.category);
  }

  switch (filters?.sortBy) {
    case 'progress':
      goals.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
      break;
    case 'priority':
      goals.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      break;
    case 'name':
    default:
      goals.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return goals;
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
  const goal = await getEventById(goalId);
  if (!goal || goal.userId !== userId || goal.type !== 'Goal') {
    return {
      status: 'todo',
      progress: 0,
      currentValue: 0,
      targetValue: 0,
      remaining: 0,
    };
  }

  const progress = toGoalProgress(goal);
  return {
    status: goal.status ?? 'todo',
    ...progress,
    milestones: goal.milestones,
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
  return createEvent({
    title: goal.title,
    description: goal.description ?? null,
    date: new Date(),
    type: 'Goal',
    userId,
    targetValue: goal.targetValue ?? null,
    currentValue: 0,
    unit: goal.unit ?? null,
    goalCategory: goal.category ?? null,
    priority: goal.priority ?? null,
    status: goal.status ?? 'todo',
    milestones: goal.milestones ?? null,
    ...(goal.tags !== undefined ? { tags: goal.tags } : {}),
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
  let goals = (await getEvents()).filter(
    (event) => event.userId === userId && event.type === 'Goal',
  );

  if (filters?.status) {
    goals = goals.filter((goal) => (goal.status ?? 'todo') === filters.status);
  }

  if (filters?.category) {
    goals = goals.filter((goal) => goal.goalCategory === filters.category);
  }

  switch (filters?.sortBy) {
    case 'priority':
      goals.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      break;
    case 'status':
      goals.sort((a, b) => (a.status ?? 'todo').localeCompare(b.status ?? 'todo'));
      break;
    case 'createdAt':
    default:
      goals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
  }

  return goals;
}

export async function updateConsolidatedGoal(
  goalId: string,
  userId: string,
  updates: {
    status?: string;
    title?: string;
    description?: string;
    priority?: number;
    currentValue?: number;
    milestones?: { description: string; isCompleted: boolean }[] | null;
  },
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);
  if (!goal || goal.userId !== userId || goal.type !== 'Goal') {
    return null;
  }

  return updateEvent(goalId, {
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
    ...(updates.currentValue !== undefined ? { currentValue: updates.currentValue } : {}),
    ...(updates.milestones !== undefined ? { milestones: updates.milestones } : {}),
  });
}

export async function getGoalById(
  goalId: string,
  userId?: string,
): Promise<EventWithTagsAndPeople | null> {
  const goal = await getEventById(goalId);
  if (!goal || goal.type !== 'Goal') {
    return null;
  }
  if (userId && goal.userId !== userId) {
    return null;
  }
  return goal;
}

export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const goal = await getGoalById(goalId, userId);
  if (!goal) {
    return false;
  }
  return deleteEvent(goalId);
}
