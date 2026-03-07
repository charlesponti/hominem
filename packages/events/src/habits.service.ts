import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  type EventWithTagsAndPeople,
  updateEvent,
} from './event-core.service';

export interface HabitStats {
  streakCount: number;
  totalCompletions: number;
  completionRate: number;
  lastCompletedDate: Date | null;
}

export async function getHabitStats(userId: string, habitId: string): Promise<HabitStats> {
  const habit = await getEventById(habitId);
  if (!habit || habit.userId !== userId || habit.type !== 'Habit') {
    return {
      streakCount: 0,
      totalCompletions: 0,
      completionRate: 0,
      lastCompletedDate: null,
    };
  }

  const streakCount = habit.streakCount ?? 0;
  const totalCompletions = habit.completedInstances ?? 0;
  const completionRate = totalCompletions > 0 ? (totalCompletions / (streakCount + 1)) * 100 : 0;

  return {
    streakCount,
    totalCompletions,
    completionRate,
    lastCompletedDate: habit.date,
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
  return createEvent({
    title: habit.title,
    description: habit.description ?? null,
    date: new Date(),
    type: 'Habit',
    userId,
    interval: habit.interval ?? null,
    recurrenceRule: habit.recurrenceRule ?? null,
    streakCount: 0,
    completedInstances: 0,
    ...(habit.tags !== undefined ? { tags: habit.tags } : {}),
  });
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
  if (!habit || habit.userId !== userId || habit.type !== 'Habit') {
    return null;
  }

  return updateEvent(habitId, {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.interval !== undefined ? { interval: updates.interval } : {}),
    ...(updates.recurrenceRule !== undefined ? { recurrenceRule: updates.recurrenceRule } : {}),
  });
}

export async function markHabitComplete(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);
  if (!habit || habit.userId !== userId || habit.type !== 'Habit') {
    return null;
  }

  return updateEvent(habitId, {
    streakCount: (habit.streakCount ?? 0) + 1,
    completedInstances: (habit.completedInstances ?? 0) + 1,
    isCompleted: true,
  });
}

export async function resetHabitStreak(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);
  if (!habit || habit.userId !== userId || habit.type !== 'Habit') {
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
  let habits = (await getEvents()).filter(
    (event) => event.userId === userId && event.type === 'Habit',
  );

  if (filters?.active) {
    habits = habits.filter((habit) => habit.isCompleted);
  }

  switch (filters?.sortBy) {
    case 'streak':
      habits.sort((a, b) => (b.streakCount ?? 0) - (a.streakCount ?? 0));
      break;
    case 'completions':
      habits.sort((a, b) => (b.completedInstances ?? 0) - (a.completedInstances ?? 0));
      break;
    case 'name':
    default:
      habits.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return habits;
}

export async function getHabitById(
  habitId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const habit = await getEventById(habitId);
  if (!habit || habit.userId !== userId || habit.type !== 'Habit') {
    return null;
  }
  return habit;
}

export async function deleteHabit(habitId: string, userId: string): Promise<boolean> {
  const habit = await getHabitById(habitId, userId);
  if (!habit) {
    return false;
  }
  return deleteEvent(habitId);
}
