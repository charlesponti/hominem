import {
	foreignKey,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { list } from "./lists.schema";
import { place } from "./places.schema";
import { users } from "./users.schema";

export const itemType = pgEnum("ItemType", ["FLIGHT", "PLACE"]);

export const item = pgTable(
	"item",
	{
		id: uuid("id").primaryKey().notNull(),
		type: text("type").notNull(),
		createdAt: timestamp("createdAt", { precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updatedAt", { precision: 3, mode: "string" })
			.defaultNow()
			.notNull(),
		itemId: uuid("itemId").notNull(),
		listId: uuid("listId").notNull(),
		userId: uuid("userId").notNull(),
		itemType: itemType("itemType").default("PLACE").notNull(),
	},
	(table) => [
		uniqueIndex("item_listId_itemId_key").using(
			"btree",
			table.listId.asc().nullsLast(),
			table.itemId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.listId],
			foreignColumns: [list.id],
			name: "item_listId_list_id_fk",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "item_userId_user_id_fk",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const itemRelations = relations(item, ({ one, many }) => ({
	list: one(list, {
		fields: [item.listId],
		references: [list.id],
	}),
	user: one(users, {
		fields: [item.userId],
		references: [users.id],
	}),
	places: many(place),
}));
