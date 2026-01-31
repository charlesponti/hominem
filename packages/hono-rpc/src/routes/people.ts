import {
  createPerson,
  getPeople,
  updatePerson,
  deletePerson,
  type PersonInput,
  type ContactSelect,
  NotFoundError,
  ValidationError,
  InternalError,
} from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  peopleCreateSchema,
  peopleUpdateSchema,
  type Person,
  type PeopleListOutput,
  type PeopleCreateOutput,
  type PeopleUpdateOutput,
  type PeopleDeleteOutput,
} from '../types/people.types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Date fields to ISO strings for JSON serialization
 */
function serializePerson(person: ContactSelect): Person {
  return {
    ...person,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

// ============================================================================
// Routes
// ============================================================================

export const peopleRoutes = new Hono<AppContext>()
  // ListOutput all people
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    const people = await getPeople({ userId });
    const result = people.map(serializePerson);
    return c.json<PeopleListOutput>(result, 200);
  })

  // Create person
  .post('/create', authMiddleware, zValidator('json', peopleCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const personInput: PersonInput = {
      userId: userId,
      ...(input.firstName && { firstName: input.firstName }),
      ...(input.lastName && { lastName: input.lastName }),
      ...(input.email && { email: input.email }),
      ...(input.phone && { phone: input.phone }),
    };

    const newPerson = await createPerson(personInput);
    const result = serializePerson(newPerson);
    return c.json<PeopleCreateOutput>(result, 201);
  })

  // Update person
  .post('/:id/update', authMiddleware, zValidator('json', peopleUpdateSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const personInput: PersonInput = {
      userId: userId,
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
    };

    const updatedPerson = await updatePerson(id, personInput);

    if (!updatedPerson) {
      throw new NotFoundError('Person not found');
    }

    const result = serializePerson(updatedPerson);
    return c.json<PeopleUpdateOutput>(result, 200);
  })

  // Delete person
  .post('/:id/delete', authMiddleware, async (c) => {
    const id = c.req.param('id');

    const result = await deletePerson(id);

    if (!result) {
      throw new NotFoundError('Person not found');
    }

    return c.json<PeopleDeleteOutput>({ success: true }, 200);
  });
