import { and, desc, eq, gte, isNotNull, isNull, lte } from '@hominem/db';
import { db } from '@hominem/db';
import { events } from '@hominem/db/schema/calendar';
import { place } from '@hominem/db/schema/places';
import type { EventInput as DbEventInput } from '@hominem/db/types/calendar';

import {
  createEvent,
  deleteEvent,
  type EventWithTagsAndPeople,
  type UpdateEventInput,
  getPeopleForEvents,
  getTagsForEvents,
  updateEvent,
} from './event-core.service';

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
    isNotNull(events.placeId),
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

export async function createVisit(
  event: Omit<DbEventInput, 'id'> & {
    tags?: string[];
    people?: string[];
  },
): Promise<EventWithTagsAndPeople> {
  return createEvent(event);
}

export async function updateVisit(
  visitId: string,
  updates: UpdateEventInput,
): Promise<EventWithTagsAndPeople | null> {
  return updateEvent(visitId, updates);
}

export async function deleteVisit(visitId: string): Promise<boolean> {
  return deleteEvent(visitId);
}
