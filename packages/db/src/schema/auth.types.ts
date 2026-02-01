/**
 * Computed Auth Types
 *
 * This file contains all derived types computed from the Auth schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from auth.schema.ts
 */

import type {
  Session,
  SessionInsert,
  Token,
  TokenInsert,
  VerificationToken,
  VerificationTokenInsert,
} from './auth.schema';

export type {
  VerificationToken,
  VerificationTokenInsert,
  Token,
  TokenInsert,
  Session,
  SessionInsert,
};
