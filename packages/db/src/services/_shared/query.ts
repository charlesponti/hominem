/**
 * Shared query DTO utilities for list operations
 * 
 * Pattern: services accept flexible query DTOs that encapsulate pagination, sorting, and filtering.
 * This module provides the common types and helpers.
 */

/**
 * Pagination cursor for position-based pagination
 * 
 * Position-based pagination (cursor) is preferred over offset for:
 * - Stability across concurrent modifications
 * - Performance with large datasets
 * - Deterministic ordering
 */
export interface CursorPaginationParams {
  /** Max records to return. Must be > 0 and <= maxLimit. */
  limit?: number

  /** Position cursor to start from. For first page, omit. */
  cursor?: string

  /** Sort order: 'asc' or 'desc' */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Sorting configuration for list results
 * 
 * Contract: sorting must be deterministic (stable sort order)
 * Most lists sort by creation date or primary key
 */
export interface SortConfig {
  /** Column to sort by (should map to database column) */
  field: string

  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * Generic list query parameters
 * 
 * Implementers can extend this for domain-specific filters
 */
export interface ListQueryParams {
  /** Pagination/cursor controls */
  pagination?: CursorPaginationParams

  /** Sort configuration */
  sort?: SortConfig

  /** Generic filter object (domain-specific) */
  filters?: Record<string, unknown>
}

/**
 * Result of a list operation
 * 
 * Cursor-based pagination response includes next cursor for pagination
 */
export interface ListResult<T> {
  /** Items in the result set */
  items: T[]

  /** Cursor for fetching next page (undefined if at end) */
  nextCursor?: string

  /** Total count (optional, may be expensive) */
  totalCount?: number
}

/**
 * Constants for query pagination
 */
export const QUERY_LIMITS = {
  /** Default limit if not specified */
  DEFAULT: 20,
  /** Maximum allowed limit */
  MAX: 100,
  /** Minimum allowed limit */
  MIN: 1,
} as const

/**
 * Validate and normalize pagination params
 * 
 * @throws ConflictError if limit is invalid
 */
export function normalizePaginationParams(
  params: CursorPaginationParams | undefined,
  maxLimit: number = QUERY_LIMITS.MAX
): Required<CursorPaginationParams> {
  const rawLimit = params?.limit ?? QUERY_LIMITS.DEFAULT
  const numericLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : QUERY_LIMITS.DEFAULT
  const limit = Math.max(QUERY_LIMITS.MIN, Math.min(maxLimit, numericLimit))
  const sortOrder = params?.sortOrder ?? 'asc'
  const cursor = params?.cursor

  return {
    limit,
    cursor: cursor ?? '',
    sortOrder,
  }
}

/**
 * Create a stable cursor from an entity ID and sort field
 * 
 * Format: Opaque string (implementation detail)
 * Stability: Cursor must remain valid even if entities are added/deleted
 */
export function createCursor(entityId: string | number): string {
  // Encode as base64 to make it opaque
  return Buffer.from(`${entityId}`).toString('base64')
}

/**
 * Decode a cursor to get the entity ID
 * 
 * Returns the entity ID that was encoded in the cursor
 */
export function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8')
  } catch {
    return undefined
  }
}

/**
 * Build a deterministic sort clause for a database query
 * 
 * Pattern: all queries should sort by (id, createdAt) or similar to ensure stability
 */
export function buildSortClause(
  primaryField: string,
  direction: 'asc' | 'desc' = 'asc',
  tiebreaker: string = 'id'
): { field: string; direction: 'asc' | 'desc' }[] {
  return [
    { field: primaryField, direction },
    { field: tiebreaker, direction }, // Ensures stable sort
  ]
}
