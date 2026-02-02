/**
 * Computed Task Types
 *
 * This file contains all derived types computed from the Task schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from tasks.schema.ts
 */

import type {
  Task,
  TaskInsert,
  TaskSelect,
  TaskStatus,
  TaskPriority,
} from './tasks.schema'

export type {
  Task,
  TaskInsert,
  TaskSelect,
  TaskStatus,
  TaskPriority,
}

// Legacy aliases for backward compatibility
export type TaskOutput = Task
export type TaskInput = TaskInsert
