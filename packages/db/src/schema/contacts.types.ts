/**
 * Computed Contact Types
 *
 * This file contains all derived types computed from Contact schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from contacts.schema.ts
 */

import type { Contact, ContactInsert } from './contacts.schema';

export type ContactOutput = Contact;
export type ContactInput = ContactInsert;

// Legacy aliases
export type ContactSelect = Contact;

// ============================================
// RE-EXPORTS (drizzle helpers)
// ============================================

export { contacts } from './contacts.schema';
