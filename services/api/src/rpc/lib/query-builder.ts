/**
 * Query Builder Utilities
 *
 * Common patterns for building database queries with filtering, sorting, and pagination.
 * These utilities help keep route and service code DRY and consistent.
 *
 * Note: These are generic helpers used by services to build Kysely query filters.
 * Services convert the returned objects into Kysely WHERE clauses and query conditions.
 */

/**
 * Filter options for common field types
 */
export type FilterOptions = {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { min?: number; max?: number }
    | { contains?: string };
};

/**
 * Filter condition type
 * Represents a single filter condition to be applied
 */
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'like' | 'gte' | 'lte' | 'gt' | 'lt';
  value: unknown;
}

/**
 * Build a WHERE clause configuration from filter options
 *
 * Returns an array of filter conditions that can be converted to your ORM's WHERE clause.
 *
 * @param filters - Object with field as key and filter value
 * @returns Array of filter conditions ready for use with your ORM
 *
 * @example
 * ```typescript
 * const filters = { name: 'John', age: { min: 18, max: 65 } };
 * const conditions = buildWhereClause(filters);
 * // Returns: [
 * //   { field: 'name', operator: 'eq', value: 'John' },
 * //   { field: 'age', operator: 'gte', value: 18 },
 * //   { field: 'age', operator: 'lte', value: 65 }
 * // ]
 *
 * // Then apply to your ORM:
 * const where = and(...conditions.map(c =>
 * //   c.operator === 'eq' ? eq(fieldMap[c.field], c.value) : ...
 * // ));
 * ```
 */
export function buildWhereClause(filters: FilterOptions): FilterCondition[] {
  const conditions: FilterCondition[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && 'contains' in value) {
      // Text search
      if (value.contains) {
        conditions.push({
          field: key,
          operator: 'like',
          value: `%${value.contains}%`,
        });
      }
    } else if (typeof value === 'object' && ('min' in value || 'max' in value)) {
      // Range filter
      if ('min' in value && value.min !== undefined) {
        conditions.push({
          field: key,
          operator: 'gte',
          value: value.min,
        });
      }
      if ('max' in value && value.max !== undefined) {
        conditions.push({
          field: key,
          operator: 'lte',
          value: value.max,
        });
      }
    } else {
      // Exact match
      conditions.push({
        field: key,
        operator: 'eq',
        value,
      });
    }
  }

  return conditions;
}

/**
 * Build WHERE clause from multiple filter groups (OR logic)
 *
 * @param filterGroups - Array of filter option objects
 * @returns Array of grouped filter conditions
 */
export function buildOrWhereClause(filterGroups: FilterOptions[]): FilterCondition[][] {
  return filterGroups.map((filters) => buildWhereClause(filters)).filter((c) => c.length > 0);
}

/**
 * Sort options for database queries
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Validate sort field
 *
 * Ensures the sort field is in the allowed list.
 *
 * @example
 * ```typescript
 * const isValid = validateSortField('createdAt', ['createdAt', 'name']);
 * ```
 */
export function validateSortField(field: string, allowedFields: string[]): boolean {
  return allowedFields.includes(field);
}

/**
 * Apply pagination limits to a query
 *
 * Returns limit and offset values safe for use in database queries.
 *
 * @param limit - Items per page (clamped to 1-100)
 * @param offset - Number of items to skip (minimum 0)
 * @returns Pagination options with clamped values
 *
 * @example
 * ```typescript
 * const { limit, offset } = applyPagination(limit, offset);
 * const users = await db.query.users.findMany({
 *   limit,
 *   offset,
 * });
 * ```
 */
export function applyPagination(limit: number, offset: number): PaginationOptions {
  return {
    limit: Math.min(Math.max(limit, 1), 100), // Clamp between 1-100
    offset: Math.max(offset, 0), // Min 0
  };
}

/**
 * Query builder configuration helper
 *
 * Composes filter conditions, sort validation, and pagination into a single object.
 *
 * @example
 * ```typescript
 * const config = buildQueryConfig({
 *   filters: { status: 'active' },
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pagination: { limit: 20, offset: 0 },
 *   allowedSortFields: ['createdAt', 'name'],
 * });
 * ```
 */
export function buildQueryConfig(config: {
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination: PaginationOptions;
  allowedSortFields: string[];
}): {
  conditions: FilterCondition[];
  sort?: SortOptions | undefined;
  sortValid: boolean;
  pagination: PaginationOptions;
} {
  const conditions = config.filters ? buildWhereClause(config.filters) : [];
  const sortValid = config.sort ? validateSortField(config.sort.field, config.allowedSortFields) : true;

  return {
    conditions,
    ...(config.sort && sortValid ? { sort: config.sort } : {}),
    sortValid,
    pagination: applyPagination(config.pagination.limit, config.pagination.offset),
  };
}
