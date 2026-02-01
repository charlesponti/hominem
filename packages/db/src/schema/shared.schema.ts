import { text, uuid, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import * as z from 'zod';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Column helper functions to reduce type expansion in declarations
 * These functions use inline column definitions that get properly typed
 * by Drizzle's type inference, avoiding explicit generic re-declarations
 */

// Text columns
export const textColumn = (name: string) => text(name);
export const requiredTextColumn = (name: string) => text(name).notNull();
export const optionalTextColumn = (name: string) => text(name);
export const uniqueTextColumn = (name: string) => text(name).notNull().unique();

// UUID columns
export const uuidColumn = (name: string) => uuid(name).primaryKey().defaultRandom();
export const requiredUuidColumn = (name: string) => uuid(name).notNull();
export const optionalUuidColumn = (name: string) => uuid(name);
export const foreignKeyUuidColumn = (name: string) => uuid(name);

// Numeric columns
export const numericColumn = (name: string) => numeric(name);
export const requiredNumericColumn = (name: string) => numeric(name).notNull();
export const optionalNumericColumn = (name: string) => numeric(name);

// Boolean columns
export const booleanColumn = (name: string, defaultValue = false) =>
  boolean(name).default(defaultValue);

// Timestamp columns
export const createdAtColumn = () => timestamp('created_at').defaultNow().notNull();
export const updatedAtColumn = () => timestamp('updated_at').defaultNow().notNull();
export const optionalTimestampColumn = (name: string) => timestamp(name);
export const requiredTimestampColumn = (name: string) => timestamp(name).notNull();

// JSON columns
export const jsonColumn = (name: string) => jsonb(name).$type<Json>();
export const optionalJsonColumn = (name: string) => jsonb(name).$type<Json>();

/**
 * Shared content tag for categorization across all content types
 */
export const ContentTagSchema = z.object({
  value: z.string(),
});

export type ContentTag = z.infer<typeof ContentTagSchema>;

/**
 * Base content types that can be used across different schemas
 */
export const BaseContentTypeSchema = z.enum([
  'note', // Standard note
  'task', // Task with status tracking
  'timer', // Time-trackable task
  'journal', // Journal entry
  'document', // Longer form document
]);

export type BaseContentType = z.infer<typeof BaseContentTypeSchema>;

/**
 * Publishing-specific content types for internet-facing content
 */
export const PublishingContentTypeSchema = z.enum([
  'tweet', // Twitter/X posts
  'essay', // Long-form essays
  'blog_post', // Blog posts
  'social_post', // Generic social media post
]);

export type PublishingContentType = z.infer<typeof PublishingContentTypeSchema>;

/**
 * Union type for all content types
 */
export const AllContentTypeSchema = z.union([BaseContentTypeSchema, PublishingContentTypeSchema]);

export type AllContentType = z.infer<typeof AllContentTypeSchema>;

/**
 * Standardized location coordinates
 */
export const TransactionLocationSchema = z.object({
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude'),
});

export type TransactionLocation = z.infer<typeof TransactionLocationSchema>;
