/**
 * Computed Auth Types
 *
 * This file contains all derived types computed from the Auth schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from auth.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { verificationToken, token, session } from './auth.schema'

// Inferred types from Drizzle schema
export type VerificationToken = InferSelectModel<typeof verificationToken>
export type VerificationTokenInsert = InferInsertModel<typeof verificationToken>
export type Token = InferSelectModel<typeof token>
export type TokenInsert = InferInsertModel<typeof token>
export type Session = InferSelectModel<typeof session>
export type SessionInsert = InferInsertModel<typeof session>

// Legacy aliases for backward compatibility
export type VerificationTokenOutput = VerificationToken
export type VerificationTokenInput = VerificationTokenInsert

export type TokenOutput = Token
export type TokenInput = TokenInsert

export type SessionOutput = Session
export type SessionInput = SessionInsert

// Re-export tables for convenience
export {
  verificationToken,
  token,
  session,
  tokenType,
} from './auth.schema'
