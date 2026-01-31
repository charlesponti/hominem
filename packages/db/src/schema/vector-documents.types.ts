/**
 * Computed Vector Document Types
 *
 * This file contains all derived types computed from the Vector Document schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from vector-documents.schema.ts
 */

import type {
  VectorDocument,
  VectorDocumentInsert,
  VectorDocumentSelect,
  NewVectorDocument,
} from './vector-documents.schema';

export type { VectorDocument, VectorDocumentInsert, VectorDocumentSelect, NewVectorDocument };

// Legacy aliases for backward compatibility
export type VectorDocumentOutput = VectorDocument;
export type VectorDocumentInput = VectorDocumentInsert;
