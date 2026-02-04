import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  foreignKey,
  pgTable,
  primaryKey,
  text,
  uuid,
  boolean,
  uniqueIndex,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const list = pgTable(
  'list',
  {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: uuid('ownerId').notNull(),
    isPublic: boolean('isPublic').notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'list_ownerId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ListInsertSchema = createInsertSchema(list);
export const ListSelectSchema = createSelectSchema(list);
export type ListInsertSchemaType = z.infer<typeof ListInsertSchema>;
export type ListSelectSchemaType = z.infer<typeof ListSelectSchema>;
export type List = ListSelectSchemaType;
export type ListInsert = ListInsertSchemaType;
export type ListSelect = List;

export const userLists = pgTable(
  'user_lists',
  {
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    listId: uuid('listId').notNull(),
    userId: uuid('userId').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'user_lists_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_lists_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.listId, table.userId],
      name: 'user_lists_pkey',
    }),
  ],
);

export const UserListsInsertSchema = createInsertSchema(userLists);
export const UserListsSelectSchema = createSelectSchema(userLists);
export type UserListsInsertSchemaType = z.infer<typeof UserListsInsertSchema>;
export type UserListsSelectSchemaType = z.infer<typeof UserListsSelectSchema>;
export type UserLists = UserListsSelectSchemaType;
export type UserListsInsert = UserListsInsertSchemaType;
export type UserListsSelect = UserLists;

export const listInvite = pgTable(
  'list_invite',
  {
    isAccepted: boolean('accepted').default(false).notNull(),
    listId: uuid('listId').notNull(),
    invitedUserEmail: text('invitedUserEmail').notNull(),
    // Invites can be sent to users that are not registered, so the id can be null.
    invitedUserId: uuid('invitedUserId'),
    // The user who sent the invite.
    userId: uuid('userId').notNull(),
    acceptedAt: timestamp('acceptedAt', { precision: 3, mode: 'string' }),
    token: text('token')
      .default(sql`gen_random_uuid()`)
      .notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'list_invite_listId_list_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.invitedUserId],
      foreignColumns: [users.id],
      name: 'list_invite_invitedUserId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'list_invite_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.listId, table.invitedUserEmail],
      name: 'list_invite_pkey',
    }),
    uniqueIndex('list_invite_token_unique').on(table.token),
  ],
);
export const ListInviteInsertSchema = createInsertSchema(listInvite);
export const ListInviteSelectSchema = createSelectSchema(listInvite);
export type ListInviteInsertSchemaType = z.infer<typeof ListInviteInsertSchema>;
export type ListInviteSelectSchemaType = z.infer<typeof ListInviteSelectSchema>;
export type ListInvite = ListInviteSelectSchemaType;
export type ListInviteInsert = ListInviteInsertSchemaType;
export type ListInviteSelect = ListInvite;
