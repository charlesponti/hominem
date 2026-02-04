import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { index, pgTable, text, uuid, vector } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const vectorDocuments = pgTable(
  'vector_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    metadata: text('metadata'), // JSON string for additional metadata
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI ada-002 embeddings are 1536 dimensions
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    source: text('source'), // Source identifier (file, url, etc.)
    sourceType: text('source_type'), // Type of source (file, manual, chat, etc.)
    title: text('title'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('vector_documents_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    // Regular indexes for filtering
    index('vector_documents_user_id_idx').on(table.userId),
    index('vector_documents_source_idx').on(table.source),
    index('vector_documents_source_type_idx').on(table.sourceType),
  ],
);

export const VectorDocumentInsertSchema = createInsertSchema(vectorDocuments);
export const VectorDocumentSelectSchema = createSelectSchema(vectorDocuments);
export type VectorDocumentInsertSchemaType = z.infer<typeof VectorDocumentInsertSchema>;
export type VectorDocumentSelectSchemaType = z.infer<typeof VectorDocumentSelectSchema>;
export type VectorDocument = VectorDocumentSelectSchemaType;
export type VectorDocumentInsert = VectorDocumentInsertSchemaType;
export type VectorDocumentSelect = VectorDocument;
export type NewVectorDocument = VectorDocumentInsert;
