export type StorageErrorCode =
  | 'storage.config.missing'
  | 'storage.credentials.invalid'
  | 'storage.bucket.access_denied'
  | 'storage.bucket.missing'
  | 'storage.network.unreachable'
  | 'storage.bucket.access_unknown';

export const STORAGE_ERROR_CODES: readonly StorageErrorCode[] = [
  'storage.config.missing',
  'storage.credentials.invalid',
  'storage.bucket.access_denied',
  'storage.bucket.missing',
  'storage.network.unreachable',
  'storage.bucket.access_unknown',
];

const STORAGE_ERROR_CODE_SET: ReadonlySet<string> = new Set(STORAGE_ERROR_CODES);

export class StorageServiceError extends Error {
  public readonly code: StorageErrorCode;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(code: StorageErrorCode, details?: Record<string, unknown>) {
    super(code);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, StorageServiceError.prototype);
    this.name = 'StorageServiceError';
  }
}

export function isStorageServiceError(value: unknown): value is StorageServiceError {
  if (value instanceof StorageServiceError) {
    return true;
  }

  if (!isObject(value)) {
    return false;
  }

  const code = Reflect.get(value, 'code');
  const message = Reflect.get(value, 'message');

  return (
    typeof code === 'string' && STORAGE_ERROR_CODE_SET.has(code) && typeof message === 'string'
  );
}
import { isObject } from '@hominem/utils';
