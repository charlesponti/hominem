import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, index, unique } from 'drizzle-orm/pg-core'

export const authSubjects = pgTable(
  'auth_subjects',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    provider: text().notNull(),
    providerSubject: text('provider_subject').notNull(),
    isPrimary: boolean('is_primary').default(false),
    linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    unlinkedAt: timestamp('unlinked_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    unique('auth_subjects_provider_provider_subject_key').on(table.provider, table.providerSubject),
  ],
)

export const authSessions = pgTable('auth_sessions', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  sessionState: text('session_state').notNull(),
  acr: text(),
  amr: jsonb().$type<string[]>().default([]),
  ipHash: text('ip_hash'),
  userAgentHash: text('user_agent_hash'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
})

export const authRefreshTokens = pgTable('auth_refresh_tokens', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  sessionId: uuid('session_id').notNull(),
  familyId: uuid('family_id').notNull(),
  parentId: uuid('parent_id'),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const authUser = pgTable('users', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: text().notNull(),
  name: text(),
  image: text(),
  emailVerified: boolean('email_verified').notNull().default(false),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
})

export const userSession = pgTable(
  'user_session',
  {
    id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id').notNull(),
  },
  (table) => [index('user_session_user_id_idx').on(table.userId)],
)

export const userAccount = pgTable(
  'user_account',
  {
    id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'date' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('user_account_user_id_idx').on(table.userId)],
)

export const userVerification = pgTable(
  'user_verification',
  {
    id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('user_verification_identifier_idx').on(table.identifier)],
)

export const userPasskey = pgTable(
  'user_passkey',
  {
    id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: uuid('user_id').notNull(),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
    aaguid: text('aaguid'),
  },
  (table) => [
    index('user_passkey_user_id_idx').on(table.userId),
    index('user_passkey_credential_id_idx').on(table.credentialID),
  ],
)

export const userDeviceCode = pgTable(
  'user_device_code',
  {
    id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
    deviceCode: text('device_code').notNull(),
    userCode: text('user_code').notNull(),
    userId: uuid('user_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    status: text('status').notNull(),
    lastPolledAt: timestamp('last_polled_at', { withTimezone: true, mode: 'date' }),
    pollingInterval: integer('polling_interval'),
    clientId: text('client_id'),
    scope: text('scope'),
  },
  (table) => [
    index('user_device_code_user_code_idx').on(table.userCode),
    index('user_device_code_device_code_idx').on(table.deviceCode),
  ],
)

export const userJwks = pgTable('user_jwks', {
  id: text('id').default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
})
