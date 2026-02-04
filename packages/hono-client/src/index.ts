export { createHonoClient } from './core/client';
export type { ClientConfig, CreateClient, HonoClient } from './core/client';
// HonoClientInstance is re-exported from hono-rpc/client to avoid type depth limits
export type { HonoClientType as HonoClientInstance } from '@hominem/hono-rpc/client';
// export type { HonoError, HonoResponse } from './core/types';
export { transformDates, type TransformDates } from './core/transformer';
