import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './users.schema'

export const authProviderEnum = pgEnum('auth_provider', ['apple', 'google', 'passkey'])
export const authDeviceCodeStatusEnum = pgEnum('auth_device_code_status', [
  'pending',
  'approved',
  'denied',
  'expired',
])

export const authSubjects = pgTable(
  'auth_subjects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    linkedAt: timestamp('linked_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    unlinkedAt: timestamp('unlinked_at', { precision: 3, mode: 'string' }),
    isPrimary: boolean('is_primary').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('auth_subject_provider_subject_uidx').on(table.provider, table.providerSubject),
    index('auth_subject_user_idx').on(table.userId),
  ]
)

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionState: text('session_state').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { precision: 3, mode: 'string' }),
    acr: text('acr'),
    amr: text('amr').array(),
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),
  },
  (table) => [index('auth_session_user_idx').on(table.userId), index('auth_session_state_idx').on(table.sessionState)]
)

export const authRefreshTokens = pgTable(
  'auth_refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    parentId: uuid('parent_id'),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { precision: 3, mode: 'string' }),
    revokedAt: timestamp('revoked_at', { precision: 3, mode: 'string' }),
  },
  (table) => [
    index('auth_refresh_family_idx').on(table.familyId),
    index('auth_refresh_hash_idx').on(table.tokenHash),
  ]
)

export const authPasskeys = pgTable(
  'auth_passkeys',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    signCount: integer('sign_count').default(0).notNull(),
    transports: jsonb('transports').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { precision: 3, mode: 'string' }),
  },
  (table) => [uniqueIndex('auth_passkey_credential_uidx').on(table.credentialId), index('auth_passkey_user_idx').on(table.userId)]
)

export const authDeviceCodes = pgTable(
  'auth_device_codes',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    deviceCodeHash: text('device_code_hash').notNull(),
    userCode: text('user_code').notNull(),
    clientId: text('client_id').notNull(),
    scope: text('scope'),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }).notNull(),
    intervalSec: integer('interval_sec').default(5).notNull(),
    status: authDeviceCodeStatusEnum('status').default('pending').notNull(),
    subjectId: uuid('subject_id').references(() => authSubjects.id, { onDelete: 'set null' }),
  },
  (table) => [
    uniqueIndex('auth_device_code_hash_uidx').on(table.deviceCodeHash),
    uniqueIndex('auth_device_user_code_uidx').on(table.userCode),
  ]
)

export type AuthSubject = InferSelectModel<typeof authSubjects>
export type AuthSubjectInsert = InferInsertModel<typeof authSubjects>
export type AuthSession = InferSelectModel<typeof authSessions>
export type AuthSessionInsert = InferInsertModel<typeof authSessions>
export type AuthRefreshToken = InferSelectModel<typeof authRefreshTokens>
export type AuthRefreshTokenInsert = InferInsertModel<typeof authRefreshTokens>
export type AuthPasskey = InferSelectModel<typeof authPasskeys>
export type AuthPasskeyInsert = InferInsertModel<typeof authPasskeys>
export type AuthDeviceCode = InferSelectModel<typeof authDeviceCodes>
export type AuthDeviceCodeInsert = InferInsertModel<typeof authDeviceCodes>
