/**
 * Computed List Types
 *
 * This file contains all derived types computed from List schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from lists.schema.ts
 */

import type {
  List,
  ListInsert,
  ListInvite,
  ListInviteInsert,
  UserLists,
  UserListsInsert,
} from './lists.schema';

export type ListOutput = List;
export type ListSelect = List;
export type ListInput = ListInsert;

export type ListInviteOutput = ListInvite;
export type ListInviteSelect = ListInvite;
export type ListInviteInput = ListInviteInsert;

export type UserListsOutput = UserLists;
export type UserListsInput = UserListsInsert;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  list,
  listRelations,
  userLists,
  userListsRelations,
  listInvite,
  listInviteRelations,
} from './lists.schema';
