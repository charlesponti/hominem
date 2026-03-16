import { Command } from '@oclif/core';
import { z } from 'zod';

import { getStoredTokens, hasValidStoredSession } from '@/utils/auth';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  tokenStored: z.boolean(),
  authenticated: z.boolean(),
  tokenVersion: z.number().nullable(),
  provider: z.string().nullable(),
  issuerBaseUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
  ttlSeconds: z.number().nullable(),
  scopes: z.array(z.string()),
});

export default class AuthStatus extends Command {
  static description = 'Reports whether CLI tokens are available and their TTL state.';
  static summary = 'Show authentication status';

  static override flags = {};
  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const tokens = await getStoredTokens();
    const tokenStored = Boolean(tokens?.accessToken);
    const authenticated = tokens?.issuerBaseUrl
      ? await hasValidStoredSession(tokens.issuerBaseUrl)
      : false;
    const expiresAtMs = tokens?.expiresAt ? new Date(tokens.expiresAt).getTime() : null;
    const ttlSeconds =
      expiresAtMs === null ? null : Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    const output = {
      tokenStored,
      authenticated,
      tokenVersion: tokens?.tokenVersion ?? null,
      provider: tokens?.provider ?? null,
      issuerBaseUrl: tokens?.issuerBaseUrl ?? null,
      expiresAt: tokens?.expiresAt ?? null,
      ttlSeconds,
      scopes: tokens?.scopes ?? [],
    };

    return validateWithZod(outputSchema, output);
  }
}

