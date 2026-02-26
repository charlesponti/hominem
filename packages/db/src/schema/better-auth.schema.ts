import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const betterAuthUser = pgTable(
  'better_auth_user',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('better_auth_user_email_uidx').on(table.email)]
)

export const betterAuthSession = pgTable(
  'better_auth_session',
  {
    id: text('id').primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('better_auth_session_token_uidx').on(table.token), index('better_auth_session_user_idx').on(table.userId)]
)

export const betterAuthAccount = pgTable(
  'better_auth_account',
  {
    id: text('id').primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('better_auth_account_user_idx').on(table.userId),
    uniqueIndex('better_auth_account_provider_account_uidx').on(table.providerId, table.accountId),
  ]
)

export const betterAuthVerification = pgTable(
  'better_auth_verification',
  {
    id: text('id').primaryKey().notNull(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('better_auth_verification_identifier_idx').on(table.identifier)]
)

export const betterAuthPasskey = pgTable(
  'better_auth_passkey',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    aaguid: text('aaguid'),
  },
  (table) => [
    index('better_auth_passkey_user_idx').on(table.userId),
    uniqueIndex('better_auth_passkey_credential_uidx').on(table.credentialID),
  ]
)

export const betterAuthApiKey = pgTable(
  'better_auth_api_key',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at', { mode: 'date' }),
    enabled: boolean('enabled').default(true).notNull(),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true).notNull(),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count').default(0).notNull(),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => [index('better_auth_api_key_key_idx').on(table.key), index('better_auth_api_key_user_idx').on(table.userId)]
)

export const betterAuthDeviceCode = pgTable(
  'better_auth_device_code',
  {
    id: text('id').primaryKey().notNull(),
    deviceCode: text('device_code').notNull(),
    userCode: text('user_code').notNull(),
    userId: text('user_id'),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    status: text('status').notNull(),
    lastPolledAt: timestamp('last_polled_at', { mode: 'date' }),
    pollingInterval: integer('polling_interval'),
    clientId: text('client_id'),
    scope: text('scope'),
  },
  (table) => [
    uniqueIndex('better_auth_device_code_device_uidx').on(table.deviceCode),
    uniqueIndex('better_auth_device_code_user_uidx').on(table.userCode),
    index('better_auth_device_code_user_idx').on(table.userId),
  ]
)

export type BetterAuthUser = InferSelectModel<typeof betterAuthUser>
export type BetterAuthUserInsert = InferInsertModel<typeof betterAuthUser>
export type BetterAuthSession = InferSelectModel<typeof betterAuthSession>
export type BetterAuthSessionInsert = InferInsertModel<typeof betterAuthSession>
export type BetterAuthAccount = InferSelectModel<typeof betterAuthAccount>
export type BetterAuthAccountInsert = InferInsertModel<typeof betterAuthAccount>
export type BetterAuthVerification = InferSelectModel<typeof betterAuthVerification>
export type BetterAuthVerificationInsert = InferInsertModel<typeof betterAuthVerification>
export type BetterAuthPasskey = InferSelectModel<typeof betterAuthPasskey>
export type BetterAuthPasskeyInsert = InferInsertModel<typeof betterAuthPasskey>
export type BetterAuthApiKey = InferSelectModel<typeof betterAuthApiKey>
export type BetterAuthApiKeyInsert = InferInsertModel<typeof betterAuthApiKey>
export type BetterAuthDeviceCode = InferSelectModel<typeof betterAuthDeviceCode>
export type BetterAuthDeviceCodeInsert = InferInsertModel<typeof betterAuthDeviceCode>
