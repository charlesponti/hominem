import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const artists = pgTable(
  'artists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // URL-friendly name
    hometown: text('hometown'),
    country: text('country'),
    bandMembers: integer('band_members').notNull().default(1),
    genres: text('genres').array().notNull(),
    averageTicketPrice: decimal('average_ticket_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
    averagePerformanceAttendance: integer('average_performance_attendance'),
    sellsMerchandise: boolean('sells_merchandise').notNull().default(false),
    averageMerchandisePrice: decimal('average_merchandise_price', {
      precision: 10,
      scale: 2,
    }),
    imageUrl: text('image_url'),
    websiteUrl: text('website_url'),

    // Spotify-specific data
    spotifyFollowers: integer('spotify_followers').default(0),
    spotifyUrl: text('spotify_url'),
    spotifyId: text('spotify_id').notNull().unique(),
    spotifyData: jsonb('spotify_data').notNull(),

    // Timestamps
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('artist_name_idx').on(table.name),
    index('spotify_id_idx').on(table.spotifyId),
    index('genres_idx').on(table.genres),
  ],
);

export const ArtistInsertSchema = createInsertSchema(artists, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ArtistSelectSchema = createSelectSchema(artists, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ArtistInsertSchemaType = z.infer<typeof ArtistInsertSchema>;
export type ArtistSelectSchemaType = z.infer<typeof ArtistSelectSchema>;
export type Artist = ArtistSelectSchemaType;
export type ArtistInsert = ArtistInsertSchemaType;
export type ArtistSelect = Artist;

export const userArtists = pgTable(
  'user_artists',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    // Additional relationship data
    isFavorite: boolean('is_favorite').notNull().default(false),
    rating: integer('rating').default(1),
    lastListenedAt: timestamp('last_listened_at'),
    isNotificationsEnabled: boolean('is_notifications_enabled').notNull().default(true),
    notes: text('notes'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    primaryKey({
      name: 'user_artist_pk',
      columns: [table.userId, table.artistId],
    }),
    index('user_id_idx').on(table.userId),
    index('artist_id_idx').on(table.artistId),
  ],
);

export const UserArtistInsertSchema = createInsertSchema(userArtists, {
  createdAt: z.string(),
  updatedAt: z.string(),
  lastListenedAt: z.date().nullable(),
});
export const UserArtistSelectSchema = createSelectSchema(userArtists, {
  createdAt: z.string(),
  updatedAt: z.string(),
  lastListenedAt: z.date().nullable(),
});
export type UserArtistInsertSchemaType = z.infer<typeof UserArtistInsertSchema>;
export type UserArtistSelectSchemaType = z.infer<typeof UserArtistSelectSchema>;
export type UserArtist = UserArtistSelectSchemaType;
export type UserArtistInsert = UserArtistInsertSchemaType;
export type UserArtistSelect = UserArtist;
