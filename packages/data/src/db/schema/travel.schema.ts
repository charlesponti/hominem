import { foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import { list } from './lists.schema'
import { users } from './users.schema'

export const flight = pgTable(
  'flight',
  {
    id: uuid('id').primaryKey().notNull(),
    flightNumber: text('flightNumber').notNull(),
    departureAirport: text('departureAirport').notNull(),
    departureDate: timestamp('departureDate', { mode: 'string' }).notNull(),
    arrivalDate: timestamp('arrivalDate', { mode: 'string' }).notNull(),
    arrivalAirport: text('arrivalAirport').notNull(),
    airline: text('airline').notNull(),
    reservationNumber: text('reservationNumber'),
    url: text('url'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    userId: uuid('userId').notNull(),
    listId: uuid('listId'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'flight_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'flight_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const hotel = pgTable(
  'hotel',
  {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    checkInDate: timestamp('checkInDate', { mode: 'string' }).notNull(),
    checkOutDate: timestamp('checkOutDate', { mode: 'string' }).notNull(),
    reservationNumber: text('reservationNumber').notNull(),
    roomType: text('roomType').notNull(),
    numberOfGuests: text('numberOfGuests').notNull(),
    url: text('url').notNull(),
    phoneNumber: text('phoneNumber'),
    price: text('price'),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    userId: uuid('userId').notNull(),
    listId: uuid('listId'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'hotel_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'hotel_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const transport = pgTable(
  'transport',
  {
    id: uuid('id').primaryKey().notNull(),
    type: text('type').notNull(), // taxi, train, bus, etc.
    departureLocation: text('departureLocation').notNull(),
    arrivalLocation: text('arrivalLocation').notNull(),
    departureTime: timestamp('departureTime', { mode: 'string' }).notNull(),
    arrivalTime: timestamp('arrivalTime', { mode: 'string' }).notNull(),
    reservationNumber: text('reservationNumber'),
    price: text('price'),
    url: text('url'),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    userId: uuid('userId').notNull(),
    listId: uuid('listId'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'transport_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'transport_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const activity = pgTable(
  'activity',
  {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    location: text('location').notNull(),
    startTime: timestamp('startTime', { mode: 'string' }).notNull(),
    endTime: timestamp('endTime', { mode: 'string' }).notNull(),
    bookingReference: text('bookingReference'),
    price: text('price'),
    url: text('url'),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    userId: uuid('userId').notNull(),
    listId: uuid('listId'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'activity_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'activity_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const flightRelations = relations(flight, ({ one }) => ({
  user: one(users, {
    fields: [flight.userId],
    references: [users.id],
  }),
  list: one(list, {
    fields: [flight.listId],
    references: [list.id],
  }),
}))
