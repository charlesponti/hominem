import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Hono RPC client for the notes app
 * Provides type-safe access to the API endpoints
 */
const client = createHonoClient(import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040');

export const honoClient = client;

// Export types from the client
export type APIClient = typeof client;
