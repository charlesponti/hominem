/**
 * Computed Vector Document Types
 *
 * This file contains all derived types computed from the Vector Document schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from vector-documents.schema.ts
 */

import type { VectorDocument, NewVectorDocument } from './vector-documents.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** VectorDocument as retrieved from database */
export type VectorDocumentOutput = VectorDocument;

/** NewVectorDocument for creating vector documents */
export type VectorDocumentInput = NewVectorDocument;

// Legacy aliases
export type VectorDocumentSelect = VectorDocument;
