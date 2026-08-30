import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  createCareerProject,
  listCareerProjects,
  removeCareerProject,
  updateCareerProject,
} from '../../application/career.service';
import {
  careerProjectCreateSchema,
  careerProjectDeleteSchema,
  careerProjectUpdateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerProjectsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerProjects(userId));
  })
  .post('/create', zValidator('json', careerProjectCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerProject(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerProjectUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerProject(userId, id, data);
    if (!updated) throw new NotFoundError('Project not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerProjectDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const removed = await removeCareerProject(userId, c.req.valid('json').id);
    if (!removed) throw new NotFoundError('Project not found');
    return c.json({ removed });
  });
