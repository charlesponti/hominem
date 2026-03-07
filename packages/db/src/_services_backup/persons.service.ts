/**
 * Persons service - manages person contacts and relationships
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and } from 'drizzle-orm'
import type { Database } from './client'
import { db as defaultDb } from '../index'
import { persons, userPersonRelations } from '../schema/persons'
import type { PersonId, UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'

export type { PersonId }

// Local types for this service
type Person = typeof persons.$inferSelect
type PersonInsert = typeof persons.$inferInsert
type PersonUpdate = Partial<Omit<PersonInsert, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt'>>

type UserPersonRelation = typeof userPersonRelations.$inferSelect

/**
 * Internal helper: verify user ownership
 * @throws ForbiddenError if person doesn't belong to user
 */
async function getPersonWithOwnershipCheck(db: Database | undefined, personId: string, userId: UserId): Promise<Person> {
  const database = db || (defaultDb as any as Database)
  const person = await database.query.persons.findFirst({
    where: and(eq(persons.id, personId), eq(persons.ownerUserId, String(userId))),
  })

  if (!person) {
    throw new ForbiddenError(`Person not found or access denied`, 'ownership')
  }

  return person
}

/**
 * List user's persons
 *
 * @param userId - User ID (enforced in all queries)
 * @param db - Database context
 * @returns Array of persons (empty if none)
 */
export async function listPersons(
  userId: UserId,
  db?: Database
): Promise<Person[]> {
  const database = db || (defaultDb as any as Database)
  const results = await database.query.persons.findMany({
    where: eq(persons.ownerUserId, String(userId)),
    orderBy: persons.createdAt,
  })

  return results
}

/**
 * Get a single person by ID
 *
 * @param personId - Person ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Person or null if not found
 */
export async function getPerson(
  personId: string,
  userId: UserId,
  db?: Database
): Promise<Person | null> {
  const database = db || (defaultDb as any as Database)
  const person = await database.query.persons.findFirst({
    where: and(eq(persons.id, personId), eq(persons.ownerUserId, String(userId))),
  })

  return person ?? null
}

/**
 * Create a new person
 *
 * @param userId - User ID
 * @param input - Person data
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created person
 */
export async function createPerson(
  userId: UserId,
  input: {
    personType: string
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    phone?: string | null
    notes?: string | null
  },
  db?: Database
): Promise<Person> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(persons)
    .values({
      ownerUserId: String(userId),
      personType: input.personType,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create person')
  }

  return result[0]
}

/**
 * Update an existing person
 *
 * @param personId - Person ID
 * @param userId - User ID (enforces ownership)
 * @param input - Partial person data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the person
 * @returns Updated person or null if already deleted
 */
export async function updatePerson(
  personId: string,
  userId: UserId,
  input: PersonUpdate,
  db?: Database
): Promise<Person | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getPersonWithOwnershipCheck(database, personId, userId)

  const result = await database.update(persons)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(persons.id, personId))
    .returning()

  return result[0] ?? null
}

/**
 * Delete a person
 *
 * @param personId - Person ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the person
 * @returns True if deleted, false if already deleted
 */
export async function deletePerson(
  personId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  return database.transaction(async (tx) => {
    await getPersonWithOwnershipCheck(tx as Database, personId, userId)
    await tx.delete(userPersonRelations).where(eq(userPersonRelations.personId, personId))
    const result = await tx.delete(persons).where(eq(persons.id, personId)).returning()
    return result.length > 0
  })
}

/**
 * Get relations for a person
 *
 * @param personId - Person ID
 * @param userId - User ID (enforces ownership of person)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the person
 * @returns Array of relations
 */
export async function listPersonRelations(
  personId: string,
  userId: UserId,
  db?: Database
): Promise<UserPersonRelation[]> {
  const database = db || (defaultDb as any as Database)
  // Verify person ownership
  await getPersonWithOwnershipCheck(database, personId, userId)

  const results = await database.query.userPersonRelations.findMany({
    where: eq(userPersonRelations.personId, personId),
  })

  return results
}

/**
 * Add a relation for a person
 *
 * @param personId - Person ID
 * @param relatedUserId - Related user ID
 * @param relationshipType - Type of relationship
 * @param userId - User ID (enforces ownership of person)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the person
 * @throws Error if relation add fails
 * @returns Added relation
 */
export async function addPersonRelation(
  personId: string,
  relatedUserId: string,
  relationshipType: string | null,
  userId: UserId,
  db?: Database
): Promise<UserPersonRelation> {
  const database = db || (defaultDb as any as Database)
  // Verify person ownership
  await getPersonWithOwnershipCheck(database, personId, userId)

  const result = await database.insert(userPersonRelations)
    .values({
      personId,
      userId: relatedUserId,
      relationshipType,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to add person relation')
  }

  return result[0]
}
