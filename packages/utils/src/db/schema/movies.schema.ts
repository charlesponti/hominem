import { foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import { users } from './users.schema'

export const movie = pgTable('movie', {
  id: uuid('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  image: text('image').notNull(),
  director: text('director'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
})

export const movieViewings = pgTable(
  'movie_viewings',
  {
    id: uuid('id').primaryKey().notNull(),
    movieId: uuid('movieId').notNull(),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.movieId],
      foreignColumns: [movie.id],
      name: 'movie_viewings_movieId_movie_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'movie_viewings_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const movieViewingsRelations = relations(movieViewings, ({ one }) => ({
  movie: one(movie, {
    fields: [movieViewings.movieId],
    references: [movie.id],
  }),
  user: one(users, {
    fields: [movieViewings.userId],
    references: [users.id],
  }),
}))

export const movieRelations = relations(movie, ({ many }) => ({
  movieViewings: many(movieViewings),
}))
