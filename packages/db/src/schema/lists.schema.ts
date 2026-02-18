import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  uuid,
  boolean,
  uniqueIndex,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

import { users } from './users.schema';

export const list = pgTable(
  'list',
  {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: uuid('ownerId').notNull(),
    isPublic: boolean('isPublic').notNull().default(false),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
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
export type ListInput = z.infer<typeof ListInsertSchema>;
export type ListOutput = z.infer<typeof ListSelectSchema>;

export const userLists = pgTable(
  'user_lists',
  {
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
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
    index('user_lists_user_id_idx').on(table.userId),
  ],
);

export const UserListsInsertSchema = createInsertSchema(userLists);
export const UserListsSelectSchema = createSelectSchema(userLists);
export type UserListsInput = z.infer<typeof UserListsInsertSchema>;
export type UserListsOutput = z.infer<typeof UserListsSelectSchema>;

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
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
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
    index('list_invite_email_idx').on(table.invitedUserEmail),
  ],
);
export const ListInviteInsertSchema = createInsertSchema(listInvite);
export const ListInviteSelectSchema = createSelectSchema(listInvite);
export type ListInviteInput = z.infer<typeof ListInviteInsertSchema>;
export type ListInviteOutput = z.infer<typeof ListInviteSelectSchema>;
