import * as z from 'zod';

/**
 * Pagination query parameters for list endpoints
 */
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Pagination metadata in list responses
 */
const paginationMetaSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

/**
 * Standard error response structure
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
});

/**
 * Success response wrapper
 */
const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * Common timestamp fields
 */
const timestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * ID parameter for single resource endpoints
 */
const idParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Sort parameter for list endpoints
 */
const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Date range filter for list endpoints
 */
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Search query parameter
 */
const searchQuerySchema = z.object({
  q: z.string().min(1).optional(),
});
