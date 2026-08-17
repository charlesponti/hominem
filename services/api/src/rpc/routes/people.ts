import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createPerson, searchPeople } from '../../application/people.service';
import {
  peopleSearchInputSchema,
  peopleSearchOutputSchema,
  personCreateSchema,
  personPickerSchema,
} from '../../schemas/people.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const peopleRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', peopleSearchInputSchema), async (c) => {
    const result = await searchPeople({
      ownerUserId: c.get('auth')!.userId,
      query: c.req.valid('query').query,
      limit: c.req.valid('query').limit,
    });
    return c.json(peopleSearchOutputSchema.parse(result));
  })
  .post('/', zValidator('json', personCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const person = await createPerson({
      ownerUserId: c.get('auth')!.userId,
      displayName: input.displayName,
      email: input.email,
    });
    return c.json(personPickerSchema.parse(person), 201);
  });
