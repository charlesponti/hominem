import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const documentTypeEnum = pgEnum('document_type', [
  // Created pgEnum for DocumentType
  'resume',
  'coverLetter',
  'sample',
  'other',
]);

export enum DocumentType {
  resume = 'resume',
  coverLetter = 'coverLetter',
  sample = 'sample',
  other = 'other',
}

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    content: text('content').notNull(), // Consider if storing large content here is optimal vs. only using URL for external storage.
    description: text('description'),
    url: text('url'), // URL to the document if stored externally (e.g., S3)
    type: documentTypeEnum('type').notNull(), // Type of the document, using pgEnum
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Foreign key to the user who owns this document
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    // Changed from array to object for multiple indexes if needed in future
    userIdx: index('doc_user_id_idx').on(table.userId),
    typeIdx: index('doc_type_idx').on(table.type), // Added index on document type
  }),
);

export const DocumentInsertSchema = createInsertSchema(documents);
export const DocumentSelectSchema = createSelectSchema(documents);
export type DocumentInput = z.infer<typeof DocumentInsertSchema>;
export type DocumentOutput = z.infer<typeof DocumentSelectSchema>;
