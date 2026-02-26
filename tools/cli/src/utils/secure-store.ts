import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { getHominemHomeDir } from './paths';

let keytar: typeof import('keytar') | null = null;
if (process.env.HOMINEM_DISABLE_KEYTAR !== '1') {
  try {
    const keytarModuleName = ['key', 'tar'].join('');
    keytar = await import(keytarModuleName);
  } catch (_err) {
    keytar = null;
  }
}

const SERVICE = 'hominem-cli';
const ACCOUNT = `${os.userInfo().username}`;
const ENCRYPTION_VERSION = 1;

function getFallbackFile(): string {
  return path.join(getHominemHomeDir(), 'tokens.json');
}

export interface StoredTokens {
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
}

interface EncryptedTokenBlob {
  version: number;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

type ParsedValue = string | number | boolean | null | ParsedValue[] | { [key: string]: ParsedValue };

export class SecureStoreError extends Error {
  code: 'SECURE_STORE_ENCRYPT_FAILED' | 'SECURE_STORE_DECRYPT_FAILED' | 'SECURE_STORE_MALFORMED';

  constructor(code: 'SECURE_STORE_ENCRYPT_FAILED' | 'SECURE_STORE_DECRYPT_FAILED' | 'SECURE_STORE_MALFORMED', message: string) {
    super(message);
    this.name = 'SecureStoreError';
    this.code = code;
  }
}

function getKeyMaterial(): string {
  if (process.env.HOMINEM_TOKEN_SECRET) {
    return process.env.HOMINEM_TOKEN_SECRET;
  }
  return `${os.hostname()}:${os.userInfo().username}:${os.homedir()}:hominem-cli`;
}

function deriveKey(salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(getKeyMaterial(), salt, 32, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });
}

async function encryptTokens(tokens: StoredTokens): Promise<EncryptedTokenBlob> {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await deriveKey(salt);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(tokens), 'utf-8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      version: ENCRYPTION_VERSION,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: encrypted.toString('base64')
    };
  } catch (error) {
    throw new SecureStoreError(
      'SECURE_STORE_ENCRYPT_FAILED',
      error instanceof Error ? error.message : 'Failed to encrypt token payload'
    );
  }
}

function isStoredTokensLike(input: ParsedValue): input is Omit<StoredTokens, 'tokenVersion'> & Partial<Pick<StoredTokens, 'tokenVersion'>> {
  if (!input || typeof input !== 'object') {
    return false;
  }
  const value = input as Record<string, ParsedValue>;
  if (typeof value.accessToken !== 'string') {
    return false;
  }
  return typeof value.issuerBaseUrl === 'string' || typeof value.issuerBaseUrl === 'undefined';
}

function normalizeStoredTokens(input: Omit<StoredTokens, 'tokenVersion'> & Partial<Pick<StoredTokens, 'tokenVersion'>>): StoredTokens {
  return {
    tokenVersion: 2,
    accessToken: input.accessToken,
    ...(input.refreshToken ? { refreshToken: input.refreshToken } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.scopes ? { scopes: input.scopes } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.refreshFamilyId ? { refreshFamilyId: input.refreshFamilyId } : {}),
    ...(input.issuedAt ? { issuedAt: input.issuedAt } : {}),
    issuerBaseUrl: input.issuerBaseUrl ?? 'http://localhost:3000'
  };
}

async function decryptTokens(blob: EncryptedTokenBlob): Promise<StoredTokens> {
  try {
    const salt = Buffer.from(blob.salt, 'base64');
    const iv = Buffer.from(blob.iv, 'base64');
    const tag = Buffer.from(blob.tag, 'base64');
    const ciphertext = Buffer.from(blob.ciphertext, 'base64');
    const key = await deriveKey(salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf-8')) as ParsedValue;
    if (!isStoredTokensLike(parsed)) {
      throw new SecureStoreError('SECURE_STORE_MALFORMED', 'Decrypted token payload was malformed');
    }
    return normalizeStoredTokens(parsed);
  } catch (error) {
    if (error instanceof SecureStoreError) {
      throw error;
    }
    throw new SecureStoreError(
      'SECURE_STORE_DECRYPT_FAILED',
      error instanceof Error ? error.message : 'Failed to decrypt token payload'
    );
  }
}

async function saveFallback(tokens: StoredTokens) {
  const fallbackFile = getFallbackFile();
  await fs.mkdir(path.dirname(fallbackFile), { recursive: true });
  const payload = await encryptTokens(tokens);
  await fs.writeFile(fallbackFile, JSON.stringify(payload), { mode: 0o600 });
  await fs.chmod(fallbackFile, 0o600);
}

async function loadFallback(): Promise<StoredTokens | null> {
  const fallbackFile = getFallbackFile();
  try {
    const raw = await fs.readFile(fallbackFile, 'utf-8');
    const parsed = JSON.parse(raw) as ParsedValue;

    if (isStoredTokensLike(parsed)) {
      const normalized = normalizeStoredTokens(parsed);
      await saveFallback(normalized);
      return normalized;
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new SecureStoreError('SECURE_STORE_MALFORMED', 'Encrypted token file payload was invalid');
    }
    const blob = parsed as Partial<EncryptedTokenBlob>;
    if (
      typeof blob.version !== 'number' ||
      typeof blob.salt !== 'string' ||
      typeof blob.iv !== 'string' ||
      typeof blob.tag !== 'string' ||
      typeof blob.ciphertext !== 'string'
    ) {
      throw new SecureStoreError('SECURE_STORE_MALFORMED', 'Encrypted token file payload was invalid');
    }

    return await decryptTokens({
      version: blob.version,
      salt: blob.salt,
      iv: blob.iv,
      tag: blob.tag,
      ciphertext: blob.ciphertext
    });
  } catch (_err) {
    if (_err instanceof SecureStoreError) {
      throw _err;
    }
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
      const parsed = JSON.parse(raw) as ParsedValue;
      if (!isStoredTokensLike(parsed)) {
        return loadFallback();
      }
      return normalizeStoredTokens(parsed);
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
