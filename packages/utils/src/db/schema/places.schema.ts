import { relations } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
  foreignKey,
  geometry,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { item } from './items.schema'
import { tags } from './tags.schema'
import { users } from './users.schema'

export const place = pgTable(
  'place',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    address: text('address'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    userId: uuid('userId').notNull(),
    itemId: uuid('itemId'),
    /**
     * The Google Maps ID for this place.
     */
    googleMapsId: text('google_maps_id').notNull(),
    types: text('types').array(),
    imageUrl: text('imageUrl'),
    phoneNumber: text('phoneNumber'),
    rating: doublePrecision('rating'),
    websiteUri: text('websiteUri'),

    /**
     * The latitude and longitude of this place.
     */
    location: geometry('location', {
      mode: 'tuple',
      srid: 4326,
      type: 'point',
    }).notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),

    /**
     * The meal that this place is best for.
     *
     * For instance, if the user wants to visit this place for breakfast,
     * this field will be set to `["breakfast"]`.
     */
    bestFor: text('best_for'),

    /**
     * Users can save locations that are private and not shared with others.
     */
    isPublic: boolean('is_public').notNull().default(false),
    wifiInfo: text('wifi_info'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'place_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [item.id],
      name: 'place_itemId_item_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
export type Place = typeof place.$inferSelect
export type PlaceInsert = typeof place.$inferInsert

export const placeRelations = relations(place, ({ one }) => ({
  user: one(users, {
    fields: [place.userId],
    references: [users.id],
  }),
  item: one(item, {
    fields: [place.itemId],
    references: [item.id],
  }),
}))

export const placeTags = pgTable('place_tags', {
  placeId: uuid('place_id').references(() => place.id),
  tagId: uuid('tag_id').references(() => tags.id),
})

export interface WifiInfo {
  /**
   * The WiFi network name.
   */
  network: string

  /**
   * The WiFi password.
   */
  password: string
}

export const routeWaypoints = pgTable('route_waypoints', {
  routeId: uuid('route_id').references(() => transportationRoutes.id),
  latitude: integer('latitude').notNull(),
  longitude: integer('longitude').notNull(),
  elevation: integer('elevation'),
  timestamp: integer('timestamp'),
})

export const transportationRoutes = pgTable('transportation_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  mode: text('mode').notNull(),
  startLocationId: uuid('start_location_id').notNull(),
  endLocationId: uuid('end_location_id').notNull(),
  /**
   * The LineString geometry representing the route.
   *
   * @example
   * `LINESTRING(0 0, 1 1, 2 2)`
   */
  route: geometry('location', {
    mode: 'tuple',
    srid: 4326,
    type: 'linestring',
  }).notNull(),
  duration: integer('duration').notNull(),
  /**
   * The estimated distance of the route in kilometers.
   */
  estimatedDistance: integer('estimated_distance').notNull(),
  /**
   * The estimated time to complete the route in minutes.
   */
  estimatedTime: integer('estimated_time').notNull(),
})
