import { db } from "@ponti/utils";
import { token, users } from "@ponti/utils/schema";
import { add } from "date-fns";
import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "../../../server";
import { userService } from "../../../services/user.service";

describe("authenticatePlugin", () => {
	let server: FastifyInstance;

	beforeEach(async () => {
		const testServer = await createServer({ logger: false });
		if (!testServer) throw new Error("Server is null");
		server = testServer;
		await server.ready();

		// Clear database tables
		// try {
		// 	await db.delete(token);
		// 	await db.delete(users);
		// } catch (error) {
		// 	console.error(error);
		// 	throw error;
		// }
	});

	it("should authenticate a user with valid token", async () => {
		// Create test user and token
		const [testUser] = await db
			.insert(users)
			.values({
				id: "test_user_id",
				email: "test@example.com",
				isAdmin: false,
				name: null,
			})
			.returning();

		await db.insert(token).values({
			id: crypto.getRandomValues(new Uint32Array(1))[0],
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
				userId: "user_id",
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
				id: "test_user_id",
				email: "test@example.com",
				isAdmin: false,
				name: null,
			})
			.returning();

		await db.insert(token).values({
			id: crypto.getRandomValues(new Uint32Array(1))[0],
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
