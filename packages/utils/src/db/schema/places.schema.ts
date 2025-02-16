import { relations } from "drizzle-orm";
import {
	doublePrecision,
	foreignKey,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { item } from "./items.schema";
import { users } from "./users.schema";

export const place = pgTable(
	"place",
	{
		id: uuid("id").primaryKey().notNull(),
		name: text("name").notNull(),
		description: text("description"),
		address: text("address"),
		createdAt: timestamp("createdAt", { precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updatedAt", { precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		userId: uuid("userId").notNull(),
		itemId: uuid("itemId"),
		googleMapsId: text("googleMapsId"),
		types: text("types").array(),
		imageUrl: text("imageUrl"),
		phoneNumber: text("phoneNumber"),
		rating: doublePrecision("rating"),
		websiteUri: text("websiteUri"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "place_userId_user_id_fk",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.itemId],
			foreignColumns: [item.id],
			name: "place_itemId_item_id_fk",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const placeRelations = relations(place, ({ one }) => ({
	user: one(users, {
		fields: [place.userId],
		references: [users.id],
	}),
	item: one(item, {
		fields: [place.itemId],
		references: [item.id],
	}),
}));
