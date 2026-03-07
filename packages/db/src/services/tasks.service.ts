/**
 * Tasks service - manages todo tasks, goals, and lists
 * 
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, asc, gt, or } from 'drizzle-orm'
import type { Database } from './client'
import { getDb } from './client'
import { tasks, taskLists } from '../schema/tasks'
import type { TaskId, UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'
import type { CursorPaginationParams } from './_shared/query'
import { normalizePaginationParams, decodeCursor } from './_shared/query'

export type { TaskId }

// Local types for this service
type Task = typeof tasks.$inferSelect
type TaskInsert = typeof tasks.$inferInsert
type TaskUpdate = Partial<Omit<TaskInsert, 'id' | 'userId'>>

interface TaskCursor {
  createdAt: string
  id: string
}

function decodeTaskCursor(cursorValue: string): TaskCursor | null {
  const decoded = decodeCursor(cursorValue)
  if (!decoded) {
    return null
  }
  const separator = decoded.indexOf('|')
  if (separator <= 0) {
    return null
  }
  const createdAt = decoded.slice(0, separator)
  const id = decoded.slice(separator + 1)
  if (!createdAt || !id) {
    return null
  }
  return { createdAt, id }
}

/**
 * Internal helper: verify user ownership
 * @throws ForbiddenError if task doesn't belong to user
 */
async function getTaskWithOwnershipCheck(db: Database | undefined, taskId: TaskId, userId: UserId): Promise<Task> {
  const database = db || getDb()
  const task = await (database as any).query.tasks.findFirst({
    where: and(eq(tasks.id, String(taskId)), eq(tasks.userId, String(userId))),
  })

  if (!task) {
    throw new ForbiddenError(`Task not found or access denied`, 'ownership')
  }

  return task
}

/**
 * List user's tasks with pagination and filtering
 *
 * @param userId - User ID (enforced in all queries)
 * @param query - Optional filters: status, priority, pagination
 * @param db - Database context
 * @returns Array of tasks (empty if none)
 */
export async function listTasks(
  userId: UserId,
  query?: {
    status?: string
    priority?: string
    pagination?: CursorPaginationParams
  },
  db?: Database
): Promise<Task[]> {
  const database = db || getDb()
  const paging = normalizePaginationParams(query?.pagination)

  // Build filters
  const filters = [eq(tasks.userId, String(userId))]

  if (query?.status) {
    filters.push(eq(tasks.status, query.status))
  }
  if (query?.priority) {
    filters.push(eq(tasks.priority, query.priority))
  }

  // Handle cursor pagination
  const cursor = decodeTaskCursor(paging.cursor)
  if (cursor) {
    filters.push(
      or(
        gt(tasks.createdAt, cursor.createdAt),
        and(eq(tasks.createdAt, cursor.createdAt), gt(tasks.id, cursor.id)),
      )!,
    )
  }

  // Query
  const results = await (database as any).query.tasks.findMany({
    where: and(...filters),
    orderBy: [asc(tasks.createdAt), asc(tasks.id)],
    limit: paging.limit + 1, // Fetch one extra to detect hasMore
  })

  // Return just the requested amount
  return results.slice(0, paging.limit)
}

/**
 * Get a single task by ID
 *
 * @param taskId - Task ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Task or null if not found
 */
export async function getTask(
  taskId: TaskId,
  userId: UserId,
  db?: Database
): Promise<Task | null> {
  const database = db || getDb()
  const task = await (database as any).query.tasks.findFirst({
    where: and(eq(tasks.id, String(taskId)), eq(tasks.userId, String(userId))),
  })

  return task || null
}

/**
 * Create a new task
 *
 * @param data - Task data (title required, userId inferred)
 * @param userId - User ID
 * @param db - Database context
 * @returns Created task
 * @throws Error if database constraint violated
 */
export async function createTask(
  data: {
    title: string
    description?: string
    status?: string
    priority?: string
    dueDate?: Date | null
    listId?: string | null
    parentId?: string | null
  },
  userId: UserId,
  db?: Database
): Promise<Task> {
  const database = db || getDb()
  try {
    const [created] = await (database as any)
      .insert(tasks)
      .values({
        ...data,
        userId: String(userId),
        status: data.status || 'pending',
        priority: data.priority || 'medium',
      })
      .returning()

    return created
  } catch (error) {
    throw error
  }
}

/**
 * Update a task
 *
 * @param taskId - Task ID to update
 * @param userId - User ID (enforces ownership)
 * @param data - Fields to update
 * @param db - Database context
 * @returns Updated task or null if not found
 * @throws ForbiddenError if not user's task
 */
export async function updateTask(
  taskId: TaskId,
  userId: UserId,
  data: TaskUpdate,
  db?: Database
): Promise<Task | null> {
  const database = db || getDb()
  try {
    await getTaskWithOwnershipCheck(database, taskId, userId)

    const [updated] = await (database as any)
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, String(taskId)))
      .returning()

    return updated || null
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return null
    }
    throw error
  }
}

/**
 * Delete a task
 *
 * @param taskId - Task ID to delete
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns true if deleted, false if not found
 * @throws ForbiddenError if not user's task
 */
export async function deleteTask(taskId: TaskId, userId: UserId, db?: Database): Promise<boolean> {
  const database = db || getDb()
  try {
    await getTaskWithOwnershipCheck(database, taskId, userId)

    const result = await database
      .delete(tasks)
      .where(eq(tasks.id, String(taskId)))
      .returning({ id: tasks.id })

    return result.length > 0
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return false
    }
    throw error
  }
}

/**
 * Service exports (public API)
 */
export const TaskService = {
  list: listTasks,
  get: getTask,
  create: createTask,
  update: updateTask,
  delete: deleteTask,
}
