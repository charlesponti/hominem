import { foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';

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
  ],
);

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
  user: one(users, {
    fields: [bookmark.userId],
    references: [users.id],
  }),
}));

export interface Bookmark {
  id: string;
  image: string | null;
  title: string;
  description: string | null;
  imageHeight: string | null;
  imageWidth: string | null;
  locationAddress: string | null;
  locationLat: string | null;
  locationLng: string | null;
  siteName: string;
  url: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
export type BookmarkSelect = Bookmark;
export interface BookmarkInsert {
  id: string;
  image?: string | null;
  title: string;
  description?: string | null;
  imageHeight?: string | null;
  imageWidth?: string | null;
  locationAddress?: string | null;
  locationLat?: string | null;
  locationLng?: string | null;
  siteName: string;
  url: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}
