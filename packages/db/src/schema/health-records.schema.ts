import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// Enum for types of health records
export const healthRecordType = pgEnum('HealthRecordType', [
  'ACTIVITY',
  'MEASUREMENT',
  'VITALS',
  'SLEEP',
  'NUTRITION',
  'MEDICATION',
  'SYMPTOM',
  'PROCEDURE',
]);

// Enum for measurement units
export const healthMeasurementUnit = pgEnum('HealthMeasurementUnit', [
  'MINUTES',
  'HOURS',
  'CALORIES',
  'STEPS',
  'KILOMETERS',
  'MILES',
  'KG',
  'LBS',
  'CM',
  'INCHES',
  'BPM',
  'MMHG',
  'MG_DL',
  'CELSIUS',
  'FAHRENHEIT',
  'GRAMS',
  'MILLILITERS',
  'PERCENTAGE',
]);

export const healthRecord = pgTable(
  'health_record',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Record classification
    record_type: healthRecordType('record_type').notNull(),

    // Activity-specific fields
    activity_type: text('activity_type'), // e.g., 'WALKING', 'RUNNING', 'CYCLING'
    duration_minutes: integer('duration_minutes'),
    calories_burned: integer('calories_burned'),

    // Measurement-specific fields
    metric_type: text('metric_type'), // e.g., 'WEIGHT', 'HEIGHT', 'BLOOD_PRESSURE'
    value: numeric('value', { precision: 10, scale: 2 }),
    unit: healthMeasurementUnit('unit'),

    // General fields
    notes: text('notes'),
    platform: text('platform'), // e.g., 'APPLE_HEALTH', 'GOOGLE_FIT', 'MANUAL'

    // When the measurement was taken (vs when it was recorded)
    recorded_at: timestamp('recorded_at', { precision: 3, mode: 'string' }).notNull(),

    // Timestamps
    created_at: timestamp('created_at', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // User and time queries
    index('health_record_user_id_idx').on(table.user_id),
    index('health_record_recorded_at_idx').on(table.recorded_at),

    // Type-specific queries
    index('health_record_user_type_idx').on(table.user_id, table.record_type),
    index('health_record_user_metric_idx').on(table.user_id, table.metric_type),

    // Time-series queries
    index('health_record_user_recorded_idx').on(table.user_id, table.recorded_at),
  ],
);

export type HealthRecord = InferSelectModel<typeof healthRecord>;
export type HealthRecordInsert = InferInsertModel<typeof healthRecord>;
export type HealthRecordSelect = HealthRecord;
