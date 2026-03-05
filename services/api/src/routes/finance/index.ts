import { Hono } from 'hono';

import { financeImportRoutes } from './finance.import';
import { financeTagsRoutes } from './finance.tags';

export const financeRoutes = new Hono();

financeRoutes.route('/import', financeImportRoutes);
financeRoutes.route('/tags', financeTagsRoutes);
