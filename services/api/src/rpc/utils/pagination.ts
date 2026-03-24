/**
 * Cursor pagination utilities for RPC handlers
 */

export interface CursorPaginationParams {
  limit: number;
  cursor: string | undefined;
}

/**
 * Decode a cursor string
 * @returns Decoded cursor or null if invalid
 */
export function decodeCursor(cursorValue: string | undefined): string | null {
  if (!cursorValue) return null;
  try {
    return Buffer.from(cursorValue, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Encode a cursor string
 */
export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64');
}

/**
 * Normalize pagination parameters with defaults
 */
export function normalizePaginationParams(params?: {
  limit?: number;
  cursor?: string;
}): CursorPaginationParams {
  return {
    limit: Math.min(params?.limit ?? 50, 100), // Max 100, default 50
    cursor: params?.cursor,
  };
}
