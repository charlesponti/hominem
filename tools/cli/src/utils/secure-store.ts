import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let keytar: typeof import('keytar') | null = null;
try {
  keytar = await import('keytar');
} catch (_err) {
  keytar = null;
}

const SERVICE = 'hominem-cli';
const ACCOUNT = `${os.userInfo().username}`;
const FALLBACK_FILE = path.join(os.homedir(), '.hominem', 'config.json');

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  provider?: 'better-auth';
  sessionId?: string;
  refreshFamilyId?: string;
  issuedAt?: string;
}

async function saveFallback(tokens: StoredTokens) {
  await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
  await fs.writeFile(FALLBACK_FILE, JSON.stringify(tokens, null, 2));
}

async function loadFallback(): Promise<StoredTokens | null> {
  try {
    const raw = await fs.readFile(FALLBACK_FILE, 'utf-8');
    return JSON.parse(raw) as StoredTokens;
  } catch (_err) {
    return null;
  }
}

export async function saveTokens(tokens: StoredTokens) {
  if (keytar) {
    await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
    return;
  }
  await saveFallback(tokens);
}

export async function loadTokens(): Promise<StoredTokens | null> {
  if (keytar) {
    const raw = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!raw) return loadFallback();
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch (_e) {
      return loadFallback();
    }
  }
  return loadFallback();
}

export async function clearTokens() {
  if (keytar) {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
  await fs.rm(FALLBACK_FILE, { force: true });
}
