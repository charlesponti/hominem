import { schema } from "@ponti/utils";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import assert from "node:assert";
import postgres from "postgres";

const DATABASE_URL =
	process.env.NODE_ENV === "test"
		? "postgres://postgres:postgres@localhost:4433/hominem-test"
		: process.env.DATABASE_URL;

assert(DATABASE_URL, "Missing DATABASE_URL");

const client = postgres(DATABASE_URL);

export const db: PostgresJsDatabase<typeof schema> = drizzle(client, {
	schema,
});

export const takeOne = <T>(values: T[]): T | undefined => {
	return values[0];
};

export const takeUniqueOrThrow = <T>(values: T[]): T => {
	if (values.length === 0) {
		throw new Error("No value found");
	}
	if (values.length > 1) {
		throw new Error("Found multiple values");
	}
	if (!values[0]) {
		throw new Error("Value is undefined");
	}
	return values[0];
};
