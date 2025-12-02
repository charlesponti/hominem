import { and, asc, desc, eq, inArray, like, or } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

// Helper function to get tags for an event
export async function getTagsForLifeEvent(eventId: string) {
  return db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
      description: schema.tags.description,
    })
    .from(schema.eventsTags)
    .innerJoin(schema.tags, eq(schema.eventsTags.tagId, schema.tags.id))
    .where(eq(schema.eventsTags.eventId, eventId))
}

// Helper function to get tags for multiple events
export async function getTagsForLifeEvents(eventIds: string[]) {
  if (eventIds.length === 0) return new Map()

  const rows = await db
    .select({
      eventId: schema.eventsTags.eventId,
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
      description: schema.tags.description,
    })
    .from(schema.eventsTags)
    .innerJoin(schema.tags, eq(schema.eventsTags.tagId, schema.tags.id))
    .where(inArray(schema.eventsTags.eventId, eventIds))

  const map = new Map<string, Array<{ id: string; name: string; color: string | null; description: string | null }>>()
  for (const row of rows) {
    if (!map.has(row.eventId)) {
      map.set(row.eventId, [])
    }
    map.get(row.eventId)!.push({
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
    })
  }
  return map
}

// Helper function to get people for an event
export async function getPeopleForLifeEvent(eventId: string) {
  return db
    .select({
      id: schema.contacts.id,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
    })
    .from(schema.eventsUsers)
    .innerJoin(schema.contacts, eq(schema.eventsUsers.personId, schema.contacts.id))
    .where(eq(schema.eventsUsers.eventId, eventId))
}

// Helper function to get people for multiple events
export async function getPeopleForLifeEvents(eventIds: string[]) {
  if (eventIds.length === 0) return new Map()

  const rows = await db
    .select({
      eventId: schema.eventsUsers.eventId,
      id: schema.contacts.id,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
    })
    .from(schema.eventsUsers)
    .innerJoin(schema.contacts, eq(schema.eventsUsers.personId, schema.contacts.id))
    .where(inArray(schema.eventsUsers.eventId, eventIds))

  const map = new Map<string, Array<{ id: string; firstName: string | null; lastName: string | null }>>()
  for (const row of rows) {
    if (!map.has(row.eventId)) {
      map.set(row.eventId, [])
    }
    map.get(row.eventId)!.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
    })
  }
  return map
}

// Helper function to add tags to an event
export async function addTagsToLifeEvent(eventId: string, tagIds: string[]) {
  if (tagIds.length === 0) return []

  const relationships = tagIds.map((tagId) => ({
    eventId,
    tagId,
  }))

  return db.insert(schema.eventsTags).values(relationships).returning()
}

// Helper function to remove tags from an event
export async function removeTagsFromLifeEvent(eventId: string, tagIds?: string[]) {
  if (tagIds && tagIds.length > 0) {
    return db
      .delete(schema.eventsTags)
      .where(and(eq(schema.eventsTags.eventId, eventId), inArray(schema.eventsTags.tagId, tagIds)))
  }

  return db.delete(schema.eventsTags).where(eq(schema.eventsTags.eventId, eventId))
}

// Helper function to sync tags for an event (replace all existing relationships)
export async function syncTagsForLifeEvent(eventId: string, tagIds: string[]) {
  await removeTagsFromLifeEvent(eventId)

  if (tagIds.length > 0) {
    return addTagsToLifeEvent(eventId, tagIds)
  }

  return []
}

export interface LifeEventFilters {
  tagNames?: string[]
  companion?: string
  sortBy?: 'date-asc' | 'date-desc' | 'summary'
}

