/**
 * Possessions service - manages possessions and containers
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, desc } from 'drizzle-orm'
import type { Database } from './client'
import { db as defaultDb } from '../index'
import { possessions, possessionContainers } from '../schema/possessions'
import type { UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'

// Local types for this service
type Possession = typeof possessions.$inferSelect
type PossessionInsert = typeof possessions.$inferInsert
type PossessionUpdate = Partial<Omit<PossessionInsert, 'id' | 'userId' | 'createdAt'>>

type PossessionContainer = typeof possessionContainers.$inferSelect

/**
 * Internal helper: verify user ownership of possession
 * @throws ForbiddenError if possession doesn't belong to user
 */
async function getPossessionWithOwnershipCheck(db: Database | undefined, possessionId: string, userId: UserId): Promise<Possession> {
  const database = db || (defaultDb as any as Database)
  const possession = await database.query.possessions.findFirst({
    where: and(eq(possessions.id, possessionId), eq(possessions.userId, String(userId))),
  })

  if (!possession) {
    throw new ForbiddenError(`Possession not found or access denied`, 'ownership')
  }

  return possession
}

/**
 * Internal helper: verify user ownership of container
 * @throws ForbiddenError if container doesn't belong to user
 */
async function getContainerWithOwnershipCheck(db: Database | undefined, containerId: string, userId: UserId): Promise<PossessionContainer> {
  const database = db || (defaultDb as any as Database)
  const container = await database.query.possessionContainers.findFirst({
    where: and(eq(possessionContainers.id, containerId), eq(possessionContainers.userId, String(userId))),
  })

  if (!container) {
    throw new ForbiddenError(`Container not found or access denied`, 'ownership')
  }

  return container
}

/**
 * List user's possessions with optional filtering
 *
 * @param userId - User ID (enforced in all queries)
 * @param category - Optional category filter
 * @param db - Database context
 * @returns Array of possessions (empty if none)
 */
export async function listPossessions(
  userId: UserId,
  category?: string,
  db?: Database
): Promise<Possession[]> {
  const database = db || (defaultDb as any as Database)
  const filters: any[] = [eq(possessions.userId, String(userId))]

  if (category) {
    filters.push(eq(possessions.category, category))
  }

  const results = await database.query.possessions.findMany({
    where: and(...filters),
  })

  return results
}

/**
 * Get a single possession by ID
 *
 * @param possessionId - Possession ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Possession or null if not found
 */
export async function getPossession(
  possessionId: string,
  userId: UserId,
  db?: Database
): Promise<Possession | null> {
  const database = db || (defaultDb as any as Database)
  const possession = await database.query.possessions.findFirst({
    where: and(eq(possessions.id, possessionId), eq(possessions.userId, String(userId))),
  })

  return possession ?? null
}

/**
 * Create a new possession
 *
 * @param userId - User ID
 * @param input - Possession data
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created possession
 */
export async function createPossession(
  userId: UserId,
  input: {
    containerId?: string | null
    name: string
    description?: string | null
    category?: string | null
    condition?: string | null
    location?: string | null
  },
  db?: Database
): Promise<Possession> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(possessions)
    .values({
      userId: String(userId),
      containerId: input.containerId ?? null,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      condition: input.condition ?? null,
      location: input.location ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create possession')
  }

  return result[0]
}

/**
 * Update an existing possession
 *
 * @param possessionId - Possession ID
 * @param userId - User ID (enforces ownership)
 * @param input - Partial possession data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the possession
 * @returns Updated possession or null if already deleted
 */
export async function updatePossession(
  possessionId: string,
  userId: UserId,
  input: PossessionUpdate,
  db?: Database
): Promise<Possession | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getPossessionWithOwnershipCheck(database, possessionId, userId)

  const result = await database.update(possessions)
    .set(input)
    .where(eq(possessions.id, possessionId))
    .returning()

  return result[0] ?? null
}

/**
 * Delete a possession
 *
 * @param possessionId - Possession ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the possession
 * @returns True if deleted, false if already deleted
 */
export async function deletePossession(
  possessionId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getPossessionWithOwnershipCheck(database, possessionId, userId)

  const result = await database.delete(possessions)
    .where(eq(possessions.id, possessionId))
    .returning()

  return result.length > 0
}

/**
 * List user's possession containers
 *
 * @param userId - User ID (enforced in all queries)
 * @param db - Database context
 * @returns Array of containers (empty if none)
 */
export async function listContainers(
  userId: UserId,
  db?: Database
): Promise<PossessionContainer[]> {
  const database = db || (defaultDb as any as Database)
  const results = await database.query.possessionContainers.findMany({
    where: eq(possessionContainers.userId, String(userId)),
  })

  return results
}

/**
 * Get a single container by ID
 *
 * @param containerId - Container ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Container or null if not found
 */
export async function getContainer(
  containerId: string,
  userId: UserId,
  db?: Database
): Promise<PossessionContainer | null> {
  const database = db || (defaultDb as any as Database)
  const container = await database.query.possessionContainers.findFirst({
    where: and(eq(possessionContainers.id, containerId), eq(possessionContainers.userId, String(userId))),
  })

  return container ?? null
}

/**
 * Create a new container
 *
 * @param userId - User ID
 * @param input - Container data
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created container
 */
export async function createContainer(
  userId: UserId,
  input: { name: string; description?: string | null },
  db?: Database
): Promise<PossessionContainer> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(possessionContainers)
    .values({
      userId: String(userId),
      name: input.name,
      description: input.description ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create container')
  }

  return result[0]
}

/**
 * Update an existing container
 *
 * @param containerId - Container ID
 * @param userId - User ID (enforces ownership)
 * @param input - Container data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the container
 * @returns Updated container or null if already deleted
 */
export async function updateContainer(
  containerId: string,
  userId: UserId,
  input: { name?: string; description?: string | null },
  db?: Database
): Promise<PossessionContainer | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getContainerWithOwnershipCheck(database, containerId, userId)

  const result = await database.update(possessionContainers)
    .set(input)
    .where(eq(possessionContainers.id, containerId))
    .returning()

  return result[0] ?? null
}

/**
 * Delete a container
 *
 * @param containerId - Container ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the container
 * @returns True if deleted, false if already deleted
 */
export async function deleteContainer(
  containerId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  return database.transaction(async (tx) => {
    await getContainerWithOwnershipCheck(tx as Database, containerId, userId)
    await tx.update(possessions).set({ containerId: null }).where(eq(possessions.containerId, containerId))
    const result = await tx.delete(possessionContainers).where(eq(possessionContainers.id, containerId)).returning()
    return result.length > 0
  })
}
