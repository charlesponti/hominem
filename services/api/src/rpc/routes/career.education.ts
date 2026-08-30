import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  createCareerEducation,
  listCareerEducation,
  removeCareerEducation,
  updateCareerEducation,
} from '../../application/career.service';
import {
  careerEducationCreateSchema,
  careerEducationDeleteSchema,
  careerEducationUpdateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerEducationRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const result = await listCareerEducation(userId, limit);
    return c.json(result);
  })
  .post('/create', zValidator('json', careerEducationCreateSchema), async (c) => {
    const created = await createCareerEducation(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerEducationUpdateSchema), async (c) => {
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerEducation(c.get('auth')!.userId, id, data);
    if (!updated) throw new NotFoundError('Education not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerEducationDeleteSchema), async (c) => {
    const removed = await removeCareerEducation(c.get('auth')!.userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Education not found');
    return c.json({ removed });
  });
