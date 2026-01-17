import type { Queue } from 'bullmq';
import type { Hono } from 'hono';
import type { AppEnv } from '../src/server.js';
/**
 * Global mock instances for reuse across tests
 */
export declare const globalMocks: {
    queue: Partial<Queue>;
    rateLimit: import("vitest").Mock<(_c: any, next: any) => any>;
    rateLimitImport: import("vitest").Mock<(_c: any, next: any) => any>;
};
/**
 * Creates a test server instance with common setup
 */
export declare const createTestServer: (_options?: {
    logger?: boolean;
}) => Promise<Hono<AppEnv, import("hono/types").BlankSchema, "/">>;
/**
 * Common test lifecycle hooks for API route tests
 */
export declare const useApiTestLifecycle: () => {
    getServer: () => Hono<AppEnv, import("hono/types").BlankSchema, "/">;
};
/**
 * Common response type for API tests
 */
export interface ApiResponse {
    success?: boolean;
    message?: string;
    error?: string;
    details?: unknown;
    [key: string]: unknown;
}
/**
 * Helper for making authenticated requests
 */
export declare const makeAuthenticatedRequest: (server: Hono<AppEnv>, options: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    payload?: Record<string, unknown>;
    headers?: Record<string, string | null>;
}) => Promise<Response>;
/**
 * Helper to assert success response
 */
export declare const assertSuccessResponse: (response: Response) => Promise<any>;
/**
 * Helper to assert error response
 */
export declare const assertErrorResponse: (response: Response, expectedStatus?: number) => Promise<any>;
//# sourceMappingURL=api-test-utils.d.ts.map