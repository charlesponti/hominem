import * as schema from '@hominem/data/schema'
import { and, asc, desc, eq, inArray, like, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Database connection
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
const client = postgres(connectionString)
export const db = drizzle(client, { schema })

// Helper function to get tags for an event
export async function getTagsForLifeEvent(eventId: string) {
  const result = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
      description: schema.tags.description,
    })
    .from(schema.eventsTags)
    .innerJoin(schema.tags, eq(schema.eventsTags.tagId, schema.tags.id))
    .where(eq(schema.eventsTags.eventId, eventId))

  return result
}

// Helper function to get people for an event
export async function getPeopleForLifeEvent(eventId: string) {
  const result = await db
    .select({
      id: schema.contacts.id,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
    })
    .from(schema.eventsUsers)
    .innerJoin(schema.contacts, eq(schema.eventsUsers.personId, schema.contacts.id))
    .where(eq(schema.eventsUsers.eventId, eventId))

  return result
}

// Helper function to add tags to an event
export async function addTagsToLifeEvent(eventId: string, tagIds: string[]) {
  if (tagIds.length === 0) return []

  const relationships = tagIds.map((tagId) => ({
    eventId,
    tagId,
  }))

  const result = await db.insert(schema.eventsTags).values(relationships).returning()

  return result
}

// Helper function to remove tags from an event
export async function removeTagsFromLifeEvent(eventId: string, tagIds?: string[]) {
  if (tagIds && tagIds.length > 0) {
    return await db
      .delete(schema.eventsTags)
      .where(and(eq(schema.eventsTags.eventId, eventId), inArray(schema.eventsTags.tagId, tagIds)))
  }
  return await db.delete(schema.eventsTags).where(eq(schema.eventsTags.eventId, eventId))
}

// Helper function to sync tags for an event (replace all existing relationships)
export async function syncTagsForLifeEvent(eventId: string, tagIds: string[]) {
  // Remove all existing relationships
  await removeTagsFromLifeEvent(eventId)

  // Add new relationships
  if (tagIds.length > 0) {
    return await addTagsToLifeEvent(eventId, tagIds)
  }

  return []
}

// CRUD operations for life events
export async function getLifeEvents(
  filters: { tagNames?: string[]; companion?: string; sortBy?: string } = {}
) {
  // Build conditions array
  const conditions = []

  // Filter by tag names if provided
  if (filters.tagNames && filters.tagNames.length > 0) {
    // Get tag IDs for the specified tag names
    const tagResults = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(inArray(schema.tags.name, filters.tagNames))

    const tagIds = tagResults.map((t) => t.id)

    if (tagIds.length > 0) {
      // Find events that have any of these tags
      const eventIds = await db
        .select({ eventId: schema.eventsTags.eventId })
        .from(schema.eventsTags)
        .where(inArray(schema.eventsTags.tagId, tagIds))

      const eventIdsList = eventIds.map((e) => e.eventId)
      if (eventIdsList.length > 0) {
        conditions.push(inArray(schema.events.id, eventIdsList))
      } else {
        // No events found with these tags, return empty
        return []
      }
    } else {
      // No tags found with these names, return empty
      return []
    }
  }

  // Legacy companion filter (search in contacts relationships)
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

  // Determine sorting
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

  // Build and execute query
  const events =
    conditions.length > 0
      ? await db
          .select()
          .from(schema.events)
          .where(and(...conditions))
          .orderBy(orderByClause)
      : await db.select().from(schema.events).orderBy(orderByClause)

  // Add people and tags data
  const eventsWithData = await Promise.all(
    events.map(async (event) => {
      const [people, tags] = await Promise.all([
        getPeopleForLifeEvent(event.id),
        getTagsForLifeEvent(event.id),
      ])
      return {
        ...event,
        tags: tags,
        people: people,
      }
    })
  )

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
    tags: tags,
    people: people,
  }
}

export async function createLifeEvent(event: {
  title: string
  description?: string
  date: Date
  type?: string
  tags?: string[] // Array of tag IDs
  people?: string[] // Array of person IDs
}) {
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

  // Add people relationships if provided
  if (event.people && event.people.length > 0) {
    const relationships = event.people.map((personId) => ({
      eventId: createdEvent.id,
      personId,
    }))
    await db.insert(schema.eventsUsers).values(relationships)
  }

  // Add tag relationships if provided
  if (event.tags && event.tags.length > 0) {
    await addTagsToLifeEvent(createdEvent.id, event.tags)
  }

  // Return the event with people and tags data
  const [people, tags] = await Promise.all([
    getPeopleForLifeEvent(createdEvent.id),
    getTagsForLifeEvent(createdEvent.id),
  ])

  return {
    ...createdEvent,
    tags: tags,
    people: people,
  }
}

export async function updateLifeEvent(
  id: string,
  event: {
    title?: string
    description?: string
    date?: Date
    type?: string
    tags?: string[] // Array of tag IDs
    people?: string[] // Array of person IDs
  }
) {
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

  // Update people relationships if provided
  if (event.people !== undefined) {
    // Remove existing relationships
    await db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.eventId, id))

    // Add new relationships
    if (event.people.length > 0) {
      const relationships = event.people.map((personId) => ({
        eventId: id,
        personId,
      }))
      await db.insert(schema.eventsUsers).values(relationships)
    }
  }

  // Update tag relationships if provided
  if (event.tags !== undefined) {
    await syncTagsForLifeEvent(id, event.tags)
  }

  // Return the event with people and tags data
  const [people, tags] = await Promise.all([getPeopleForLifeEvent(id), getTagsForLifeEvent(id)])

  return {
    ...updatedEvent,
    tags: tags,
    people: people,
  }
}

export async function deleteLifeEvent(id: string) {
  // Delete all relationships (people and tags)
  await Promise.all([
    db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.eventId, id)),
    removeTagsFromLifeEvent(id),
  ])

  // Then delete the event
  const result = await db.delete(schema.events).where(eq(schema.events.id, id)).returning()

  return result.length > 0
}

// People CRUD operations (now using contacts)
export async function getPeople() {
  return await db.select().from(schema.contacts).orderBy(asc(schema.contacts.firstName))
}

export async function getPersonById(id: string) {
  const result = await db.select().from(schema.contacts).where(eq(schema.contacts.id, id)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function createPerson(person: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}) {
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

export async function updatePerson(
  id: string,
  person: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
) {
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
  // First delete all relationships
  await db.delete(schema.eventsUsers).where(eq(schema.eventsUsers.personId, id))

  // Then delete the person
  const result = await db.delete(schema.contacts).where(eq(schema.contacts.id, id)).returning()

  return result.length > 0
}

// Tags CRUD operations
export async function getTags() {
  return await db.select().from(schema.tags).orderBy(asc(schema.tags.name))
}

export async function getTagById(id: string) {
  const result = await db.select().from(schema.tags).where(eq(schema.tags.id, id)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function getTagByName(name: string) {
  const result = await db.select().from(schema.tags).where(eq(schema.tags.name, name)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function createTag(tag: { name: string; color?: string; description?: string }) {
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

export async function updateTag(
  id: string,
  tag: {
    name?: string
    color?: string
    description?: string
  }
) {
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
  // First delete all relationships
  await db.delete(schema.eventsTags).where(eq(schema.eventsTags.tagId, id))

  // Then delete the tag
  const result = await db.delete(schema.tags).where(eq(schema.tags.id, id)).returning()

  return result.length > 0
}

// Helper function to find or create tags by name
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
