import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getHominemHomeDir } from './paths';

let keytar: typeof import('keytar') | null = null;
try {
  keytar = await import('keytar');
} catch (_err) {
  keytar = null;
}

const SERVICE = 'hominem-cli';
const ACCOUNT = `${os.userInfo().username}`;

function getFallbackFile(): string {
  return path.join(getHominemHomeDir(), 'tokens.json');
}

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
  const fallbackFile = getFallbackFile();
  await fs.mkdir(path.dirname(fallbackFile), { recursive: true });
  await fs.writeFile(fallbackFile, JSON.stringify(tokens, null, 2));
}

async function loadFallback(): Promise<StoredTokens | null> {
  const fallbackFile = getFallbackFile();
  try {
    const raw = await fs.readFile(fallbackFile, 'utf-8');
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
  const fallbackFile = getFallbackFile();
  if (keytar) {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
  await fs.rm(fallbackFile, { force: true });
}
