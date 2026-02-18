/**
 * Transformer utilities for converting JSON responses to proper TypeScript types
 * Handles date string conversions and nested object transformations
 */

type DateString = string;

/**
 * Type to recursively transform Date strings back to Date objects
 */
export type TransformDates<T> = T extends Date
  ? Date
  : T extends DateString
    ? Date | string
    : T extends Array<infer U>
      ? Array<TransformDates<U>>
      : T extends object
        ? { [K in keyof T]: TransformDates<T[K]> }
        : T;

/**
 * Checks if a string is an ISO date string
 * Only matches full ISO 8601 datetime strings with timezone
 */
function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  // Only match full ISO 8601 datetime format with timezone: YYYY-MM-DDTHH:mm:ss.sssZ
  // This avoids matching regular strings that happen to start with digits
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (!isoDateRegex.test(value)) return false;

  // Verify it's actually a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Recursively transforms date strings in an object to Date objects
 */
export function transformDates<T>(data: T): TransformDates<T> {
  if (data === null || data === undefined) {
    return data as TransformDates<T>;
  }

  if (isIsoDateString(data)) {
    return new Date(data as string) as TransformDates<T>;
  }

  if (Array.isArray(data)) {
    return data.map((item) => transformDates(item)) as TransformDates<T>;
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = transformDates(data[key]);
      }
    }
    return result as TransformDates<T>;
  }

  return data as TransformDates<T>;
}
