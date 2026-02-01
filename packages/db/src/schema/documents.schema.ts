import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Changed from array to object for multiple indexes if needed in future
    userIdx: index('doc_user_id_idx').on(table.userId),
    typeIdx: index('doc_type_idx').on(table.type), // Added index on document type
  }),
);

export type Document = InferSelectModel<typeof documents>;
export type DocumentInsert = InferInsertModel<typeof documents>;
export type DocumentSelect = Document;
