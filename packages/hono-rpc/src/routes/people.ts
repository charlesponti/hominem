import {
  createPerson,
  getPeople,
  updatePerson,
  deletePerson,
  type PersonInput,
  type ContactSelect,
} from '@hominem/services';
import { error, isServiceError, success } from '@hominem/services';
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
  // List all people
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const people = await getPeople({ userId });
      const result = people.map(serializePerson);
      return c.json<PeopleListOutput>(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PeopleListOutput>(
          error(err.code, err.message, err.details),
          err.statusCode as any,
        );
      }

      console.error('[people.list] unexpected error:', err);
      return c.json<PeopleListOutput>(error('INTERNAL_ERROR', 'Failed to fetch people'), 500);
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
      const result = serializePerson(newPerson);
      return c.json<PeopleCreateOutput>(success(result), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PeopleCreateOutput>(
          error(err.code, err.message, err.details),
          err.statusCode as any,
        );
      }

      console.error('[people.create] unexpected error:', err);
      return c.json<PeopleCreateOutput>(error('INTERNAL_ERROR', 'Failed to create person'), 500);
    }
  })

  // Update person
  .post('/:id/update', authMiddleware, zValidator('json', peopleUpdateSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const personInput: PersonInput = {
        userId: userId,
        ...input,
      };

      const updatedPerson = await updatePerson(id, personInput);

      if (!updatedPerson) {
        return c.json<PeopleUpdateOutput>(error('NOT_FOUND', 'Person not found'), 404);
      }

      const result = serializePerson(updatedPerson);
      return c.json<PeopleUpdateOutput>(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PeopleUpdateOutput>(
          error(err.code, err.message, err.details),
          err.statusCode as any,
        );
      }

      console.error('[people.update] unexpected error:', err);
      return c.json<PeopleUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update person'), 500);
    }
  })

  // Delete person
  .post('/:id/delete', authMiddleware, async (c) => {
    const id = c.req.param('id');

    try {
      const result = await deletePerson(id);

      if (!result) {
        return c.json<PeopleDeleteOutput>(error('NOT_FOUND', 'Person not found'), 404);
      }

      return c.json<PeopleDeleteOutput>(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PeopleDeleteOutput>(
          error(err.code, err.message, err.details),
          err.statusCode as any,
        );
      }

      console.error('[people.delete] unexpected error:', err);
      return c.json<PeopleDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete person'), 500);
    }
  });
