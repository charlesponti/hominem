import type { JsonValue } from '@hominem/db/types';
import { isObject } from '@hominem/utils';

export function jsonArray<T>(value: JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function jsonObject<T extends object>(value: JsonValue | null | undefined): T | null {
  return isObject(value) ? (value as T) : null;
}
