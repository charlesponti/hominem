/**
 * Computed Contact Types
 *
 * This file contains all derived types computed from Contact schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from contacts.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { contacts } from './contacts.schema'

// Inferred types from Drizzle schema
export type Contact = InferSelectModel<typeof contacts>
export type ContactInsert = InferInsertModel<typeof contacts>

// Legacy aliases for backward compatibility
export type ContactSelect = Contact

export type ContactOutput = Contact
export type ContactInput = ContactInsert

// Re-export tables for convenience
export { contacts } from './contacts.schema'
