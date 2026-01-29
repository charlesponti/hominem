/**
 * Computed User Types
 *
 * This file contains all derived types computed from User schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from users.schema.ts
 */

import type { User, UserInsert, Account, AccountInsert } from './users.schema';
import { account, users } from './users.schema';

export type UserOutput = User;
export type UserInput = UserInsert;

// Account types (co-located with User schema)
export type AccountOutput = Account;
export type AccountInput = AccountInsert;

// Legacy aliases
export type UserSelect = User;

export {
  users,
  account,
} from './users.schema';
