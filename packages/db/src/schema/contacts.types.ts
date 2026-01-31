/**
 * Computed Contact Types
 *
 * This file contains all derived types computed from the Contact schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from contacts.schema.ts
 */

import type { Contact, ContactInsert, ContactSelect } from './contacts.schema';

export type { Contact, ContactInsert, ContactSelect };

// Legacy aliases for backward compatibility
export type ContactOutput = Contact;
export type ContactInput = ContactInsert;
