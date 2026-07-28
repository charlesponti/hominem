import type { InferResponseType } from 'hono/client';

import type { HonoClient } from '../core/api-client';

type _InboxEndpoint = HonoClient['api']['inbox']['$get'];
export type InboxOutput = InferResponseType<_InboxEndpoint, 200>;
export type InboxStreamItem = InboxOutput['items'][number];
