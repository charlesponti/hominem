import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

export const economyRoutes = new Hono<AppContext>();
