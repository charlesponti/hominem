import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { list } from './lists.schema';
import { users } from './users.schema';

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
  ],
);

export type Flight = InferSelectModel<typeof flight>;
export type FlightInsert = InferInsertModel<typeof flight>;
export type FlightSelect = Flight;

export const FlightSchema = z.object({
  id: z.string(),
  flightNumber: z.string(),
  departureAirport: z.string(),
  departureDate: z.string(),
  arrivalDate: z.string(),
  arrivalAirport: z.string(),
  airline: z.string(),
  reservationNumber: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  listId: z.string().nullable().optional(),
});

export const FlightInsertSchema = FlightSchema.partial().extend({
  id: z.string().optional(),
  flightNumber: z.string(),
  departureAirport: z.string(),
  departureDate: z.string(),
  arrivalDate: z.string(),
  arrivalAirport: z.string(),
  airline: z.string(),
  userId: z.string(),
});

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
  ],
);

export type Hotel = InferSelectModel<typeof hotel>;
export type HotelInsert = InferInsertModel<typeof hotel>;
export type HotelSelect = Hotel;

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
  ],
);

export type Transport = InferSelectModel<typeof transport>;
export type TransportInsert = InferInsertModel<typeof transport>;
export type TransportSelect = Transport;
