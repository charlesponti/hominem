import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { foreignKey, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const bookmark = pgTable(
  'bookmark',
  {
    id: uuid('id').primaryKey().notNull(),
    image: text('image'),
    title: text('title').notNull(),
    description: text('description'),
    imageHeight: text('imageHeight'),
    imageWidth: text('imageWidth'),
    locationAddress: text('locationAddress'),
    locationLat: text('locationLat'),
    locationLng: text('locationLng'),
    siteName: text('siteName').notNull(),
    url: text('url').notNull(),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'bookmark_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    index('bookmark_user_id_idx').on(table.userId),
  ],
);

export type Bookmark = InferSelectModel<typeof bookmark>;
export type BookmarkInsert = InferInsertModel<typeof bookmark>;
export type BookmarkSelect = Bookmark;
