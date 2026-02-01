/**
 * Computed User Types
 *
 * This file contains all derived types computed from User schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from users.schema.ts
 */

import type {
  Account,
  AccountInsert,
  AccountSelect,
  User,
  UserInsert,
  UserSelect,
} from './users.schema';

export type { User, UserInsert, UserSelect, Account, AccountInsert, AccountSelect };

// Legacy aliases for backward compatibility
export type UserOutput = User;
export type UserInput = UserInsert;

export type AccountOutput = Account;
export type AccountInput = AccountInsert;
