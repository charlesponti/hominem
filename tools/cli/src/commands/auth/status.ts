import { z } from 'zod';

import { getStoredTokens, hasValidStoredSession } from '@/utils/auth';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'auth status',
  summary: 'Show authentication status',
  description: 'Reports whether CLI tokens are available and their TTL state.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    tokenStored: z.boolean(),
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
    const tokenStored = Boolean(tokens?.accessToken);
    const authenticated = tokens?.issuerBaseUrl
      ? await hasValidStoredSession(tokens.issuerBaseUrl)
      : false;
    const expiresAtMs = tokens?.expiresAt ? new Date(tokens.expiresAt).getTime() : null;
    const ttlSeconds =
      expiresAtMs === null ? null : Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    return {
      tokenStored,
      authenticated,
      tokenVersion: tokens?.tokenVersion ?? null,
      provider: tokens?.provider ?? null,
      issuerBaseUrl: tokens?.issuerBaseUrl ?? null,
      expiresAt: tokens?.expiresAt ?? null,
      ttlSeconds,
      scopes: tokens?.scopes ?? [],
    };
  },
});
