/**
 * Computed Task Types
 *
 * This file contains all derived types computed from the Task schema.
 * These types are inferred from Drizzle ORM schema definitions and Zod validation schemas.
 *
 * Rule: Import from this file, not from tasks.schema.ts
 */

import type {
  Task,
  TaskInsert,
  TaskSelect,
  TaskStatus,
  TaskPriority,
  TaskInsertSchemaType,
  TaskSelectSchemaType,
} from './tasks.schema'

export type {
  Task,
  TaskInsert,
  TaskSelect,
  TaskStatus,
  TaskPriority,
  TaskInsertSchemaType,
  TaskSelectSchemaType,
}

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Task} instead. This alias will be removed in a future version.
 */
export type TaskOutput = Task

/**
 * @deprecated Use {@link TaskInsert} instead. This alias will be removed in a future version.
 */
export type TaskInput = TaskInsert
