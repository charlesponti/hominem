import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const userSession = pgTable(
  'user_session',
  {
    id: text('id').primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }).notNull(),
    token: text('token').notNull(),
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('user_session_token_uidx').on(table.token),
    index('user_session_user_idx').on(table.user_id),
  ],
);

export const userAccount = pgTable(
  'user_account',
  {
    id: text('id').primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { precision: 3, mode: 'string' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { precision: 3, mode: 'string' }),
    scope: text('scope'),
    password: text('password'),
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('user_account_user_idx').on(table.user_id),
    uniqueIndex('user_account_provider_account_uidx').on(table.providerId, table.accountId),
  ],
);

export const userVerification = pgTable(
  'user_verification',
  {
    id: text('id').primaryKey().notNull(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }).notNull(),
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [index('user_verification_identifier_idx').on(table.identifier)],
);

export const userPasskey = pgTable(
  'user_passkey',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    aaguid: text('aaguid'),
  },
  (table) => [
    index('user_passkey_user_idx').on(table.user_id),
    uniqueIndex('user_passkey_credential_uidx').on(table.credentialID),
  ],
);

export const userApiKey = pgTable(
  'user_api_key',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at', { precision: 3, mode: 'string' }),
    enabled: boolean('enabled').default(true).notNull(),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true).notNull(),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count').default(0).notNull(),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request', { precision: 3, mode: 'string' }),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }),
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => [
    index('user_api_key_key_idx').on(table.key),
    index('user_api_key_user_idx').on(table.user_id),
  ],
);

export const userDeviceCode = pgTable(
  'user_device_code',
  {
    id: text('id').primaryKey().notNull(),
    deviceCode: text('device_code').notNull(),
    userCode: text('user_code').notNull(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }).notNull(),
    status: text('status').notNull(),
    lastPolledAt: timestamp('last_polled_at', { precision: 3, mode: 'string' }),
    pollingInterval: integer('polling_interval'),
    clientId: text('client_id'),
    scope: text('scope'),
  },
  (table) => [
    uniqueIndex('user_device_code_device_uidx').on(table.deviceCode),
    uniqueIndex('user_device_code_user_uidx').on(table.userCode),
    index('user_device_code_user_idx').on(table.user_id),
  ],
);

export type UserSession = InferSelectModel<typeof userSession>;
export type UserSessionInsert = InferInsertModel<typeof userSession>;
export type UserAccount = InferSelectModel<typeof userAccount>;
export type UserAccountInsert = InferInsertModel<typeof userAccount>;
export type UserVerification = InferSelectModel<typeof userVerification>;
export type UserVerificationInsert = InferInsertModel<typeof userVerification>;
export type UserPasskey = InferSelectModel<typeof userPasskey>;
export type UserPasskeyInsert = InferInsertModel<typeof userPasskey>;
export type UserApiKey = InferSelectModel<typeof userApiKey>;
export type UserApiKeyInsert = InferInsertModel<typeof userApiKey>;
export type UserDeviceCode = InferSelectModel<typeof userDeviceCode>;
export type UserDeviceCodeInsert = InferInsertModel<typeof userDeviceCode>;

// Legacy type exports for backward compatibility (map to new table exports)
export type BetterAuthUser = never; // Removed - use users.User instead
export type BetterAuthSession = UserSession;
export type BetterAuthSessionInsert = UserSessionInsert;
export type BetterAuthAccount = UserAccount;
export type BetterAuthAccountInsert = UserAccountInsert;
export type BetterAuthVerification = UserVerification;
export type BetterAuthVerificationInsert = UserVerificationInsert;
export type BetterAuthPasskey = UserPasskey;
export type BetterAuthPasskeyInsert = UserPasskeyInsert;
export type BetterAuthApiKey = UserApiKey;
export type BetterAuthApiKeyInsert = UserApiKeyInsert;
export type BetterAuthDeviceCode = UserDeviceCode;
export type BetterAuthDeviceCodeInsert = UserDeviceCodeInsert;
