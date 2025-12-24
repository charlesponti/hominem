import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../db";
import {
  contacts,
  events,
  eventsTags,
  eventsUsers,
  type EventTypeEnum,
  tags,
} from "../db/schema";
import {
  getPeopleForEvent,
  getPeopleForEvents,
  replacePeopleForEvent,
} from "./people.service";
import {
  addTagsToEvent,
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

export interface EventInput {
  title: string;
  description?: string;
  date: Date;
  type?: string;
  tags?: string[];
  people?: string[];
}

export async function createEvent(event: EventInput) {
  const [result] = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      title: event.title,
      description: event.description || null,
      date: event.date,
      type: (event.type || "Events") as EventTypeEnum,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create event");
  }

  if (event.people && event.people.length > 0) {
    await replacePeopleForEvent(result.id, event.people);
  }

  if (event.tags && event.tags.length > 0) {
    await addTagsToEvent(result.id, event.tags);
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

export interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: Date;
  type?: string;
  tags?: string[];
  people?: string[];
}

export async function updateEvent(id: string, event: UpdateEventInput) {
  const updateData: Record<string, unknown> = {};

  if (event.title !== undefined) updateData.title = event.title;
  if (event.description !== undefined)
    updateData.description = event.description;
  if (event.date !== undefined) updateData.date = event.date;
  if (event.type !== undefined) updateData.type = event.type;

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
    await syncTagsForEvent(id, event.tags);
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
