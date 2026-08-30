import { Hono } from 'hono';

import { getCareerProfile } from '../../application/career.service';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerProfileRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const profile = await getCareerProfile(userId);
    return c.json({ profile });
  });
