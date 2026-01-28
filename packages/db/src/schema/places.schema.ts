import { relations } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
  foreignKey,
  geometry,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { item } from './items.schema'
import { tags } from './tags.schema'

export const place = pgTable(
  'place',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    address: text('address'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    itemId: uuid('itemId'),
    googleMapsId: text('google_maps_id').notNull().unique(),
    types: text('types').array(),
    imageUrl: text('imageUrl'),
    phoneNumber: text('phoneNumber'),
    rating: doublePrecision('rating'),
    websiteUri: text('websiteUri'),
    photos: text('photos').array(),
    priceLevel: integer('priceLevel'),

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

    /**
     * Google Places business status (e.g., OPERATIONAL, CLOSED_PERMANENTLY, CLOSED_TEMPORARILY)
     */
    businessStatus: text('business_status'),

    /**
     * Opening hours for the place, stored as JSON string (Google Places API format)
     */
    openingHours: text('opening_hours'),
  },
  (table) => [
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [item.id],
      name: 'place_itemId_item_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    // GIST index for spatial queries (getNearbyPlacesFromLists)
    index('place_location_gist_idx').using('gist', table.location),
    // Index for join performance
    index('place_itemId_idx').on(table.itemId),
    // Index for recent places queries
    index('place_updatedAt_idx').on(table.updatedAt),
  ]
)
export interface Place {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  itemId: string | null;
  googleMapsId: string;
  types: string[] | null;
  imageUrl: string | null;
  phoneNumber: string | null;
  rating: number | null;
  websiteUri: string | null;
  photos: string[] | null;
  priceLevel: number | null;
  location: [number, number];
  latitude: number | null;
  longitude: number | null;
  bestFor: string | null;
  isPublic: boolean;
  wifiInfo: string | null;
  businessStatus: string | null;
  openingHours: string | null;
}
export type PlaceSelect = Place;
export interface PlaceInsert {
  id?: string;
  name: string;
  description?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
  itemId?: string | null;
  googleMapsId: string;
  types?: string[] | null;
  imageUrl?: string | null;
  phoneNumber?: string | null;
  rating?: number | null;
  websiteUri?: string | null;
  photos?: string[] | null;
  priceLevel?: number | null;
  location: [number, number];
  latitude?: number | null;
  longitude?: number | null;
  bestFor?: string | null;
  isPublic?: boolean;
  wifiInfo?: string | null;
  businessStatus?: string | null;
  openingHours?: string | null;
}

export const placeRelations = relations(place, ({ one }) => ({
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
