import { createPerson, getPeople, type PersonInput } from '@hominem/services';
import { error, isServiceError, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Date fields to ISO strings for JSON serialization
 */
function serializePerson(person: any) {
  return {
    ...person,
    createdAt: person.createdAt instanceof Date ? person.createdAt.toISOString() : person.createdAt,
    updatedAt: person.updatedAt instanceof Date ? person.updatedAt.toISOString() : person.updatedAt,
  };
}

/**
 * People Routes
 *
 * Handles people/contacts operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const peopleCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
});

// Export schemas for type derivation
export { peopleCreateSchema };

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
      return c.json(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[people.list] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch people'), 500);
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
      return c.json(success(result), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[people.create] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create person'), 500);
    }
  });
