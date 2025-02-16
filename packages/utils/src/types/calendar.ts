import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { transactions } from "../finance";
import { people } from "./people";
import { tags } from "./tagging";

// Enums
export const eventTypeEnum = pgEnum("event_type", [
	"Transactions",
	"Events",
	"Birthdays",
	"Anniversaries",
	"Dates",
	"Messages",
	"Photos",
	"Relationship Start",
	"Relationship End",
	"Sex",
	"Movies",
	"Reading",
]);

// Tables
export const places = pgTable("places", {
	id: uuid("id").primaryKey(),
	name: text("name").notNull(),
	address: text("address"),
	// Add other place fields as needed
});

export const events = pgTable("events", {
	id: uuid("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	date: timestamp("date").notNull(),
	placeId: uuid("place_id").references(() => places.id),
	dateStart: timestamp("date_start"),
	dateEnd: timestamp("date_end"),
	dateTime: timestamp("date_time"),
	type: eventTypeEnum("type").notNull(),
});
export type CalendarEvent = typeof events.$inferSelect;
export type CalendarEventInsert = typeof events.$inferInsert;

export const eventsTags = pgTable("events_tags", {
	eventId: uuid("event_id").references(() => events.id),
	tagId: uuid("tag_id").references(() => tags.id),
});

export const eventsPeople = pgTable("events_people", {
	eventId: uuid("event_id").references(() => events.id),
	personId: uuid("person_id").references(() => people.id),
});

export const eventsTransactions = pgTable("events_transactions", {
	eventId: uuid("event_id").references(() => events.id),
	transactionId: uuid("transaction_id").references(() => transactions.id),
});

// Relations
export const eventsRelations = relations(events, ({ many, one }) => ({
	place: one(places, {
		fields: [events.placeId],
		references: [places.id],
	}),
	tags: many(eventsTags),
	people: many(eventsPeople),
	transactions: many(eventsTransactions),
}));

export const eventsTagsRelations = relations(eventsTags, ({ one }) => ({
	event: one(events, {
		fields: [eventsTags.eventId],
		references: [events.id],
	}),
	tag: one(tags, {
		fields: [eventsTags.tagId],
		references: [tags.id],
	}),
}));
