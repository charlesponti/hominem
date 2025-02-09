import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "./server";

describe("server", () => {
	let testServer: FastifyInstance;

	beforeAll(async () => {
		const server = await createServer({ logger: false });
		if (!server) {
			throw new Error("Server is null");
		}
		testServer = server;
		await testServer.ready();
	});

	afterAll(async () => {
		if (!testServer) {
			return;
		}

		await testServer.close();
	});

	test("status endpoint returns 200", async () => {
		const response = await testServer.inject({
			method: "GET",
			url: "/status",
		});
		expect(JSON.parse(response.body)).toEqual({ up: true });
		expect(response.statusCode).toBe(200);
	});
});
