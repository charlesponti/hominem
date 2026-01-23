/**
 * Normalizes a value by converting null to undefined.
 * Useful for bridging database/API boundaries where nulls are common
 * with React components that prefer optional (undefined) props.
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Ensures a value is defined, throwing an error if it is null or undefined.
 * Useful for asserting that required data has been loaded.
 */
export function ensureDefined<T>(
  value: T | null | undefined,
  message = 'Value is required but was not defined',
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Normalizes an object by converting all its top-level null values to undefined.
 */
export function normalizeObject<T extends object>(
  obj: T,
): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result = { ...obj } as any;
  for (const key in result) {
    if (result[key] === null) {
      result[key] = undefined;
    }
  }
  return result;
}

/**
 * Removes undefined keys from an object.
 * Useful before sending payloads to APIs that might interpret
 * undefined keys differently than their absence.
 */
export function compactObject<T extends object>(obj: T): Partial<T> {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key as keyof T] === undefined) {
      delete result[key as keyof T];
    }
  });
  return result;
}
