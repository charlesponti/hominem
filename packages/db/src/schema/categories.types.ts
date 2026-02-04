/**
 * Computed Category Types
 *
 * This file contains all derived types computed from the Category schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from categories.schema.ts
 */

import type {
  Category,
  CategoryInsert,
  CategorySelect,
  CategoryInsertSchemaType,
  CategorySelectSchemaType,
} from './categories.schema';

export type {
  Category,
  CategoryInsert,
  CategorySelect,
  CategoryInsertSchemaType,
  CategorySelectSchemaType,
};

// Legacy aliases for backward compatibility
export type CategoryOutput = Category;
export type CategoryInput = CategoryInsert;
