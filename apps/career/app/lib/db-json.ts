import type { JsonValue } from '@hominem/db/types';

export function jsonArray<T>(value: JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
