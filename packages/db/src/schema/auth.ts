import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core'

export const authSubjects = pgTable('auth_subjects', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  provider: text().notNull(),
  providerSubject: text('provider_subject').notNull(),
  isPrimary: boolean('is_primary').default(false),
  linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  unlinkedAt: timestamp('unlinked_at', { withTimezone: true, mode: 'string' }),
})

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
