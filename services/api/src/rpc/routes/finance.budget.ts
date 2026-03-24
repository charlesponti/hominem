import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

export const budgetRoutes = new Hono<AppContext>();
