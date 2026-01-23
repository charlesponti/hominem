import { createPerson, getPeople, type PersonInput } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type { PeopleListOutput, PeopleCreateOutput, Person } from '../types/people.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Date fields to ISO strings for JSON serialization
 */
function serializePerson(person: any): Person {
  return {
    ...person,
    createdAt: person.createdAt instanceof Date ? person.createdAt.toISOString() : person.createdAt,
    updatedAt: person.updatedAt instanceof Date ? person.updatedAt.toISOString() : person.updatedAt,
  };
}

/**
 * People Routes
 *
 * Handles people/contacts operations
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const peopleCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export const peopleRoutes = new Hono<AppContext>()
  // List all people
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const people = await getPeople({ userId });

      const result: PeopleListOutput = people.map(serializePerson);
      return c.json(result);
    } catch (error) {
      console.error('[people.list]', error);
      return c.json({ error: 'Failed to fetch people' }, 500);
    }
  })

  // Create person
  .post('/create', authMiddleware, zValidator('json', peopleCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const personInput: PersonInput = {
        userId: userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      };

      const newPerson = await createPerson(personInput);

      const result: PeopleCreateOutput = serializePerson(newPerson);
      return c.json(result);
    } catch (error) {
      console.error('[people.create]', error);
      return c.json({ error: 'Failed to create person' }, 500);
    }
  });
