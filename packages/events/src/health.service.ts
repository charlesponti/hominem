import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
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
  let activities = (await getEvents()).filter(
    (event) => event.userId === userId && event.type === 'Health' && event.activityType !== null,
  );

  if (activityType) {
    activities = activities.filter((event) => event.activityType === activityType);
  }

  if (startDate) {
    activities = activities.filter((event) => event.date !== null && event.date >= startDate);
  }

  if (endDate) {
    activities = activities.filter((event) => event.date !== null && event.date <= endDate);
  }

  activities.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const totalActivities = activities.length;
  const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration ?? 0), 0);
  const totalCaloriesBurned = activities.reduce(
    (sum, activity) => sum + (activity.caloriesBurned ?? 0),
    0,
  );
  const averageCaloriesPerSession = totalActivities > 0 ? totalCaloriesBurned / totalActivities : 0;
  const lastActivityDate = activities[0]?.date ?? null;

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
  return createEvent({
    title: activity.title,
    description: activity.description ?? null,
    date: activity.date ?? new Date(),
    type: 'Health',
    userId,
    activityType: activity.activityType,
    duration: activity.duration,
    caloriesBurned: activity.caloriesBurned,
    ...(activity.tags !== undefined ? { tags: activity.tags } : {}),
  });
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

  if (!activity || activity.userId !== userId || activity.type !== 'Health') {
    return null;
  }

  return updateEvent(activityId, {
    ...(updates.duration !== undefined ? { duration: updates.duration } : {}),
    ...(updates.caloriesBurned !== undefined ? { caloriesBurned: updates.caloriesBurned } : {}),
    ...(updates.activityType !== undefined ? { activityType: updates.activityType } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
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
  let activities = (await getEvents()).filter(
    (event) => event.userId === userId && event.type === 'Health' && event.activityType !== null,
  );

  if (filters?.activityType) {
    activities = activities.filter((event) => event.activityType === filters.activityType);
  }

  if (filters?.startDate) {
    const startDate = filters.startDate;
    activities = activities.filter((event) => event.date !== null && event.date >= startDate);
  }

  if (filters?.endDate) {
    const endDate = filters.endDate;
    activities = activities.filter((event) => event.date !== null && event.date <= endDate);
  }

  switch (filters?.sortBy) {
    case 'calories':
      activities.sort((a, b) => (b.caloriesBurned ?? 0) - (a.caloriesBurned ?? 0));
      break;
    case 'duration':
      activities.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
      break;
    case 'date':
    default:
      activities.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
      break;
  }

  return activities;
}

export async function getHealthActivityById(
  activityId: string,
  userId: string,
): Promise<EventWithTagsAndPeople | null> {
  const activity = await getEventById(activityId);
  if (!activity || activity.userId !== userId || activity.type !== 'Health') {
    return null;
  }
  return activity;
}

export async function deleteHealthActivity(activityId: string, userId: string): Promise<boolean> {
  const activity = await getHealthActivityById(activityId, userId);
  if (!activity) {
    return false;
  }
  return deleteEvent(activityId);
}
