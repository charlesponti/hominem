import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// Enum for log types
export const logType = pgEnum('LogType', [
  'AUDIT', // Data changes (old_values/new_values)
  'ACTIVITY', // User actions (domain/action)
  'SYSTEM', // System events
]);

/**
 * Unified logging table that consolidates:
 * - audit_log (tracking data changes)
 * - activity_log (tracking user actions)
 * - system events (operations, errors, etc.)
 *
 * Structure supports both audit trail (old/new values)
 * and activity tracking (action description)
 */
export const log = pgTable(
  'log',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Log classification
    log_type: logType('log_type').notNull(),

    // User who triggered the log
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Entity being logged (for audit and activity logs)
    entity_type: text('entity_type'), // e.g., 'user', 'task', 'contact', 'task_list'
    entity_id: uuid('entity_id'), // ID of the entity (e.g., user_id, task_id)

    // Action/operation description
    action: text('action').notNull(), // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'

    // For audit logs: old and new values
    old_values: jsonb('old_values'),
    new_values: jsonb('new_values'),

    // For activity logs: domain and description
    domain: text('domain'), // e.g., 'auth', 'finance', 'notes'
    description: text('description'),

    // Additional context
    metadata: jsonb('metadata'), // JSON for flexible additional data

    // Timestamp of when the action occurred
    created_at: timestamp('created_at', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // User activity queries
    index('log_user_id_idx').on(table.user_id),

    // Entity change tracking
    index('log_entity_type_entity_id_idx').on(table.entity_type, table.entity_id),

    // Time-based queries
    index('log_created_at_idx').on(table.created_at),

    // Combined queries
    index('log_user_action_idx').on(table.user_id, table.action),
    index('log_user_log_type_idx').on(table.user_id, table.log_type),

    // Domain filtering (for activity logs)
    index('log_domain_idx').on(table.domain),
  ],
);

export type Log = InferSelectModel<typeof log>;
export type LogInsert = InferInsertModel<typeof log>;
export type LogSelect = Log;
