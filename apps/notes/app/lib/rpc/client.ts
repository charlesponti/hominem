import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Hono RPC client for the notes app
 * Provides type-safe access to the API endpoints
 */
const apiBaseUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';
const client = createHonoClient(apiBaseUrl);

export const honoClient = client;

// Export types from the client
export type APIClient = typeof client;
