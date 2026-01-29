import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export interface Trip {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripInsert {
  id?: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const tripsRelations = relations(trips, ({ one }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
}))
