import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const users = pgTable(
  'users',
  {
    // Primary key for foreign key relationships
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Legacy external auth integration. Optional during Better Auth cutover.
    supabaseId: text('supabase_id').unique(),
    primaryAuthSubjectId: uuid('primary_auth_subject_id'),

    // User profile data (synced from Supabase)
    email: text('email').notNull(),
    name: text('name'),
    image: text('image'),
    photoUrl: text('photo_url'), // Keep for backward compatibility

    // Admin status (can be overridden locally)
    isAdmin: boolean('isAdmin').default(false).notNull(),

    // Timestamps
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),

    // Optional fields (keep for backward compatibility)
    birthday: text('birthday'),
    emailVerified: timestamp('emailVerified', { precision: 3, mode: 'string' }),
  },
  (table) => [
    // Primary index for Supabase ID lookups
    index('supabase_id_idx').on(table.supabaseId),
    index('users_primary_auth_subject_id_idx').on(table.primaryAuthSubjectId),

    // Email index for lookups
    index('email_idx').on(table.email),

    // Unique constraint on email (for migration scenarios)
    uniqueIndex('User_email_key').using('btree', table.email.asc().nullsLast()),
  ],
);
export type User = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserSelect = User;

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: timestamp('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => [
    uniqueIndex('Account_provider_providerAccountId_key').using(
      'btree',
      table.provider.asc().nullsLast(),
      table.providerAccountId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'account_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);
export type Account = InferSelectModel<typeof account>;
export type AccountInsert = InferInsertModel<typeof account>;
export type AccountSelect = Account;

// Zod Validation Schemas
export const UserSchema = createInsertSchema(users);
export type UserSchemaType = typeof UserSchema;
