import { db } from "@ponti/utils/db";
import { token, users } from "@ponti/utils/schema";
import { add } from "date-fns";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createServer } from "../../../server";
import { userService } from "../../../services/user.service";

describe("authenticatePlugin", () => {
	let server: FastifyInstance;

	beforeAll(async () => {
		// Ensure database connection is established
		await db.execute(sql`SELECT 1`);
		vi.spyOn(userService, "createOrUpdateUser");
	});

	afterAll(async () => {
		// Close database connection
		await db.delete(token);
		await db.delete(users);
	});

	beforeEach(async () => {
		// Clear database tables
		await db.delete(token);
		await db.delete(users);

		const testServer = await createServer({ logger: false });
		if (!testServer) throw new Error("Server is null");
		server = testServer;
		await server.ready();
	});

	it("should authenticate a user with valid token", async () => {
		// Create test user and token
		const [testUser] = await db
			.insert(users)
			.values({
				id: crypto.randomUUID(),
				email: "test@example.com",
				isAdmin: false,
				name: null,
			})
			.returning();

		await db.insert(token).values({
			id: Math.floor(Math.random() * 1000000),
			userId: testUser.id,
			emailToken: "valid_token",
			type: "EMAIL",
			expiration: add(new Date(), { hours: 1 }).toISOString(),
		});

		vi.mocked(userService.createOrUpdateUser).mockResolvedValue(testUser);

		const response = await server.inject({
			method: "POST",
			url: "/authenticate",
			payload: {
				email: "test@example.com",
				emailToken: "valid_token",
			},
		});

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.payload)).toEqual({
			user: {
				isAdmin: false,
				roles: ["user"],
				userId: testUser.id,
				name: null,
			},
		});
	});

	it("should return 401 for non-existent token", async () => {
		const response = await server.inject({
			method: "POST",
			url: "/authenticate",
			payload: {
				email: "test@example.com",
				emailToken: "invalid_token",
			},
		});

		expect(response.statusCode).toBe(401);
		expect(JSON.parse(response.payload)).toEqual({
			error: "Invalid or expired token",
		});
	});

	it("should return 401 for expired token", async () => {
		const [testUser] = await db
			.insert(users)
			.values({
				id: crypto.randomUUID(),
				email: "test@example.com",
				isAdmin: false,
				name: null,
			})
			.returning();

		await db.insert(token).values({
			id: Math.floor(Math.random() * 1000000),
			type: "EMAIL",
			userId: testUser.id,
			emailToken: "expired_token",
			expiration: add(new Date(), { hours: -1 }).toISOString(),
		});

		const response = await server.inject({
			method: "POST",
			url: "/authenticate",
			payload: {
				email: "test@example.com",
				emailToken: "expired_token",
			},
		});

		expect(response.statusCode).toBe(401);
		expect(JSON.parse(response.payload)).toEqual({
			error: "Invalid or expired token",
		});
	});

	it("should return 400 for invalid input data", async () => {
		const response = await server.inject({
			method: "POST",
			url: "/authenticate",
			payload: {
				email: "invalid-email",
				emailToken: "",
			},
		});

		expect(response.statusCode).toBe(400);
		expect(JSON.parse(response.payload)).toEqual({
			error: "Invalid input data",
		});
	});
});
