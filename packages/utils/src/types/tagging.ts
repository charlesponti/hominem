import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const tags = pgTable("tags", {
	id: uuid("id").primaryKey(),
	name: text("name").notNull(),
	userId: uuid("user_id").references(() => users.id),
});
