import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  parentId: uuid('parent_id'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Category = InferSelectModel<typeof categories>;
export type CategoryInsert = InferInsertModel<typeof categories>;
export type CategorySelect = Category;
