import { db } from '@hominem/db';
import { and, asc, desc, eq, inArray, like, or } from '@hominem/db';
import { type SQL } from '@hominem/db';
import { events, eventsTags, eventsUsers } from '@hominem/db/schema/calendar';
import { contacts } from '@hominem/db/schema/contacts';
import { tags } from '@hominem/db/schema/tags';
import type {
  EventOutput as DbEventOutput,
  EventInput as DbEventInput,
  EventTypeEnum,
} from '@hominem/db/types/calendar';

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

type EventPersonProjection = { id: string; firstName: string; lastName: string | null };
type EventTagProjection = { id: string; name: string; color: string | null; description: string | null };

export async function getPeopleForEvent(eventId: string): Promise<EventPersonProjection[]> {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(eventsUsers)
    .innerJoin(contacts, eq(eventsUsers.personId, contacts.id))
    .where(eq(eventsUsers.eventId, eventId)) as Promise<EventPersonProjection[]>;
}

export async function getPeopleForEvents(eventIds: string[]): Promise<Map<string, EventPersonProjection[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      eventId: eventsUsers.eventId,
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(eventsUsers)
    .innerJoin(contacts, eq(eventsUsers.personId, contacts.id))
    .where(inArray(eventsUsers.eventId, eventIds));

  const map = new Map<string, EventPersonProjection[]>();
  for (const row of rows) {
    if (!row.eventId) {
      continue;
    }
    const current = map.get(row.eventId) ?? [];
    current.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
    });
    map.set(row.eventId, current);
  }
  return map;
}

async function replacePeopleForEvent(eventId: string, people?: string[]): Promise<void> {
  if (people === undefined) {
    return;
  }

  await db.delete(eventsUsers).where(eq(eventsUsers.eventId, eventId));

  if (people.length === 0) {
    return;
  }

  await db.insert(eventsUsers).values(
    people.map((personId) => ({
      eventId,
      personId,
    })),
  );
}

export async function getTagsForEvent(eventId: string): Promise<EventTagProjection[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(eventsTags)
    .innerJoin(tags, eq(eventsTags.tagId, tags.id))
    .where(eq(eventsTags.eventId, eventId)) as Promise<EventTagProjection[]>;
}

export async function getTagsForEvents(eventIds: string[]): Promise<Map<string, EventTagProjection[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      eventId: eventsTags.eventId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(eventsTags)
    .innerJoin(tags, eq(eventsTags.tagId, tags.id))
    .where(inArray(eventsTags.eventId, eventIds));

  const map = new Map<string, EventTagProjection[]>();
  for (const row of rows) {
    if (!row.eventId) {
      continue;
    }
    const current = map.get(row.eventId) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
    });
    map.set(row.eventId, current);
  }
  return map;
}

async function addTagsToEvent(eventId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) {
    return;
  }

  await db.insert(eventsTags).values(
    tagIds.map((tagId) => ({
      eventId,
      tagId,
    })),
  );
}

export async function removeTagsFromEvent(eventId: string, tagIds?: string[]): Promise<void> {
  if (tagIds && tagIds.length > 0) {
    await db
      .delete(eventsTags)
      .where(and(eq(eventsTags.eventId, eventId), inArray(eventsTags.tagId, tagIds)));
    return;
  }

  await db.delete(eventsTags).where(eq(eventsTags.eventId, eventId));
}

async function syncTagsForEvent(eventId: string, tagIds: string[]): Promise<void> {
  await removeTagsFromEvent(eventId);
  await addTagsToEvent(eventId, tagIds);
}

async function findOrCreateTagsByNames(
  ownerId: string,
  tagNames: string[],
): Promise<Array<typeof tags.$inferSelect>> {
  if (tagNames.length === 0) {
    return [];
  }

  await db
    .insert(tags)
    .values(
      tagNames.map((name) => ({
        id: crypto.randomUUID(),
        userId: ownerId,
        name,
        color: null,
        description: null,
      })),
    )
    .onConflictDoNothing({ target: [tags.userId, tags.name] });

  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, ownerId), inArray(tags.name, tagNames)));

  const rowByName = new Map(rows.map((row) => [row.name, row]));
  return tagNames.map((name) => rowByName.get(name)).filter((row): row is typeof tags.$inferSelect => !!row);
}

export async function getEvents(filters: EventFilters = {}): Promise<EventWithTagsAndPeople[]> {
  const conditions: Array<SQL<unknown>> = [];

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
    const tagObjects = await findOrCreateTagsByNames(event.userId, event.tags);
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
  if (!updatedEvent) {
    return null;
  }

  if (peopleInput !== undefined) {
    await replacePeopleForEvent(id, peopleInput);
  }

  if (tagsInput !== undefined) {
    const tagObjects = await findOrCreateTagsByNames(updatedEvent.userId, tagsInput);
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
