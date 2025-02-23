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
} from 'drizzle-orm/pg-core'
import { users } from './users.schema'

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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('artist_name_idx').on(table.name),
    index('spotify_id_idx').on(table.spotifyId),
    index('genres_idx').on(table.genres),
  ]
)

export type ArtistInsert = typeof artists.$inferInsert
export type Artist = typeof artists.$inferSelect

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
    notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'user_artist_pk',
      columns: [table.userId, table.artistId],
    }),
    index('user_id_idx').on(table.userId),
    index('artist_id_idx').on(table.artistId),
  ]
)
