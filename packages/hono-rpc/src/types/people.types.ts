import { z } from 'zod';

import type { EmptyInput } from './utils';

import { peopleCreateSchema } from '../routes/people';

// Manually define types since FromSchema can't infer them
export type Person = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PeopleListOutput = Person[];
export type PeopleCreateOutput = Person;

export type PeopleListInput = EmptyInput;
export type PeopleCreateInput = z.infer<typeof peopleCreateSchema>;