// CRUD operations for life events
export async function getLifeEvents(filters: LifeEventFilters = {}) {
  const conditions = []

  if (filters.tagNames && filters.tagNames.length > 0) {
    const tagResults = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(inArray(schema.tags.name, filters.tagNames))

    const tagIds = tagResults.map((t) => t.id)

    if (tagIds.length > 0) {
      const eventIds = await db
        .select({ eventId: schema.eventsTags.eventId })
        .from(schema.eventsTags)
        .where(inArray(schema.eventsTags.tagId, tagIds))

      const eventIdsList = eventIds.map((e) => e.eventId)

      if (eventIdsList.length > 0) {
        conditions.push(inArray(schema.events.id, eventIdsList))
      } else {
        return []
      }
    } else {
      return []
    }
  }

  if (filters.companion) {
    const contactResults = await db
      .select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(
        or(
          like(schema.contacts.firstName, `%${filters.companion}%`),
          like(schema.contacts.lastName, `%${filters.companion}%`)
        )
      )

    const contactIds = contactResults.map((c) => c.id)

    if (contactIds.length > 0) {
      const eventIds = await db
        .select({ eventId: schema.eventsUsers.eventId })
        .from(schema.eventsUsers)
        .where(inArray(schema.eventsUsers.personId, contactIds))

      const eventIdsList = eventIds.map((e) => e.eventId)

      if (eventIdsList.length > 0) {
        conditions.push(inArray(schema.events.id, eventIdsList))
      } else {
        return []
      }
    } else {
      return []
    }
  }

  let orderByClause: ReturnType<typeof asc> | ReturnType<typeof desc>
  switch (filters.sortBy) {
    case 'date-asc':
      orderByClause = asc(schema.events.date)
      break
    case 'date-desc':
      orderByClause = desc(schema.events.date)
      break
    case 'summary':
      orderByClause = asc(schema.events.title)
      break
    default:
      orderByClause = desc(schema.events.date)
  }

  const events =
    conditions.length > 0
      ? await db.select().from(schema.events).where(and(...conditions)).orderBy(orderByClause)
      : await db.select().from(schema.events).orderBy(orderByClause)

  const eventIds = events.map((e) => e.id)
  const [peopleMap, tagsMap] = await Promise.all([
    getPeopleForLifeEvents(eventIds),
    getTagsForLifeEvents(eventIds),
  ])

  const eventsWithData = events.map((event) => {
    return {
      ...event,
      tags: tagsMap.get(event.id) || [],
      people: peopleMap.get(event.id) || [],
    }
  })

  return eventsWithData
}

export async function getLifeEventById(id: string) {
  const result = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1)

  if (result.length === 0) {
    return null
  }

  const event = result[0]
  const [people, tags] = await Promise.all([
    getPeopleForLifeEvent(event.id),
    getTagsForLifeEvent(event.id),
  ])

  return {
    ...event,
    tags,
    people,
  }
}

export interface LifeEventInput {
  title: string
  description?: string
  date: Date
  type?: string
  tags?: string[]
  people?: string[]
}

export async function createLifeEvent(event: LifeEventInput) {
  const result = await db
    .insert(schema.events)
    .values({
      title: event.title,
      description: event.description || null,
      date: event.date,
      type: event.type || 'Events',
    })
    .returning()

  const createdEvent = result[0]

  if (event.people && event.people.length > 0) {
    const relationships = event.people.map((personId) => ({
      eventId: createdEvent.id,
      personId,
    }))
    await db.insert(schema.eventsUsers).values(relationships)
  }

  if (event.tags && event.tags.length > 0) {
    await addTagsToLifeEvent(createdEvent.id, event.tags)
  }

  const [people, tags] = await Promise.all([
    getPeopleForLifeEvent(createdEvent.id),
    getTagsForLifeEvent(createdEvent.id),
  ])

  return {
    ...createdEvent,
    tags,
    people,
  }
}

export interface UpdateLifeEventInput {
  title?: string
  description?: string
  date?: Date
  type?: string
  tags?: string[]
  people?: string[]
}

