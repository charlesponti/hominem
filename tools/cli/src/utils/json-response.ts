import type { JsonValue } from '@/contracts';

export function getResponseArray(payload: JsonValue, key: string): JsonValue[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload !== null && typeof payload === 'object' && key in payload) {
    const value = (payload as Record<string, JsonValue>)[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return null;
}
