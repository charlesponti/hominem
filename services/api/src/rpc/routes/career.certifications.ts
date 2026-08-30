import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  createCareerCertification,
  listCareerCertifications,
  removeCareerCertification,
  updateCareerCertification,
} from '../../application/career.service';
import {
  careerCertificationCreateSchema,
  careerCertificationDeleteSchema,
  careerCertificationUpdateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerCertificationsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerCertifications(userId));
  })
  .post('/create', zValidator('json', careerCertificationCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerCertification(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerCertificationUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerCertification(userId, id, data);
    if (!updated) throw new NotFoundError('Certification not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerCertificationDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await removeCareerCertification(userId, c.req.valid('json').id);
    return c.json({ success: true });
  });
