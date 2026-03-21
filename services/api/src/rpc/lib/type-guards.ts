import type { z } from 'zod';

/**
 * Type Guards for Schema Validation
 *
 * Runtime type guards that work in parallel with Zod schemas.
 * These are useful for:
 * - Discriminating between union types at runtime
 * - Validating data that's already been parsed
 * - Creating type-safe filter functions
 *
 * Each guard follows the pattern: `is<TypeName>(value: unknown): value is <Type>`
 */

/**
 * Create a type guard from a Zod schema
 *
 * Generates a type guard function that can be used with Array.filter()
 * and in conditional logic.
 *
 * @param schema - Zod schema to create guard from
 * @returns Type guard function
 *
 * @example
 * ```typescript
 * const isValidUser = createSchemaGuard(UserSchema);
 * const validUsers = unknownUsers.filter(isValidUser);
 * ```
 */
export function createSchemaGuard<T>(
  schema: z.ZodType<T>,
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    const result = schema.safeParse(value);
    return result.success;
  };
}

/**
 * Create a type discriminator for union types
 *
 * Checks if an object has a specific discriminator field with a specific value.
 *
 * @param discriminatorField - Field name to check
 * @param discriminatorValue - Expected value
 * @returns Type guard function
 *
 * @example
 * ```typescript
 * type Result = {
 *   success: true;
 *   data: User;
 * } | {
 *   success: false;
 *   error: string;
 * };
 *
 * const isSuccess = createDiscriminator('success', true);
 * if (isSuccess(result)) {
 *   console.log(result.data); // TypeScript knows this exists
 * }
 * ```
 */
export function createDiscriminator<T extends Record<string, unknown>, K extends keyof T>(
  discriminatorField: K,
  discriminatorValue: T[K],
): (value: unknown) => value is Extract<T, Record<K, T[K]>> {
  return (value: unknown): value is Extract<T, Record<K, T[K]>> => {
    const record = value as Record<string, unknown>

  return (
    typeof record === 'object' &&
    record !== null &&
    discriminatorField in record &&
    record[discriminatorField as keyof typeof record] === discriminatorValue
  );
};
}

/**
 * Create a property checker
 *
 * Checks if an object has all specified properties with correct types.
 *
 * @param requiredProps - Object mapping property names to type checkers
 * @returns Type guard function
 *
 * @example
 * ```typescript
 * const hasUserProps = createPropertyChecker({
 *   id: (v) => typeof v === 'string',
 *   name: (v) => typeof v === 'string',
 *   email: (v) => typeof v === 'string',
 * });
 *
 * if (hasUserProps(data)) {\n *   // data.id, data.name, and data.email are guaranteed to exist
 * }
 * ```
 */
export function createPropertyChecker<T extends Record<string, unknown>>(
  requiredProps: Record<keyof T, (value: unknown) => boolean>,
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>

    for (const [prop, checker] of Object.entries(requiredProps)) {
      if (!(prop in record) || !checker(record[prop])) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Is String Guard
 */
export const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Is Number Guard
 */
export const isNumber = (value: unknown): value is number => typeof value === 'number';

/**
 * Is Boolean Guard
 */
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * Is Array Guard
 */
export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Is Object Guard
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Is NonNull Guard
 *
 * Useful for filtering out null/undefined values
 *
 * @example
 * ```typescript
 * const values = [1, null, 2, undefined, 3];
 * const clean = values.filter(isNonNull);
 * // [1, 2, 3]
 * ```
 */
export const isNonNull = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Create an array element guard
 *
 * Checks if all elements in an array pass a guard function.
 *
 * @param elementGuard - Guard function for array elements
 * @returns Type guard for arrays
 *
 * @example\n * ```typescript
 * const isStringArray = createArrayGuard(isString);
 * if (isStringArray(value)) {\n *   // value is guaranteed to be string[]
 * }
 * ```
 */
export function createArrayGuard<T>(
  elementGuard: (value: unknown) => value is T,
): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(elementGuard);
  };
}
