/**
 * Explicit Type Contracts for People API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

/**
 * Utility type to convert Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 */
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

export interface Person {
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// People List
// ============================================================================

export type PeopleListOutput = Person[];

// ============================================================================
// People Create
// ============================================================================

export interface PeopleCreateInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export type PeopleCreateOutput = Person;
