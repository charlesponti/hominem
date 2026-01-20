import { z } from 'zod';

export const PersonSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    fullName: z.string().describe('Name of the person'),
    role: z.string().describe('Role of the person in the context'),
  })
  .describe('people mentioned in the text');

export const PeopleSchema = z.array(PersonSchema);
export type People = z.infer<typeof PeopleSchema>;
