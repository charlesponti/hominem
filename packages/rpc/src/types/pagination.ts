import * as z from 'zod';

/**
 * Pagination Input Schema
 *
 * Standard schema for pagination parameters.
 * Define offset/limit as query parameters for GET requests.
 *
 * @example
 * ```typescript
 * financeRoutes.get('/', zValidator('query', PaginationSchema), async (c) => {
 *   const { limit, offset } = c.req.valid('query');
 *   // ... fetch paginated results
 * });
 * ```
 */
export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).describe('Items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Paginated Response Type
 *
 * Generic wrapper for paginated list responses.
 * Includes metadata about total items, current page, and available pages.
 *
 * @template T - The type of items in the list
 *
 * @example
 * ```typescript
 * type AccountsResponse = PaginatedResponse<Account>;
 *
 * const response: AccountsResponse = {
 *   data: [account1, account2],
 *   pagination: {
 *     total: 42,
 *     limit: 20,
 *     offset: 0,
 *     pages: 3,
 *   },
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

/**
 * Create a paginated response
 *
 * Helper function to construct a consistent paginated response.
 *
 * @param data - The array of items
 * @param total - Total count of all items (before pagination)
 * @param limit - Items per page
 * @param offset - Current offset
 * @returns Paginated response object
 *
 * @example
 * ```typescript
 * const accounts = await listAccountsPaginated(userId, limit, offset);
 * const total = await countAccounts(userId);
 * return c.json(createPaginatedResponse(accounts, total, limit, offset));
 * ```
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Cursor-based Pagination Input Schema
 *
 * Alternative pagination using cursor (ID-based) for better performance with large datasets.
 *
 * @example
 * ```typescript
 * transactionsRoutes.get('/', zValidator('query', CursorPaginationSchema), async (c) => {
 *   const { cursor, limit } = c.req.valid('query');
 *   // ... fetch items after cursor
 * });
 * ```
 */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional().describe('ID of the last item from previous page'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Items per page'),
});

export type CursorPaginationInput = z.infer<typeof CursorPaginationSchema>;

/**
 * Cursor-based Paginated Response Type
 *
 * For efficient pagination over large datasets using cursor-based pagination.
 * The cursor points to the next set of results.
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string; // Cursor for next page, undefined if no more items
  hasMore: boolean;
  count: number;
}

/**
 * Create a cursor-paginated response
 *
 * @param data - The array of items
 * @param hasMore - Whether there are more items after this page
 * @param nextCursor - Cursor string for the next page (usually the ID of the last item)
 * @returns Cursor-paginated response object
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  hasMore: boolean,
  nextCursor?: string,
): CursorPaginatedResponse<T> {
  const response: CursorPaginatedResponse<T> = {
    data,
    hasMore,
    count: data.length,
  };

  if (hasMore && nextCursor) {
    response.cursor = nextCursor;
  }

  return response;
}
