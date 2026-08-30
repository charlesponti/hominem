import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { getCareerSocialLinks, saveCareerSocialLinks } from '../../application/career.service';
import { careerSocialLinksSaveSchema } from '../../schemas/career.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerSocialLinksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getCareerSocialLinks(userId));
  })
  .post('/save', zValidator('json', careerSocialLinksSaveSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const saved = await saveCareerSocialLinks(userId, c.req.valid('json'));
    return c.json(saved);
  });
