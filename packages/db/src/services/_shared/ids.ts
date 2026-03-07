/**
 * Branded ID utilities for type-safe entity identification
 * 
 * Branded types ensure compile-time type safety without runtime overhead.
 * All IDs are strings at runtime, but have distinct types at compile time.
 */

// Domain-specific branded ID types
export type TaskId = string & { __brand: 'TaskId' }
export type TagId = string & { __brand: 'TagId' }
export type CalendarEventId = string & { __brand: 'CalendarEventId' }
export type PersonId = string & { __brand: 'PersonId' }
export type BookmarkId = string & { __brand: 'BookmarkId' }
export type PossessionId = string & { __brand: 'PossessionId' }
export type FinanceCategoryId = string & { __brand: 'FinanceCategoryId' }
export type FinanceAccountId = string & { __brand: 'FinanceAccountId' }
export type FinanceTransactionId = string & { __brand: 'FinanceTransactionId' }
export type UserId = string & { __brand: 'UserId' }

/**
 * Type-safe branded ID casting
 * 
 * Use this after validated external input to cast to branded type.
 * This is only safe after validation has confirmed the ID format.
 * 
 * @example
 * const validatedId = await idSchema.parseAsync(req.params.id)
 * const taskId = brandId<TaskId>(validatedId)
 */
export function brandId<T extends string & { __brand: unknown }>(
  id: string
): T {
  return id as T
}

/**
 * Extract the raw string value from a branded ID (for API responses, logging, etc.)
 * 
 * @example
 * const taskId: TaskId = '...'
 * const raw = unbrandId(taskId) // string
 */
export function unbrandId(id: unknown): string {
  return String(id)
}
