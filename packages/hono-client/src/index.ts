export { HonoClient } from './core/client';
export type { ClientConfig } from './core/client';
export type { HonoError, HonoResponse } from './core/types';
export { transformDates, type TransformDates } from './core/transformer';

// Type inference utilities - derive types directly from Hono app
export type { InferApiResponse, InferApiRequest, ApiTypes } from './types';

// Re-export types from hono-rpc for convenience
export type * from '@hominem/hono-rpc/types';
