import type { AppType } from '@hominem/hono-rpc';
import { hc } from 'hono/client';

/**
 * Hono RPC client for the notes app
 * Provides type-safe access to the API endpoints
 */
const client = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:4040');

export const honoClient = client;
export const trpc = client; // Backwards compatibility alias

// Export types from the client
export type APIClient = typeof client;
