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
} from './lists.schema';
import type { Item, ItemInsert } from './items.schema';

export type ListOutput = List;
export type ListInput = ListInsert;

export type ListInviteOutput = ListInvite;
export type ListInviteInput = ListInviteInsert;

export type ItemOutput = Item;
export type ItemInput = ItemInsert;
