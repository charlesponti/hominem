import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  addCareerWishlistCompany,
  listCareerWishlistCompanies,
  removeCareerWishlistCompany,
  updateCareerWishlistCompany,
} from '../../application/career.service';
import {
  careerWishlistCompaniesQuerySchema,
  careerWishlistCompanyCreateSchema,
} from '../../schemas/career.schema';
import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const careerWishlistRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', careerWishlistCompaniesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await listCareerWishlistCompanies(userId, c.req.valid('query').limit));
  })
  .post('/', zValidator('json', careerWishlistCompanyCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(
      { company: await addCareerWishlistCompany(userId, c.req.valid('json').company) },
      201,
    );
  })
  .patch('/:id', zValidator('json', careerWishlistCompanyCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const company = await updateCareerWishlistCompany(
      userId,
      c.req.param('id'),
      c.req.valid('json').company,
    );
    if (!company) throw new NotFoundError('Wishlist company not found');
    return c.json({ company });
  })
  .delete('/:id', async (c) => {
    const userId = c.get('auth')!.userId;
    const removed = await removeCareerWishlistCompany(userId, c.req.param('id'));
    if (!removed) throw new NotFoundError('Wishlist company not found');
    return c.json({ removed });
  });
