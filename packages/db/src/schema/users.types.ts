/**
 * Computed User Types
 *
 * This file contains all derived types computed from User schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from users.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { account, users } from './users.schema'

// Inferred types from Drizzle schema
export type User = InferSelectModel<typeof users>
export type UserInsert = InferInsertModel<typeof users>
export type Account = InferSelectModel<typeof account>
export type AccountInsert = InferInsertModel<typeof account>

// Legacy aliases for backward compatibility
export type UserSelect = User
export type AccountSelect = Account

export type UserOutput = User
export type UserInput = UserInsert

export type AccountOutput = Account
export type AccountInput = AccountInsert

// Re-export tables for convenience
export {
  users,
  account,
} from './users.schema'
