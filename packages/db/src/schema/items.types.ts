/**
 * Computed Item Types
 *
 * This file contains all derived types computed from the Item schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from items.schema.ts
 */

import type { Item, ItemInsert, ItemSelect } from './items.schema';

export type { Item, ItemInsert, ItemSelect };

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Item} instead. This alias will be removed in a future version.
 */
export type ItemOutput = Item;

/**
 * @deprecated Use {@link ItemInsert} instead. This alias will be removed in a future version.
 */
export type ItemInput = ItemInsert;
