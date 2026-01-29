/**
 * Computed User Types
 *
 * This file contains all derived types computed from User schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from users.schema.ts
 */

import type { User, UserInsert } from './users.schema';

export type UserOutput = User;
export type UserInput = UserInsert;