export async function updateLifeEvent(id: string, event: UpdateLifeEventInput) {
  const updateData: Record<string, unknown> = {}

  if (event.title !== undefined) updateData.title = event.title
  if (event.description !== undefined) updateData.description = event.description
  if (event.date !== undefined) updateData.date = event.date
  if (event.type !== undefined) updateData.type = event.type

  const result = await db
    .update(schema.events)
    .set(updateData)
    .where(eq(schema.events.id, id))
    .returning()

  if (result.length === 0) {
    return null
  }

  const updatedEvent = result[0]

  if (event.people !== undefined) {
    await db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.eventId, id))

    if (event.people.length > 0) {
      const relationships = event.people.map((personId) => ({
        eventId: id,
        personId,
      }))
      await db.insert(schema.eventsUsers).values(relationships)
    }
  }

  if (event.tags !== undefined) {
    await syncTagsForLifeEvent(id, event.tags)
  }

  const [people, tags] = await Promise.all([
    getPeopleForLifeEvent(id),
    getTagsForLifeEvent(id),
  ])

  return {
    ...updatedEvent,
    tags,
    people,
  }
}

export async function deleteLifeEvent(id: string) {
  await Promise.all([
    db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.eventId, id)),
    removeTagsFromLifeEvent(id),
  ])

  const result = await db.delete(schema.events).where(eq(schema.events.id, id)).returning()

  return result.length > 0
}

export interface PersonInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export async function getPeople() {
  return db.select().from(schema.contacts).orderBy(asc(schema.contacts.firstName))
}

export async function getPersonById(id: string) {
  const result = await db.select().from(schema.contacts).where(eq(schema.contacts.id, id)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function createPerson(person: PersonInput) {
  const result = await db
    .insert(schema.contacts)
    .values({
      firstName: person.firstName || null,
      lastName: person.lastName || null,
      email: person.email || null,
      phone: person.phone || null,
    })
    .returning()

  return result[0]
}

export async function updatePerson(id: string, person: PersonInput) {
  const updateData: Record<string, unknown> = {}

  if (person.firstName !== undefined) updateData.firstName = person.firstName
  if (person.lastName !== undefined) updateData.lastName = person.lastName
  if (person.email !== undefined) updateData.email = person.email
  if (person.phone !== undefined) updateData.phone = person.phone

  const result = await db
    .update(schema.contacts)
    .set(updateData)
    .where(eq(schema.contacts.id, id))
    .returning()

  return result.length > 0 ? result[0] : null
}

export async function deletePerson(id: string) {
  await db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.personId, id))

  const result = await db.delete(schema.contacts).where(eq(schema.contacts.id, id)).returning()

  return result.length > 0
}

export interface TagInput {
  name: string
  color?: string
  description?: string
}

export async function getTags() {
  return db.select().from(schema.tags).orderBy(asc(schema.tags.name))
}

export async function getTagById(id: string) {
  const result = await db.select().from(schema.tags).where(eq(schema.tags.id, id)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function getTagByName(name: string) {
  const result = await db.select().from(schema.tags).where(eq(schema.tags.name, name)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function createTag(tag: TagInput) {
  const result = await db
    .insert(schema.tags)
    .values({
      name: tag.name,
      color: tag.color || null,
      description: tag.description || null,
    })
    .returning()

  return result[0]
}

export async function updateTag(id: string, tag: TagInput) {
  const updateData: Record<string, unknown> = {}

  if (tag.name !== undefined) updateData.name = tag.name
  if (tag.color !== undefined) updateData.color = tag.color
  if (tag.description !== undefined) updateData.description = tag.description

  const result = await db
    .update(schema.tags)
    .set(updateData)
    .where(eq(schema.tags.id, id))
    .returning()

  return result.length > 0 ? result[0] : null
}

export async function deleteTag(id: string) {
  await db.delete(schema.eventsTags).where(eq(schema.eventsTags.tagId, id))

  const result = await db.delete(schema.tags).where(eq(schema.tags.id, id)).returning()

  return result.length > 0
}

export async function findOrCreateTagsByNames(tagNames: string[]) {
  const tags = []

  for (const name of tagNames) {
    let tag = await getTagByName(name)
    if (!tag) {
      tag = await createTag({ name })
    }
    tags.push(tag)
  }

  return tags
}
