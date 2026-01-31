/**
 * Computed List Types
 *
 * This file contains all derived types computed from List schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from lists.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { list, userLists, listInvite } from './lists.schema'

// Inferred types from Drizzle schema
export type List = InferSelectModel<typeof list>
export type ListInsert = InferInsertModel<typeof list>

export type UserLists = InferSelectModel<typeof userLists>
export type UserListsInsert = InferInsertModel<typeof userLists>

export type ListInvite = InferSelectModel<typeof listInvite>
export type ListInviteInsert = InferInsertModel<typeof listInvite>

// Legacy aliases for backward compatibility
export type ListOutput = List
export type ListSelect = List
export type ListInput = ListInsert

export type UserListsOutput = UserLists
export type UserListsInput = UserListsInsert

export type ListInviteOutput = ListInvite
export type ListInviteSelect = ListInvite
export type ListInviteInput = ListInviteInsert

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
} from './lists.schema'
