import { describe, expect, it } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

interface SecureStoreModule {
  saveTokens: (tokens: {
    tokenVersion: 2;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    scopes?: string[];
    provider?: 'better-auth';
    sessionId?: string;
    refreshFamilyId?: string;
    issuedAt?: string;
    issuerBaseUrl: string;
  }) => Promise<void>;
  loadTokens: () => Promise<{
    tokenVersion: 2;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    scopes?: string[];
    provider?: 'better-auth';
    sessionId?: string;
    refreshFamilyId?: string;
    issuedAt?: string;
    issuerBaseUrl: string;
  } | null>;
  clearTokens: () => Promise<void>;
  SecureStoreError: {
    new (
      code:
        | 'SECURE_STORE_ENCRYPT_FAILED'
        | 'SECURE_STORE_DECRYPT_FAILED'
        | 'SECURE_STORE_MALFORMED',
      message: string,
    ): Error & {
      code:
        | 'SECURE_STORE_ENCRYPT_FAILED'
        | 'SECURE_STORE_DECRYPT_FAILED'
        | 'SECURE_STORE_MALFORMED';
    };
  };
}

async function importSecureStore(): Promise<SecureStoreModule> {
  const suffix = Date.now().toString();
  return (await import(`./secure-store.ts?test=${suffix}`)) as SecureStoreModule;
}

async function withSecureStoreEnv<T>(run: (homeDir: string) => Promise<T>): Promise<T> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hominem-secure-store-'));
  const homeDir = path.join(root, 'home');
  await fs.mkdir(homeDir, { recursive: true });

  const previousDisableKeytar = process.env.HOMINEM_DISABLE_KEYTAR;
  const previousSecret = process.env.HOMINEM_TOKEN_SECRET;
  const previousHome = process.env.HOMINEM_HOME;

  process.env.HOMINEM_DISABLE_KEYTAR = '1';
  process.env.HOMINEM_TOKEN_SECRET = 'secure-store-test-secret';
  process.env.HOMINEM_HOME = homeDir;

  try {
    return await run(homeDir);
  } finally {
    if (previousDisableKeytar === undefined) {
      delete process.env.HOMINEM_DISABLE_KEYTAR;
    } else {
      process.env.HOMINEM_DISABLE_KEYTAR = previousDisableKeytar;
    }
    if (previousSecret === undefined) {
      delete process.env.HOMINEM_TOKEN_SECRET;
    } else {
      process.env.HOMINEM_TOKEN_SECRET = previousSecret;
    }
    if (previousHome === undefined) {
      delete process.env.HOMINEM_HOME;
    } else {
      process.env.HOMINEM_HOME = previousHome;
    }
  }
}

describe('secure-store fallback encryption', () => {
  it('roundtrips encrypted fallback payload', async () => {
    await withSecureStoreEnv(async (homeDir) => {
      const store = await importSecureStore();
      await store.saveTokens({
        tokenVersion: 2,
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        issuerBaseUrl: 'http://localhost:3000',
      });

      const fallbackFile = path.join(homeDir, 'tokens.json');
      const raw = await fs.readFile(fallbackFile, 'utf-8');
      expect(raw.includes('access-token-value')).toBeFalse();
      expect(raw.includes('ciphertext')).toBeTrue();

      const loaded = await store.loadTokens();
      expect(loaded).toEqual({
        tokenVersion: 2,
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        issuerBaseUrl: 'http://localhost:3000',
      });

      await store.clearTokens();
      await expect(fs.access(fallbackFile)).rejects.toBeDefined();
    });
  });

  it('throws typed error for malformed encrypted payload', async () => {
    await withSecureStoreEnv(async (homeDir) => {
      const store = await importSecureStore();
      const fallbackFile = path.join(homeDir, 'tokens.json');
      await fs.writeFile(fallbackFile, '{"version":1,"salt":"x"}', 'utf-8');

      await expect(store.loadTokens()).rejects.toMatchObject({
        name: 'SecureStoreError',
        code: 'SECURE_STORE_MALFORMED',
      });
    });
  });
});
