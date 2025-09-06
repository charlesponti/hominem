import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContext } from "../lib/trpc/context";

// Mock the dependencies
vi.mock("../lib/supabase/server", () => ({
	createClient: vi.fn(),
}));

vi.mock("../lib/redis", () => ({
	cacheKeys: {
		token: vi.fn((token: string) => `token:${token}`),
	},
	cacheUtils: {
		get: vi.fn(),
		set: vi.fn(),
	},
}));

vi.mock("../db", () => ({
	db: {},
}));

describe("tRPC Context", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return context with db when no request is provided", async () => {
		const context = await createContext();

		expect(context).toEqual({
			db: expect.any(Object),
		});
		expect(context.user).toBeUndefined();
	});

	it("should return context with db when no authorization header is present", async () => {
		const mockRequest = new Request("http://localhost/api/trpc", {
			headers: {},
		});

		const context = await createContext(mockRequest);

		expect(context).toEqual({
			db: expect.any(Object),
		});
		expect(context.user).toBeUndefined();
	});

	it("should handle malformed authorization header", async () => {
		const mockRequest = new Request("http://localhost/api/trpc", {
			headers: {
				authorization: "InvalidToken",
			},
		});

		const context = await createContext(mockRequest);

		expect(context).toEqual({
			db: expect.any(Object),
		});
		expect(context.user).toBeUndefined();
	});

	it("should validate token and return user context when valid", async () => {
		const { createClient } = await import("../lib/supabase/server");
		const { cacheUtils } = await import("../lib/redis");

		// Mock successful token validation
		const mockSupabaseUser = {
			id: "supabase-user-id",
			email: "test@example.com",
			user_metadata: {
				name: "Test User",
				avatar_url: "https://example.com/avatar.jpg",
				isAdmin: true,
			},
		};

		// Mock cache miss
		vi.mocked(cacheUtils.get).mockResolvedValue(null);

		// Mock Supabase client
		vi.mocked(createClient).mockReturnValue({
			supabase: {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: mockSupabaseUser },
						error: null,
					}),
				},
			},
			headers: new Headers(),
		});

		const mockRequest = new Request("http://localhost/api/trpc", {
			headers: {
				authorization: "Bearer valid-token",
			},
		});

		const context = await createContext(mockRequest);

		expect(context).toEqual({
			db: expect.any(Object),
			user: {
				id: "supabase-user-id",
				email: "test@example.com",
				name: "Test User",
				avatar: "https://example.com/avatar.jpg",
				isAdmin: true,
				supabaseId: "supabase-user-id",
			},
		});

		// Verify cache was set
		expect(cacheUtils.set).toHaveBeenCalledWith(
			"token:valid-token",
			mockSupabaseUser,
			60,
		);
	});

	it("should use cached token when available", async () => {
		const { cacheUtils } = await import("../lib/redis");

		const mockSupabaseUser = {
			id: "supabase-user-id",
			email: "test@example.com",
			user_metadata: {
				name: "Test User",
			},
		};

		// Mock cache hit for token
		vi.mocked(cacheUtils.get).mockResolvedValue(mockSupabaseUser);

		const mockRequest = new Request("http://localhost/api/trpc", {
			headers: {
				authorization: "Bearer cached-token",
			},
		});

		const context = await createContext(mockRequest);

		expect(context.user).toBeDefined();
		expect(context.user?.id).toBe("supabase-user-id");
		expect(context.user?.email).toBe("test@example.com");
		expect(context.user?.name).toBe("Test User");

		// Verify Supabase client was not called (cache hit)
		const { createClient } = await import("../lib/supabase/server");
		expect(createClient).not.toHaveBeenCalled();
	});

	it("should handle user without metadata", async () => {
		const { createClient } = await import("../lib/supabase/server");
		const { cacheUtils } = await import("../lib/redis");

		// Mock user without metadata
		const mockSupabaseUser = {
			id: "supabase-user-id",
			email: "test@example.com",
			user_metadata: {},
		};

		// Mock cache miss
		vi.mocked(cacheUtils.get).mockResolvedValue(null);

		// Mock Supabase client
		vi.mocked(createClient).mockReturnValue({
			supabase: {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: mockSupabaseUser },
						error: null,
					}),
				},
			},
			headers: new Headers(),
		});

		const mockRequest = new Request("http://localhost/api/trpc", {
			headers: {
				authorization: "Bearer valid-token",
			},
		});

		const context = await createContext(mockRequest);

		expect(context.user).toEqual({
			id: "supabase-user-id",
			email: "test@example.com",
			name: undefined,
			avatar: undefined,
			isAdmin: false,
			supabaseId: "supabase-user-id",
		});
	});
});
