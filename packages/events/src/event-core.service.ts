import crypto from 'node:crypto'
import type {
  EventFilters,
  EventInput,
  EventOutput,
  EventWithTagsAndPeople,
  UpdateEventInput,
} from './contracts'
export type { EventFilters, EventInput, EventOutput, EventTypeEnum, EventWithTagsAndPeople, UpdateEventInput } from './contracts'

type EventStoreRecord = EventOutput & {
  tagNames: string[]
  peopleIds: string[]
}

const eventsStore = new Map<string, EventStoreRecord>()

function toWithRelations(event: EventStoreRecord): EventWithTagsAndPeople {
  return {
    ...event,
    tags: event.tagNames.map((name) => ({
      id: name,
      name,
      color: null,
      description: null,
    })),
    people: event.peopleIds.map((id) => ({
      id,
      firstName: 'Person',
      lastName: null,
    })),
  }
}

export async function getPeopleForEvent(eventId: string) {
  const event = eventsStore.get(eventId)
  if (!event) {
    return []
  }
  return event.peopleIds.map((id) => ({ id, firstName: 'Person', lastName: null }))
}

export async function getPeopleForEvents(eventIds: string[]) {
  const map = new Map<string, Array<{ id: string; firstName: string; lastName: string | null }>>()
  for (const id of eventIds) {
    map.set(id, await getPeopleForEvent(id))
  }
  return map
}

export async function getTagsForEvent(eventId: string) {
  const event = eventsStore.get(eventId)
  if (!event) {
    return []
  }
  return event.tagNames.map((name) => ({ id: name, name, color: null, description: null }))
}

export async function getTagsForEvents(eventIds: string[]) {
  const map = new Map<string, Array<{ id: string; name: string; color: string | null; description: string | null }>>()
  for (const id of eventIds) {
    map.set(id, await getTagsForEvent(id))
  }
  return map
}

export async function removeTagsFromEvent(eventId: string, tagIds?: string[]): Promise<void> {
  const event = eventsStore.get(eventId)
  if (!event) {
    return
  }
  if (!tagIds || tagIds.length === 0) {
    event.tagNames = []
  } else {
    const remove = new Set(tagIds)
    event.tagNames = event.tagNames.filter((name) => !remove.has(name))
  }
  event.updatedAt = new Date().toISOString()
  eventsStore.set(eventId, event)
}

export async function getEvents(filters: EventFilters = {}): Promise<EventWithTagsAndPeople[]> {
  let rows = Array.from(eventsStore.values())

  if (filters.tagNames && filters.tagNames.length > 0) {
    const required = new Set(filters.tagNames)
    rows = rows.filter((event) => event.tagNames.some((name) => required.has(name)))
  }

  switch (filters.sortBy) {
    case 'date-asc':
      rows.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
      break
    case 'summary':
      rows.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'date-desc':
    default:
      rows.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
      break
  }

  return rows.map(toWithRelations)
}

export async function createEvent(
  event: Omit<EventInput, 'id'> & {
    tags?: string[]
    people?: string[]
  },
): Promise<EventWithTagsAndPeople> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  const record: EventStoreRecord = {
    id,
    title: event.title,
    description: event.description ?? null,
    date: event.date ?? new Date(),
    dateStart: event.dateStart ?? null,
    dateEnd: event.dateEnd ?? null,
    dateTime: event.dateTime ?? null,
    type: event.type ?? 'Events',
    userId: event.userId,
    source: event.source ?? 'manual',
    externalId: event.externalId ?? null,
    calendarId: event.calendarId ?? null,
    placeId: event.placeId ?? null,
    visitNotes: event.visitNotes ?? null,
    visitRating: event.visitRating ?? null,
    visitReview: event.visitReview ?? null,
    interval: event.interval ?? null,
    recurrenceRule: event.recurrenceRule ?? null,
    priority: event.priority ?? null,
    goalCategory: event.goalCategory ?? null,
    targetValue: event.targetValue ?? null,
    currentValue: event.currentValue ?? null,
    unit: event.unit ?? null,
    status: event.status ?? 'active',
    isCompleted: Boolean(event.isCompleted ?? false),
    streakCount: event.streakCount ?? 0,
    completedInstances: event.completedInstances ?? 0,
    activityType: event.activityType ?? null,
    duration: event.duration ?? null,
    caloriesBurned: event.caloriesBurned ?? null,
    milestones: event.milestones ?? null,
    createdAt: now,
    updatedAt: now,
    tagNames: event.tags ?? [],
    peopleIds: event.people ?? [],
  }

  eventsStore.set(id, record)
  return toWithRelations(record)
}

