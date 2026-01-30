import { relations, sql } from 'drizzle-orm'
import {
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { item } from './items.schema'
import { flight } from './travel.schema'
import { users } from './users.schema'

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
  ]
)
export interface List {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ListInsert {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export type ListSelect = List;

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
  ]
)
export interface UserLists {
  createdAt: string;
  updatedAt: string;
  listId: string;
  userId: string;
}
export interface UserListsInsert {
  createdAt?: string;
  updatedAt?: string;
  listId: string;
  userId: string;
}
export type UserListsSelect = UserLists;

export const listInvite = pgTable(
  'list_invite',
  {
    accepted: boolean('accepted').default(false).notNull(),
    listId: uuid('listId').notNull(),
    invitedUserEmail: text('invitedUserEmail').notNull(),
    // Invites can be sent to users that are not registered, so the id can be null.
    invitedUserId: uuid('invitedUserId'),
    // The user who sent the invite.
    userId: uuid('userId').notNull(),
    acceptedAt: timestamp('acceptedAt', { precision: 3, mode: 'string' }),
    token: text('token').default(sql`gen_random_uuid()`).notNull(),
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
  ]
)
export interface ListInvite {
  accepted: boolean;
  listId: string;
  invitedUserEmail: string;
  invitedUserId: string | null;
  userId: string;
  acceptedAt: string | null;
  token: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListInviteInsert {
  accepted?: boolean;
  listId: string;
  invitedUserEmail: string;
  invitedUserId?: string | null;
  userId: string;
  acceptedAt?: string | null;
  token?: string;
  createdAt?: string;
  updatedAt?: string;
}
export type ListInviteSelect = ListInvite;

export const userListsRelations = relations(userLists, ({ one }) => ({
  list: one(list, {
    fields: [userLists.listId],
    references: [list.id],
  }),
  user: one(users, {
    fields: [userLists.userId],
    references: [users.id],
  }),
}))

export const listInviteRelations = relations(listInvite, ({ one }) => ({
  list: one(list, {
    fields: [listInvite.listId],
    references: [list.id],
  }),
  user_invitedUserId: one(users, {
    fields: [listInvite.invitedUserId],
    references: [users.id],
    relationName: 'listInvite_invitedUserId_user_id',
  }),
  user_userId: one(users, {
    fields: [listInvite.userId],
    references: [users.id],
    relationName: 'listInvite_userId_user_id',
  }),
}))

export const listRelations = relations(list, ({ one, many }) => ({
  flights: many(flight),
  user: one(users, {
    fields: [list.ownerId],
    references: [users.id],
  }),
  items: many(item),
  userLists: many(userLists),
  listInvites: many(listInvite),
}))
