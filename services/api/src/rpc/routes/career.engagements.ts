import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  createCareerEngagement,
  listCareerEngagements,
  removeCareerEngagement,
  updateCareerEngagement,
} from '../../application/career.service';
import {
  careerEngagementCreateSchema,
  careerEngagementDeleteSchema,
  careerEngagementUpdateSchema,
  careerEngagementsQuerySchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerEngagementsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', careerEngagementsQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { type, limit } = c.req.valid('query');
    const result = await listCareerEngagements(userId, { type, limit });
    return c.json(result);
  })
  .post('/create', zValidator('json', careerEngagementCreateSchema), async (c) => {
    const created = await createCareerEngagement(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerEngagementUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerEngagement(userId, id, data);
    if (!updated) throw new NotFoundError('Engagement not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerEngagementDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const removed = await removeCareerEngagement(userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Engagement not found');
    return c.json({ removed });
  });
