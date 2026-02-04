/**
 * Computed Document Types
 *
 * This file contains all derived types computed from the Document schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from documents.schema.ts
 */

import type {
  Document,
  DocumentInsert,
  DocumentSelect,
  DocumentInsertSchemaType,
  DocumentSelectSchemaType,
} from './documents.schema';

export type {
  Document,
  DocumentInsert,
  DocumentSelect,
  DocumentInsertSchemaType,
  DocumentSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type DocumentOutput = Document;
export type DocumentInput = DocumentInsert;
