import { z } from 'zod';
import type { ApiResult, ContactSelect } from '@hominem/services';
import type { EmptyInput, JsonSerialized } from './utils';

// ============================================================================
// Data Types
// ============================================================================

export type Person = JsonSerialized<ContactSelect>;

// ============================================================================
// LIST PEOPLE
// ============================================================================

export type PeopleListInput = EmptyInput;
export type PeopleListOutput = ApiResult<Person[]>;

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

export type PeopleCreateOutput = ApiResult<Person>;

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

export type PeopleUpdateOutput = ApiResult<Person>;

// ============================================================================
// DELETE PERSON
// ============================================================================

export type PeopleDeleteInput = {
  id: string;
};

export type PeopleDeleteOutput = ApiResult<{ success: boolean }>;
