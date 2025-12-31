import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
} from "drizzle-orm";
import { db } from "../db";
import {
  type CalendarEventInsert,
  contacts,
  type EventTypeEnum,
  events,
  eventsTags,
  eventsUsers,
  place,
  tags,
} from "../db/schema";
import {
  getPeopleForEvent,
  getPeopleForEvents,
  replacePeopleForEvent,
} from "./people.service";
import {
  addTagsToEvent,
  findOrCreateTagsByNames,
  getTagsForEvent,
  getTagsForEvents,
  removeTagsFromEvent,
  syncTagsForEvent,
} from "./tags.service";

export interface EventFilters {
  tagNames?: string[];
  companion?: string;
  sortBy?: "date-asc" | "date-desc" | "summary";
}

export async function getEvents(filters: EventFilters = {}) {
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

      const eventIdsList = eventIds
        .map((e) => e.eventId)
        .filter((id): id is string => id !== null);

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
          like(contacts.lastName, `%${filters.companion}%`)
        )
      );

    const contactIds = contactResults.map((c) => c.id);

    if (contactIds.length > 0) {
      const eventIds = await db
        .select({ eventId: eventsUsers.eventId })
        .from(eventsUsers)
        .where(inArray(eventsUsers.personId, contactIds));

      const eventIdsList = eventIds
        .map((e) => e.eventId)
        .filter((id): id is string => id !== null);

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
    case "date-asc":
      orderByClause = asc(events.date);
      break;
    case "date-desc":
      orderByClause = desc(events.date);
      break;
    case "summary":
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
  }));
}

export async function createEvent(
  event: Omit<CalendarEventInsert, "id"> & {
    tags?: string[];
    people?: string[];
  }
) {
  const [result] = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      title: event.title,
      description: event.description || null,
      date: event.date,
      type: (event.type || "Events") as EventTypeEnum,
      placeId: event.placeId || null,
      userId: event.userId,
      visitNotes: event.visitNotes || null,
      visitRating: event.visitRating || null,
      visitReview: event.visitReview || null,
      visitPeople: event.visitPeople || null,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create event");
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
  };
}

export type UpdateEventInput = Partial<
  Omit<typeof events.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">
> & {
  tags?: string[];
  people?: string[];
};

export async function updateEvent(id: string, event: UpdateEventInput) {
  const updateData: Partial<typeof events.$inferInsert> = {};

  Object.assign(updateData, { ...event, updatedAt: new Date() });

  const result = await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, id))
    .returning();

  if (result.length === 0) {
    return null;
  }

  const updatedEvent = result[0];

  if (event.people !== undefined) {
    await replacePeopleForEvent(id, event.people);
  }

  if (event.tags !== undefined) {
    const tagObjects = await findOrCreateTagsByNames(event.tags);
    const tagIds = tagObjects.map((tag) => tag.id);
    await syncTagsForEvent(id, tagIds);
  }

  const [people, tagsList] = await Promise.all([
    getPeopleForEvent(id),
    getTagsForEvent(id),
  ]);

  return {
    ...updatedEvent,
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

export async function getEventById(id: string) {
  const [result] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!result) {
    return null;
  }

  const [people, tagsList] = await Promise.all([
    getPeopleForEvent(id),
    getTagsForEvent(id),
  ]);

  return {
    ...result,
    tags: tagsList,
    people,
  };
}

export async function getEventByExternalId(
  externalId: string,
  calendarId: string
) {
  const [result] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.externalId, externalId), eq(events.calendarId, calendarId))
    )
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
  };
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
    .where(and(eq(events.userId, userId), eq(events.source, "google_calendar")))
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

export async function getVisitsByUser(userId: string, filters?: VisitFilters) {
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

export async function getVisitsByPlace(placeId: string, userId?: string) {
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

export async function getVisitStatsByPlace(
  placeId: string,
  userId: string
): Promise<VisitStats> {
  const visits = await db
    .select({
      date: events.date,
      visitRating: events.visitRating,
    })
    .from(events)
    .where(
      and(
        eq(events.placeId, placeId),
        eq(events.userId, userId),
        isNull(events.deletedAt)
      )
    )
    .orderBy(desc(events.date));

  const visitCount = visits.length;
  const lastVisitDate = visits[0]?.date || null;

  const ratings = visits
    .map((v) => v.visitRating)
    .filter((r): r is number => r !== null && r !== undefined);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

  return {
    visitCount,
    lastVisitDate,
    averageRating,
  };
}
