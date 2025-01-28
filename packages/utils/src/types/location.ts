import {
	pgTable,
	text,
	integer,
	uuid,
	geometry,
	boolean,
} from "drizzle-orm/pg-core";
import { events } from "./calendar.ts";
import { users } from "./users.ts";
import { tags } from "./tagging.ts";

export const places = pgTable("places", {
	id: uuid("id").primaryKey().defaultRandom(),
	/**
	 * The Google Maps ID for this place.
	 */
	googleMapsId: text("google_maps_id").notNull(),
	/**
	 * The latitude and longitude of this place.
	 */
	location: geometry("location").notNull(),
	lat: integer("lat").notNull(),
	lng: integer("lng").notNull(),
	name: text("name").notNull(),
	/**
	 * The meal that this place is best for.
	 *
	 * For instance, if the user wants to visit this place for breakfast,
	 * this field will be set to `["breakfast"]`.
	 */
	bestFor: text("best_for"),
	/**
	 * The place's address.
	 */
	address: text("address"),
	isPublic: boolean("is_public").notNull().default(false),
	wifiInfo: text("wifi_info"),
});

const placeTags = pgTable("place_tags", {
	placeId: uuid("place_id").references(() => places.id),
	tagId: uuid("tag_id").references(() => tags.id),
});

export const placeVisits = pgTable("place_visits", {
	eventId: uuid("event_id").references(() => events.id),
	placeId: uuid("place_id").references(() => places.id),
	/**
	 * The meal that the user had at this place.
	 */
	notes: text("notes"),
	/**
	 * The rating that the user gave to this place.
	 */
	rating: integer("rating"),
	/**
	 * The review that the user wrote for this place.
	 */
	review: text("review"),
	/**
	 * List of user IDs of people who were with the user at this place.
	 */
	people: text("people"),

	userId: uuid("user_id").references(() => users.id),
});

interface WifiInfo {
	/**
	 * The WiFi network name.
	 */
	network: string;

	/**
	 * The WiFi password.
	 */
	password: string;
}

export const routeWaypoints = pgTable("route_waypoints", {
	routeId: uuid("route_id").references(() => transportationRoutes.id),
	latitude: integer("latitude").notNull(),
	longitude: integer("longitude").notNull(),
	elevation: integer("elevation"),
	timestamp: integer("timestamp"),
});

export const transportationRoutes = pgTable("transportation_routes", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	mode: text("mode").notNull(),
	startLocationId: uuid("start_location_id").notNull(),
	endLocationId: uuid("end_location_id").notNull(),
	/**
	 * The LineString geometry representing the route.
	 *
	 * @example
	 * `LINESTRING(0 0, 1 1, 2 2)`
	 */
	route: geometry("location").notNull(),
	duration: integer("duration").notNull(),
});
