import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const tokenType = pgEnum('TokenType', ['EMAIL', 'API']);

export const verificationToken = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { precision: 3, mode: 'string' }).notNull(),
  },
  (table) => [
    uniqueIndex('VerificationToken_identifier_token_key').using(
      'btree',
      table.identifier.asc().nullsLast(),
      table.token.asc().nullsLast(),
    ),
    uniqueIndex('VerificationToken_token_key').using('btree', table.token.asc().nullsLast()),
  ],
);

export const token = pgTable(
  'token',
  {
    id: serial('id').primaryKey().notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    type: tokenType('type').notNull(),
    emailToken: text('emailToken'),
    valid: boolean('valid').default(true).notNull(),
    expiration: timestamp('expiration', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    userId: uuid('userId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
  },
  (table) => [
    uniqueIndex('Token_accessToken_key').using('btree', table.accessToken.asc().nullsLast()),
    uniqueIndex('Token_emailToken_key').using('btree', table.emailToken.asc().nullsLast()),
    uniqueIndex('Token_refreshToken_key').using('btree', table.refreshToken.asc().nullsLast()),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'token_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().notNull(),
    sessionToken: text('sessionToken').notNull(),
    userId: uuid('userId').notNull(),
    expires: timestamp('expires', { precision: 3, mode: 'string' }).notNull(),
  },
  (table) => [
    uniqueIndex('session_sessionToken_key').using('btree', table.sessionToken.asc().nullsLast()),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'session_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export type VerificationToken = InferSelectModel<typeof verificationToken>;
export type VerificationTokenInsert = InferInsertModel<typeof verificationToken>;

export type Token = InferSelectModel<typeof token>;
export type TokenInsert = InferInsertModel<typeof token>;

export type Session = InferSelectModel<typeof session>;
export type SessionInsert = InferInsertModel<typeof session>;
