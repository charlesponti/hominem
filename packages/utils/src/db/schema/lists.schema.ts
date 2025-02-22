import { relations } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
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
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'list_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

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

export const listInvite = pgTable(
  'list_invite',
  {
    accepted: boolean('accepted').default(false).notNull(),
    listId: uuid('listId').notNull(),
    invitedUserEmail: text('invitedUserEmail').notNull(),
    invitedUserId: uuid('invitedUserId'),
    userId: uuid('userId').notNull(),
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
  ]
)

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
    fields: [list.userId],
    references: [users.id],
  }),
  items: many(item),
  userLists: many(userLists),
  listInvites: many(listInvite),
}))
