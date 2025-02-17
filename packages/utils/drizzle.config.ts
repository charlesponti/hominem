import dotenv from "dotenv/config";
import assert from "node:assert";

const DATABASE_URL = process.env.DATABASE_URL;

assert(DATABASE_URL, "Missing DATABASE_URL");

import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dbCredentials: {
		url: DATABASE_URL,
	},
	dialect: "postgresql",
	schema: "./src/db/schema/index.ts",
	out: "./src/db",
});
