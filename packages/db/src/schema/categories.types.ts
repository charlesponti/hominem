/**
 * Computed Category Types
 */

import type { Category, CategoryInsert } from './categories.schema';

export type CategoryOutput = Category;
export type CategoryInput = CategoryInsert;

export { categories, categoryRelations } from './categories.schema';