export async function updateEvent(
  id: string,
  event: UpdateEventInput,
): Promise<EventWithTagsAndPeople | null> {
  const existing = eventsStore.get(id)
  if (!existing) {
    return null
  }

  const next: EventStoreRecord = {
    ...existing,
    ...(event.title !== undefined ? { title: event.title } : {}),
    ...(event.description !== undefined ? { description: event.description ?? null } : {}),
    ...(event.date !== undefined ? { date: event.date ?? null } : {}),
    ...(event.dateStart !== undefined ? { dateStart: event.dateStart ?? null } : {}),
    ...(event.dateEnd !== undefined ? { dateEnd: event.dateEnd ?? null } : {}),
    ...(event.dateTime !== undefined ? { dateTime: event.dateTime ?? null } : {}),
    ...(event.type !== undefined ? { type: event.type } : {}),
    ...(event.externalId !== undefined ? { externalId: event.externalId ?? null } : {}),
    ...(event.calendarId !== undefined ? { calendarId: event.calendarId ?? null } : {}),
    ...(event.placeId !== undefined ? { placeId: event.placeId ?? null } : {}),
    ...(event.status !== undefined ? { status: event.status ?? null } : {}),
    ...(event.isCompleted !== undefined ? { isCompleted: Boolean(event.isCompleted) } : {}),
    ...(event.streakCount !== undefined ? { streakCount: event.streakCount ?? 0 } : {}),
    ...(event.completedInstances !== undefined
      ? { completedInstances: event.completedInstances ?? 0 }
      : {}),
    ...(event.currentValue !== undefined ? { currentValue: event.currentValue ?? null } : {}),
    ...(event.targetValue !== undefined ? { targetValue: event.targetValue ?? null } : {}),
    ...(event.goalCategory !== undefined ? { goalCategory: event.goalCategory ?? null } : {}),
    ...(event.unit !== undefined ? { unit: event.unit ?? null } : {}),
    ...(event.priority !== undefined ? { priority: event.priority ?? null } : {}),
    ...(event.activityType !== undefined ? { activityType: event.activityType ?? null } : {}),
    ...(event.duration !== undefined ? { duration: event.duration ?? null } : {}),
    ...(event.caloriesBurned !== undefined ? { caloriesBurned: event.caloriesBurned ?? null } : {}),
    ...(event.milestones !== undefined ? { milestones: event.milestones ?? null } : {}),
    ...(event.tags !== undefined ? { tagNames: event.tags } : {}),
    ...(event.people !== undefined ? { peopleIds: event.people } : {}),
    updatedAt: new Date().toISOString(),
  }

  eventsStore.set(id, next)
  return toWithRelations(next)
}

export async function deleteEvent(id: string): Promise<boolean> {
  return eventsStore.delete(id)
}

export async function getEventById(id: string): Promise<EventWithTagsAndPeople | null> {
  const event = eventsStore.get(id)
  return event ? toWithRelations(event) : null
}

export async function getEventByExternalId(
  externalId: string,
  calendarId: string,
): Promise<EventWithTagsAndPeople | null> {
  for (const event of eventsStore.values()) {
    if (event.externalId === externalId && event.calendarId === calendarId) {
      return toWithRelations(event)
    }
  }
  return null
}
