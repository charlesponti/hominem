import { z } from 'zod';
import type { EmptyInput, JsonSerialized } from './utils';

// ============================================================================
// Data Types
// ============================================================================

/**
 * Person represents a contact from the database
 * Uses JsonSerialized to handle Date serialization automatically
 */
export type Person = JsonSerialized<{
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

// ============================================================================
// LIST PEOPLE
// ============================================================================

export type PeopleListInput = EmptyInput;
export type PeopleListOutput = Person[];

// ============================================================================
// CREATE PERSON
// ============================================================================

export type PeopleCreateInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export const peopleCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export type PeopleCreateOutput = Person;

// ============================================================================
// UPDATE PERSON
// ============================================================================

export type PeopleUpdateInput = {
  id: string;
  json: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

export const peopleUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export type PeopleUpdateOutput = Person;

// ============================================================================
// DELETE PERSON
// ============================================================================

export type PeopleDeleteInput = {
  id: string;
};

export type PeopleDeleteOutput = { success: boolean };
