import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  createCareerSkill,
  listCareerSkills,
  removeCareerSkill,
  updateCareerSkill,
} from '../../application/career.service';
import {
  careerSkillCreateSchema,
  careerSkillDeleteSchema,
  careerSkillUpdateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerSkillsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerSkills(userId));
  })
  .post('/create', zValidator('json', careerSkillCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const created = await createCareerSkill(userId, c.req.valid('json'));
    return c.json(created, 201);
  })
  .post('/update', zValidator('json', careerSkillUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id, data } = c.req.valid('json');
    const updated = await updateCareerSkill(userId, id, data);
    if (!updated) throw new NotFoundError('Skill not found');
    return c.json(updated);
  })
  .post('/delete', zValidator('json', careerSkillDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    await removeCareerSkill(userId, c.req.valid('json').id);
    return c.json({ success: true });
  });
