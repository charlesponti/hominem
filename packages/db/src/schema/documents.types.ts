/**
 * Computed Document Types
 */

import type { Document, DocumentInsert } from './documents.schema';

export type DocumentOutput = Document;
export type DocumentInput = DocumentInsert;

export { documents, DocumentType } from './documents.schema';
