/**
 * Computed Vector Document Types
 *
 * This file contains all derived types computed from the Vector Document schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from vector-documents.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { vectorDocuments } from './vector-documents.schema'

// Inferred types from Drizzle schema
export type VectorDocument = InferSelectModel<typeof vectorDocuments>
export type VectorDocumentInsert = InferInsertModel<typeof vectorDocuments>

// Legacy aliases for backward compatibility
export type VectorDocumentOutput = VectorDocument
export type VectorDocumentInput = VectorDocumentInsert
export type VectorDocumentSelect = VectorDocument


