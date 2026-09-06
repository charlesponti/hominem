import type { JsonValue } from '@hominem/db/types';

export function jsonArray<T>(value: JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function jsonObject<T extends object>(value: JsonValue | null | undefined): T | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null;
}
