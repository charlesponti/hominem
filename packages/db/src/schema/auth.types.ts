/**
 * Computed Auth Types
 *
 * This file contains all derived types computed from the Auth schema.
 */

import type {
  VerificationToken,
  VerificationTokenInsert,
  Token,
  TokenInsert,
  Session,
  SessionInsert,
} from './auth.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Verification Token as retrieved from database */
export type VerificationTokenOutput = VerificationToken;
export type VerificationTokenInput = VerificationTokenInsert;

/** Auth Token as retrieved from database */
export type TokenOutput = Token;
export type TokenInput = TokenInsert;

/** Session as retrieved from database */
export type SessionOutput = Session;
export type SessionInput = SessionInsert;

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export { verificationToken, token, session, tokenType } from './auth.schema';
