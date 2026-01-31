/**
 * Computed Document Types
 *
 * This file contains all derived types computed from Document schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from documents.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { documents, DocumentType } from './documents.schema'

// Inferred types from Drizzle schema
export type Document = InferSelectModel<typeof documents>
export type DocumentInsert = InferInsertModel<typeof documents>

// Legacy aliases for backward compatibility
export type DocumentSelect = Document

export type DocumentOutput = Document
export type DocumentInput = DocumentInsert

// Re-export tables and enums
export { documents, DocumentType } from './documents.schema'
