export type EventTypeEnum = 'Events' | 'Goal' | 'Habit' | 'Health';

export interface EventInput {
  id?: string;
  title: string;
  description?: string | null;
  date?: Date | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
  dateTime?: Date | null;
  type?: EventTypeEnum;
  userId: string;
  source?: string | null;
  externalId?: string | null;
  calendarId?: string | null;
  placeId?: string | null;
  visitNotes?: string | null;
  visitRating?: number | null;
  visitReview?: string | null;
  interval?: string | null;
  recurrenceRule?: string | null;
  priority?: number | null;
  goalCategory?: string | null;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
  status?: string | null;
  isCompleted?: boolean | null;
  streakCount?: number | null;
  completedInstances?: number | null;
  activityType?: string | null;
  duration?: number | null;
  caloriesBurned?: number | null;
  milestones?: Array<{ description: string; isCompleted: boolean }> | null;
  tags?: string[];
  people?: string[];
}

export interface EventOutput {
  id: string;
  title: string;
  description: string | null;
  date: Date | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  dateTime: Date | null;
  type: EventTypeEnum;
  userId: string;
  source: string | null;
  externalId: string | null;
  calendarId: string | null;
  placeId: string | null;
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  interval: string | null;
  recurrenceRule: string | null;
  priority: number | null;
  goalCategory: string | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  status: string | null;
  isCompleted: boolean;
  streakCount: number;
  completedInstances: number;
  activityType: string | null;
  duration: number | null;
  caloriesBurned: number | null;
  milestones: Array<{ description: string; isCompleted: boolean }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventFilters {
  tagNames?: string[] | undefined;
  companion?: string | undefined;
  sortBy?: 'date-asc' | 'date-desc' | 'summary' | undefined;
}

export interface EventWithTagsAndPeople extends EventOutput {
  tags: Array<{ id: string; name: string; color: string | null; description: string | null }>;
  people: Array<{ id: string; firstName: string; lastName: string | null }>;
}

export type UpdateEventInput = Partial<
  Omit<EventInput, 'id' | 'userId' | 'tags' | 'people' | 'type'>
> & {
  tags?: string[];
  people?: string[];
  type?: EventTypeEnum;
};
