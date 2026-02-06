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
/**
 * @deprecated Use {@link User} instead. This alias will be removed in a future version.
 */
export type UserOutput = User;

/**
 * @deprecated Use {@link UserInsert} instead. This alias will be removed in a future version.
 */
export type UserInput = UserInsert;

/**
 * @deprecated Use {@link Account} instead. This alias will be removed in a future version.
 */
export type AccountOutput = Account;

/**
 * @deprecated Use {@link AccountInsert} instead. This alias will be removed in a future version.
 */
export type AccountInput = AccountInsert;
