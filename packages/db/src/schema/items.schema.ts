import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { list } from './lists.schema';
import { users } from './users.schema';

export const itemType = pgEnum('ItemType', ['FLIGHT', 'PLACE']);

export const item = pgTable(
  'item',
  {
    id: uuid('id').primaryKey().notNull(),
    type: text('type').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    itemId: uuid('itemId').notNull(),
    listId: uuid('listId').notNull(),
    userId: uuid('userId').notNull(),
    itemType: itemType('itemType').default('PLACE').notNull(),
  },
  (table) => [
    uniqueIndex('item_listId_itemId_key').using(
      'btree',
      table.listId.asc().nullsLast(),
      table.itemId.asc().nullsLast(),
    ),
    // Composite index for getItemsForPlace queries
    index('item_itemId_itemType_idx').on(table.itemId, table.itemType),
    // Index for getListPlacesMap queries
    index('item_listId_idx').on(table.listId),
    // Composite index for filtered queries
    index('item_listId_itemType_idx').on(table.listId, table.itemType),
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'item_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'item_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export type Item = InferSelectModel<typeof item>;
export type ItemInsert = InferInsertModel<typeof item>;
export type ItemSelect = Item;

// Zod Validation Schemas
export const ItemTypeSchema = z.enum(['FLIGHT', 'PLACE']);

export const ItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemId: z.string(),
  listId: z.string(),
  userId: z.string(),
  itemType: ItemTypeSchema,
});

export const ItemInsertSchema = ItemSchema.partial().extend({
  id: z.string().optional(),
  type: z.string(),
  itemId: z.string(),
  listId: z.string(),
  userId: z.string(),
  itemType: ItemTypeSchema.optional(),
});
