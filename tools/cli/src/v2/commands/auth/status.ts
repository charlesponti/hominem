import { z } from 'zod';

import { getStoredTokens } from '@/utils/auth';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'auth status',
  summary: 'Show authentication status',
  description: 'Reports whether CLI tokens are available and their TTL state.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    authenticated: z.boolean(),
    tokenVersion: z.number().nullable(),
    provider: z.string().nullable(),
    issuerBaseUrl: z.string().nullable(),
    expiresAt: z.string().nullable(),
    ttlSeconds: z.number().nullable(),
    scopes: z.array(z.string()),
  }),
  async run() {
    const tokens = await getStoredTokens();
    const expiresAtMs = tokens?.expiresAt ? new Date(tokens.expiresAt).getTime() : null;
    const ttlSeconds =
      expiresAtMs === null ? null : Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    return {
      authenticated: Boolean(tokens?.accessToken),
      tokenVersion: tokens?.tokenVersion ?? null,
      provider: tokens?.provider ?? null,
      issuerBaseUrl: tokens?.issuerBaseUrl ?? null,
      expiresAt: tokens?.expiresAt ?? null,
      ttlSeconds,
      scopes: tokens?.scopes ?? [],
    };
  },
});
