import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { type AnyPgColumn, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

/**
 * Universal categories that can be used for both finance transactions and possessions
 * Supports hierarchical organization (e.g., "Electronics > Computers > Laptops")
 * or "Finance > Expenses > Entertainment"
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  domain: text('domain').default('general').notNull(),
  icon: text('icon'),
  color: text('color'),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const CategoryInsertSchema = createInsertSchema(categories);
export const CategorySelectSchema = createSelectSchema(categories);
export type CategoryInput = z.infer<typeof CategoryInsertSchema>;
export type CategoryOutput = z.infer<typeof CategorySelectSchema>;
