import type { AppType } from '@hominem/hono-rpc';

export type HonoClient = {
  api: AppType;
};
export type HonoApi = HonoClient['api'];
