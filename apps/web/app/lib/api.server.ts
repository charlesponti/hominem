import { createServerHonoClient as createClient } from '@hominem/rpc/ssr';

import { serverEnv } from '~/lib/env';

export function createServerHonoClient(accessToken?: string, request?: Request) {
  return createClient(serverEnv.VITE_PUBLIC_API_URL, accessToken, request);
}
